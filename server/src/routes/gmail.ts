import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { requireAuth, requireRole, type SessionUser } from '../auth.js';
import {
  gcfg, isConfigured, authUrl, exchangeCode, encryptToken,
  isConnected, listForAddresses, getMessageFull, listSentRecipients, listInboxSenders,
  clearTokenCache, clearMailboxCache,
} from '../gmail.js';

const router = Router();
const WORKSPACES = ['schoolwebsites', 'caddie'];

function appUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  return `${proto}://${req.get('host')}`;
}
const redirectUri = (req: Request) => `${appUrl(req)}/api/gmail/callback`;

// ---- HMAC-signed OAuth state (CSRF + carries ws) ----
const stateSecret = () => process.env.JWT_SECRET || process.env.DATABASE_URL || 'schoolhub-dev';
function signState(obj: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify({ ...obj, t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyState(state: string): any | null {
  try {
    const [body, sig] = String(state || '').split('.');
    if (!body || !sig) return null;
    const expect = crypto.createHmac('sha256', stateSecret()).update(body).digest('base64url');
    const a = Buffer.from(sig), b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (Date.now() - obj.t > 10 * 60 * 1000) return null;
    return obj;
  } catch { return null; }
}

// Derive a likely contact address the way the UI does (firstname@domain).
function deriveEmail(contact: string, website: string): string {
  const dom = (website || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const first = contact && contact !== '—' ? contact.split(' ')[0] : '';
  if (first && dom) return `${first.toLowerCase().replace(/[^a-z]/g, '')}@${dom}`;
  return '';
}

// GET /api/gmail/status — per-workspace connection + config state (admin+).
router.get('/status', requireRole('admin'), async (_req, res, next) => {
  try {
    const accts = await prisma.gmailAccount.findMany();
    const byWs = new Map(accts.map((a) => [a.ws, a]));
    res.json(WORKSPACES.map((ws) => ({
      ws,
      configured: isConfigured(ws),
      connected: byWs.has(ws),
      email: byWs.get(ws)?.email || gcfg(ws).hint,
      connectedAt: byWs.get(ws)?.connectedAt || null,
    })));
  } catch (e) { next(e); }
});

// GET /api/gmail/connect?ws=caddie — kick off OAuth (super admin only).
router.get('/connect', requireRole('super_admin'), (req, res) => {
  const ws = String(req.query.ws || '');
  if (!WORKSPACES.includes(ws)) return res.status(400).send('Unknown workspace.');
  if (!isConfigured(ws)) return res.redirect(`${appUrl(req)}/?gmail=notconfigured`);
  const me: SessionUser = (req as any).user;
  const state = signState({ ws, uid: me.id });
  res.redirect(authUrl(ws, redirectUri(req), state));
});

// GET /api/gmail/callback — Google redirects here after consent.
router.get('/callback', async (req, res) => {
  const home = appUrl(req);
  try {
    if (req.query.error) return res.redirect(`${home}/?gmail=denied`);
    const st = verifyState(String(req.query.state || ''));
    if (!st) return res.redirect(`${home}/?gmail=badstate`);
    const ws = st.ws as string;
    const tokens = await exchangeCode(ws, String(req.query.code || ''), redirectUri(req));
    if (!tokens.refresh_token) return res.redirect(`${home}/?gmail=norefresh`);

    // Fetch the connected mailbox address with the fresh access token.
    let email = gcfg(ws).hint;
    try {
      const p = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: 'Bearer ' + tokens.access_token },
      });
      const pj: any = await p.json().catch(() => ({}));
      if (pj.emailAddress) email = pj.emailAddress;
    } catch {}

    const user = await prisma.user.findUnique({ where: { id: st.uid } });
    await prisma.gmailAccount.upsert({
      where: { ws },
      create: { ws, email, refreshToken: encryptToken(tokens.refresh_token), connectedBy: user?.email || '' },
      update: { email, refreshToken: encryptToken(tokens.refresh_token), connectedBy: user?.email || '', connectedAt: new Date() },
    });
    clearTokenCache(ws); clearMailboxCache(ws);
    res.redirect(`${home}/?gmail=connected&ws=${ws}`);
  } catch (e: any) {
    console.error('Gmail callback failed:', e?.message);
    res.redirect(`${home}/?gmail=error`);
  }
});

// POST /api/gmail/disconnect { ws } — remove stored token (super admin).
router.post('/disconnect', requireRole('super_admin'), async (req, res, next) => {
  try {
    const ws = String(req.body?.ws || '');
    if (!WORKSPACES.includes(ws)) return res.status(400).json({ error: 'Unknown workspace.' });
    await prisma.gmailAccount.deleteMany({ where: { ws } });
    clearTokenCache(ws); clearMailboxCache(ws);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/gmail/threads?kind=client|sale&refId=123 — real Gmail history.
router.get('/threads', requireAuth, async (req, res, next) => {
  try {
    const kind = req.query.kind === 'sale' ? 'sale' : 'client';
    const refId = Number(req.query.refId);
    let ws = 'schoolwebsites';
    const addresses: string[] = [];

    if (kind === 'client') {
      const c = await prisma.client.findUnique({ where: { id: refId }, include: { contacts: true } });
      if (!c) return res.status(404).json({ error: 'Client not found.' });
      ws = c.ws;
      for (const ct of c.contacts) if (ct.email) addresses.push(ct.email);
      const d = deriveEmail(c.contact, c.website);
      if (d) addresses.push(d);
    } else {
      const s = await prisma.sale.findUnique({ where: { id: refId } });
      if (!s) return res.status(404).json({ error: 'Lead not found.' });
      ws = s.ws;
      if (s.email) addresses.push(s.email);
    }

    if (!(await isConnected(ws))) {
      return res.json({ connected: false, configured: isConfigured(ws), messages: [] });
    }
    const uniq = [...new Set(addresses.map((a) => a.trim().toLowerCase()).filter((a) => a.includes('@') && a !== '—'))];
    const messages = await listForAddresses(ws, uniq, 30);
    res.json({ connected: true, addresses: uniq, messages });
  } catch (e: any) {
    // Surface a clean message but don't 500 the whole view.
    res.json({ connected: true, error: e?.message || 'Could not load Gmail history.', messages: [] });
  }
});

// POST /api/gmail/sync-contacted { ws } — set each client's "last contacted"
// from the most recent email actually sent to their contact addresses in Gmail.
router.post('/sync-contacted', requireAuth, async (req, res, next) => {
  try {
    const ws = String(req.body?.ws || '');
    if (!WORKSPACES.includes(ws)) return res.status(400).json({ error: 'Unknown workspace.' });
    if (!(await isConnected(ws))) return res.status(400).json({ error: 'Gmail isn’t connected for this workspace.' });

    // Correspondence in BOTH directions counts as being in touch: our sent
    // mail (all-time, capped) plus anything clients emailed us recently.
    const [{ recipients, scanned: scannedSent }, { senders, scanned: scannedInbox }] = await Promise.all([
      listSentRecipients(ws),
      listInboxSenders(ws),
    ]);
    const contactMs = new Map<string, number>(recipients);
    for (const [email, ms] of senders) if (ms > (contactMs.get(email) || 0)) contactMs.set(email, ms);

    // Also collapse to the most-recent contact per DOMAIN, so a message to or
    // from anyone @school.nz counts as contact with that school.
    const domainMap = new Map<string, number>();
    for (const [email, ms] of contactMs) {
      const dom = email.split('@')[1];
      if (dom && ms > (domainMap.get(dom) || 0)) domainMap.set(dom, ms);
    }
    const cleanDomain = (w: string) => (w || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();

    const clients = await prisma.client.findMany({ where: { ws }, include: { contacts: true } });
    const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let updated = 0, matched = 0;
    for (const c of clients) {
      let max = 0;
      // the record's own email + exact contact addresses
      const own = (c.email || '').trim().toLowerCase();
      if (own) { const t = contactMs.get(own) || 0; if (t > max) max = t; }
      for (const ct of c.contacts) if (ct.email) { const t = contactMs.get(ct.email.trim().toLowerCase()) || 0; if (t > max) max = t; }
      const d = deriveEmail(c.contact, c.website);
      if (d) { const t = contactMs.get(d.toLowerCase()) || 0; if (t > max) max = t; }
      // whole-domain match (anyone @ the school's website domain)
      const dom = cleanDomain(c.website);
      if (dom) { const t = domainMap.get(dom) || 0; if (t > max) max = t; }
      if (max > 0) {
        matched++;
        const disp = fmt(max);
        // Only ever move last-contacted FORWARD — a manual/newer date wins.
        const cur = c.lastContacted ? Date.parse(c.lastContacted) : NaN;
        if ((isNaN(cur) || max > cur) && c.lastContacted !== disp) {
          await prisma.client.update({ where: { id: c.id }, data: { lastContacted: disp } });
          updated++;
        }
      }
    }
    res.json({ ok: true, scanned: scannedSent + scannedInbox, scannedSent, scannedInbox, matched, updated });
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'Gmail sync failed.' });
  }
});

// GET /api/gmail/message?ws=schoolwebsites&id=... — full body of one message.
router.get('/message', requireAuth, async (req, res, next) => {
  try {
    const ws = String(req.query.ws || '');
    const id = String(req.query.id || '');
    if (!WORKSPACES.includes(ws)) return res.status(400).json({ error: 'Unknown workspace.' });
    if (!id) return res.status(400).json({ error: 'Missing message id.' });
    if (!(await isConnected(ws))) return res.status(400).json({ error: 'Gmail isn’t connected for this workspace.' });
    res.json(await getMessageFull(ws, id));
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'Could not load the email.' });
  }
});

export default router;
