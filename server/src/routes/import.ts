import { Router } from 'express';
import { prisma } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();

// ---- CSV parsing (handles quoted fields, embedded commas, escaped quotes) ----
function parseCsv(txt: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inq = false;
  const pushF = () => { row.push(field); field = ''; };
  const pushR = () => { rows.push(row); row = []; };
  while (i < txt.length) {
    const c = txt[i];
    if (inq) {
      if (c === '"') {
        if (txt[i + 1] === '"') { field += '"'; i += 2; continue; }
        inq = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inq = true; i++; continue; }
    if (c === ',') { pushF(); i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { pushF(); pushR(); i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { pushF(); pushR(); }
  return rows;
}

// Parse into objects keyed by header, dropping the header row and blank lines.
function parseRecords(csv: string): Record<string, string>[] {
  const rows = parseCsv(csv || '');
  if (!rows.length) return [];
  const hdr = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => (c || '').trim() !== ''))
    .map((r) => {
      const o: Record<string, string> = {};
      hdr.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
      return o;
    });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-06-29 10:37:37" -> "Jun 29, 2026". Falls back to the raw string.
function fmtDate(s: string): string {
  const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s || '';
  const [, y, mo, d] = m;
  return `${MONTHS[Number(mo) - 1]} ${Number(d)}, ${y}`;
}
function dateParts(s: string): { month: number; year: number } | null {
  const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

const REGION_FIX: Record<string, string> = { Cantebury: 'Canterbury', Malborough: 'Marlborough' };
function fixRegion(r: string): string { return REGION_FIX[r] || r || ''; }

// Strip protocol / www / path so we keep just the host, e.g. oranga.school.nz.
function cleanWebsite(w: string): string {
  if (!w) return '';
  return w.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').trim();
}

function businessTypeFor(bt: string, bt2: string, website: string, name: string): string {
  const n = (name || '').toLowerCase();
  if (/kura kaupapa/.test(n)) return 'Kura Kaupapa';
  if (/area school/.test(n)) return 'Area School';
  const isSchool = /school/i.test(bt) || /\.school\.nz|\.ac\.nz/i.test(website || '');
  if (isSchool) {
    const t = (bt2 || '').toLowerCase();
    if (t.includes('secondary')) return 'Secondary School';
    if (t.includes('intermediate')) return 'Intermediate';
    if (t.includes('pre')) return 'Preschool';
    return 'Primary School';
  }
  return 'Business';
}

const JOB_TYPE_FIX: Record<string, string> = {
  'Website': 'Website',
  'Website advertising': 'Website',
  'Newsletter': 'Newsletter',
  'Newsletter advertising': 'Newsletter ads',
  'Custom App': 'Custom App',
  'Chat Bot': 'Chat Bot',
  'Year Book': 'Year Book',
  'Alumni': 'Alumni',
  // Caddie service lines.
  'Google Ads': 'Google Ads',
  'IUBenda': 'IUBenda',
  'Hyper': 'Hyper',
  'SEO': 'SEO',
  'CleanTalk': 'CleanTalk',
  'Other job': 'Other job',
};
const STATUS_FIX: Record<string, string> = {
  'Complete': 'Complete',
  'Awaiting Brief': 'Awaiting Brief',
  'In Design': 'In Design',
  'In Development': 'In Progress',
};

// Look up a record's value by a header, ignoring case/spacing/punctuation
// (the schools directory uses headers like "Email^" and "Principal*").
function normalizeKeys(rec: Record<string, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k in rec) o[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = rec[k];
  return o;
}
// Map an NZ "School Type" to the Sales view's category buckets.
function saleCategory(t: string): string {
  const s = (t || '').toLowerCase();
  if (s.includes('intermediate')) return 'Intermediate';
  if (s.includes('secondary')) return 'Secondary';
  if (s.includes('composite') || s.includes('area')) return 'Composite / Area';
  if (s.includes('primary') || s.includes('contributing')) return 'Primary';
  return 'Specialist / Other';
}

// POST /api/import  { workspace, clientsCsv, contactsCsv, jobsCsv, salesCsv }
// Super-admin only. Only the data types you provide a CSV for are replaced;
// everything else in the workspace is left untouched.
router.post('/', requireRole('super_admin'), async (req, res, next) => {
  try {
    const ws = String(req.body?.workspace || 'schoolwebsites');
    if (ws !== 'schoolwebsites' && ws !== 'caddie') {
      return res.status(400).json({ error: 'Unknown workspace.' });
    }
    const now = dateParts(new Date().toISOString())!; // container clock; only used for the "this month" flag

    const clientRecs = parseRecords(req.body?.clientsCsv || '');
    const contactRecs = parseRecords(req.body?.contactsCsv || '');
    const jobRecs = parseRecords(req.body?.jobsCsv || '');
    const saleRecs = parseRecords(req.body?.salesCsv || '');

    if (!clientRecs.length && !jobRecs.length && !saleRecs.length) {
      return res.status(400).json({ error: 'No rows found — check the uploaded CSV files.' });
    }

    // ---- Map clients ----
    const clientData = clientRecs.map((r) => {
      const name = r['Business Name'] || '';
      const website = cleanWebsite(r['Website'] || '');
      return {
        name,
        contact: r['Contact Name'] || '—',
        type: r['Client/Lead/Trial'] || 'Client',
        region: fixRegion(r['Region'] || ''),
        roll: r['School Roll'] || '—',
        website,
        ws,
        businessType: businessTypeFor(r['Business Type'] || '', r['Business Types2'] || '', website, name),
        notes: r['Comment'] || '',
        lastContacted: null as string | null,
      };
    }).filter((c) => c.name);

    // ---- Map jobs (region backfilled from the matching client by name) ----
    const clientRegionByName = new Map<string, string>();
    for (const c of clientData) clientRegionByName.set(c.name.toLowerCase(), c.region);
    const jobData = jobRecs.map((r) => {
      const client = r['Client Name'] || '';
      const dp = dateParts(r['Sales Date'] || '');
      return {
        client,
        salesDate: fmtDate(r['Sales Date'] || ''),
        jobType: JOB_TYPE_FIX[r['Job Type'] || ''] || 'Other job',
        status: STATUS_FIX[r['Project Status'] || ''] || 'Complete',
        dev: Math.round(Number(r['Development Revenue']) || 0),
        host: Math.round(Number(r['Annual Hosting']) || 0),
        hostingMonth: r['Hosting Month'] || '—',
        region: clientRegionByName.get(client.toLowerCase()) || '',
        thisMonth: !!(dp && dp.month === now.month && dp.year === now.year),
        ws,
        // Present in the Caddie export, absent in the School Websites one.
        salesChannel: r['Sales Channel'] || '',
        referralPartner: r['Referral Partner'] || '',
      };
    });
    const jobsSkipped = jobData.filter((j) => !j.client).length;
    const jobsToInsert = jobData.filter((j) => j.client);

    // ---- Map sales / leads (e.g. the NZ schools directory) ----
    const saleData = saleRecs.map((r) => {
      const n = normalizeKeys(r);
      return {
        name: (n['schoolname'] || n['businessname'] || n['name'] || '').trim(),
        town: (n['postaladdresscity'] || n['town'] || n['city'] || '').trim(),
        category: saleCategory(n['schooltype'] || n['category'] || ''),
        region: fixRegion(n['region'] || ''),
        roll: Math.round(Number(n['totalschoolroll'] || n['schoolroll'] || n['roll']) || 0),
        principal: (n['principal'] || n['contactname'] || '—').trim() || '—',
        email: (n['email'] || '').trim(),
        stage: 'New',
        ws,
        phone: (n['telephone'] || n['phone'] || '').trim(),
        website: cleanWebsite(n['schoolwebsite'] || n['website'] || ''),
      };
    }).filter((s) => s.name);

    const didClients = clientData.length > 0;
    const didJobs = jobRecs.length > 0;
    const didSales = saleData.length > 0;

    // ---- Replace only the provided entities, in one transaction ----
    const result = await prisma.$transaction(async (tx) => {
      const out: Record<string, number> = {};

      if (didClients) {
        await tx.client.deleteMany({ where: { ws } }); // contacts cascade
        await tx.client.createMany({ data: clientData });
        out.clients = clientData.length;

        const created = await tx.client.findMany({ where: { ws }, select: { id: true, name: true } });
        const idByName = new Map<string, number>();
        for (const c of created) { const k = c.name.toLowerCase(); if (!idByName.has(k)) idByName.set(k, c.id); }

        let contactsInserted = 0, contactsSkipped = 0;
        const contactData: any[] = [];
        for (const r of contactRecs) {
          const clientId = idByName.get((r['Business Name'] || '').toLowerCase());
          if (!clientId) { contactsSkipped++; continue; }
          const name = `${r['First Name'] || ''} ${r['Last Name'] || ''}`.trim();
          if (!name && !(r['Email'] || '').trim()) { contactsSkipped++; continue; }
          contactData.push({ clientId, name: name || '—', title: r['Job Title'] || 'Contact', email: r['Email'] || '—', phone: r['Phone'] || '—' });
          contactsInserted++;
        }
        if (contactData.length) await tx.contact.createMany({ data: contactData });
        out.contactsInserted = contactsInserted;
        out.contactsSkipped = contactsSkipped;
      }

      if (didJobs) {
        await tx.job.deleteMany({ where: { ws } });
        if (jobsToInsert.length) await tx.job.createMany({ data: jobsToInsert });
        out.jobs = jobsToInsert.length;
        out.jobsSkipped = jobsSkipped;
        // Ensure referenced sales channels / referral partners exist (never removes).
        const channels = [...new Set(jobsToInsert.map((j) => j.salesChannel).filter(Boolean))];
        const partners = [...new Set(jobsToInsert.map((j) => j.referralPartner).filter(Boolean))];
        if (channels.length) await tx.salesChannel.createMany({ data: channels.map((name, i) => ({ name, order: 100 + i })), skipDuplicates: true });
        if (partners.length) await tx.referralPartner.createMany({ data: partners.map((name, i) => ({ name, order: 100 + i })), skipDuplicates: true });
      }

      if (didSales) {
        await tx.sale.deleteMany({ where: { ws } }); // notes/tasks cascade
        await tx.sale.createMany({ data: saleData.map((s) => ({ name: s.name, town: s.town, category: s.category, region: s.region, roll: s.roll, principal: s.principal, email: s.email, stage: s.stage, ws })) });
        out.sales = saleData.length;

        // Preserve phone / website (no Sale columns for them) as an initial note.
        const created = await tx.sale.findMany({ where: { ws }, select: { id: true, name: true } });
        const idByName = new Map<string, number>();
        for (const s of created) { const k = s.name.toLowerCase(); if (!idByName.has(k)) idByName.set(k, s.id); }
        const noteData: any[] = [];
        for (const s of saleData) {
          if (!s.phone && !s.website) continue;
          const saleId = idByName.get(s.name.toLowerCase());
          if (!saleId) continue;
          const bits = [s.phone ? `☎ ${s.phone}` : '', s.website ? `🔗 ${s.website}` : ''].filter(Boolean).join('  ·  ');
          noteData.push({ saleId, text: bits, ts: 'Imported' });
        }
        if (noteData.length) await tx.saleNote.createMany({ data: noteData });
      }

      return out;
    }, { timeout: 120000 });

    // Advance Postgres identity sequences past the rows we just inserted.
    const seqTables = [didClients && 'Client', didClients && 'Contact', didJobs && 'Job', didSales && 'Sale', didSales && 'SaleNote'].filter(Boolean) as string[];
    for (const table of seqTables) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"','id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`,
      );
    }

    res.json({ ok: true, workspace: ws, ...result });
  } catch (e) { next(e); }
});

export default router;
