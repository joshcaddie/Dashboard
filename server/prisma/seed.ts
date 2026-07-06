import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---- Sales / leads (schools + Caddie golf clubs) ----
const sales = [
  { id: 1, name: 'A1 Student School', town: 'Auckland', category: 'Composite / Area', region: 'Auckland', roll: 25, principal: 'Pip Block', email: 'office@a1student.school.nz', stage: 'New', ws: 'schoolwebsites' },
  { id: 2, name: 'Abbotsford School', town: 'Dunedin', category: 'Primary', region: 'Otago', roll: 281, principal: 'Stephanie Madden', email: 'admin@abbotsford.school.nz', stage: 'Contacted', ws: 'schoolwebsites' },
  { id: 3, name: 'Aberdeen School', town: 'Hamilton', category: 'Primary', region: 'Waikato', roll: 707, principal: 'Lesley Lomas', email: 'office@aberdeen.school.nz', stage: 'Proposal', ws: 'schoolwebsites' },
  { id: 4, name: 'Aberfeldy School', town: 'Whanganui', category: 'Primary', region: 'Manawatū-Whanganui', roll: 13, principal: 'Kane Todd', email: '', stage: 'New', ws: 'schoolwebsites' },
  { id: 5, name: 'ACG Parnell College', town: 'Auckland', category: 'Composite / Area', region: 'Auckland', roll: 1984, principal: 'Damian Watson', email: 'reception@acgparnell.school.nz', stage: 'Interested', ws: 'schoolwebsites' },
  { id: 6, name: 'ACG Strathallan', town: 'Karaka', category: 'Composite / Area', region: 'Auckland', roll: 1270, principal: "Daniel O'Connor", email: 'office@strathallan.school.nz', stage: 'Contacted', ws: 'schoolwebsites' },
  { id: 7, name: 'ACG Sunderland', town: 'Waitakere', category: 'Composite / Area', region: 'Auckland', roll: 870, principal: 'Nathan Villars', email: '', stage: 'New', ws: 'schoolwebsites' },
  { id: 8, name: 'ACG Tauranga', town: 'Tauranga', category: 'Composite / Area', region: 'Bay of Plenty', roll: 417, principal: 'Dorethea Kilian', email: 'hello@acgtauranga.school.nz', stage: 'Proposal', ws: 'schoolwebsites' },
  { id: 9, name: 'Addington Te Kura Taumatua', town: 'Christchurch', category: 'Primary', region: 'Canterbury', roll: 335, principal: 'Donna Bilas', email: 'admin@addington.school.nz', stage: 'New', ws: 'schoolwebsites' },
  { id: 10, name: 'Adventure School', town: 'Porirua', category: 'Primary', region: 'Wellington', roll: 454, principal: 'Tania Cox', email: 'office@adventure.school.nz', stage: 'Contacted', ws: 'schoolwebsites' },
  { id: 11, name: 'Ahipara School', town: 'Kaitaia', category: 'Primary', region: 'Northland', roll: 198, principal: 'Rewi Spraggon', email: 'admin@ahipara.school.nz', stage: 'New', ws: 'schoolwebsites' },
  { id: 12, name: 'Aidanfield Christian School', town: 'Christchurch', category: 'Composite / Area', region: 'Canterbury', roll: 612, principal: 'Mark Crossman', email: 'office@aidanfield.school.nz', stage: 'Interested', ws: 'schoolwebsites' },
  { id: 201, name: 'Wairakei Golf + Sanctuary', town: 'Taupō', category: 'Specialist / Other', region: 'Waikato', roll: 780, principal: 'Tom Hale', email: 'admin@wairakeigolf.co.nz', stage: 'Contacted', ws: 'caddie' },
  { id: 202, name: 'Jacks Point Golf', town: 'Queenstown', category: 'Specialist / Other', region: 'Otago', roll: 540, principal: 'Lucy Marsh', email: '', stage: 'New', ws: 'caddie' },
  { id: 203, name: 'Paraparaumu Beach Golf', town: 'Kāpiti', category: 'Specialist / Other', region: 'Wellington', roll: 1200, principal: 'Neil Barr', email: 'pro@pbgc.co.nz', stage: 'Proposal', ws: 'caddie' },
  { id: 204, name: 'Muriwai Golf Club', town: 'Auckland', category: 'Specialist / Other', region: 'Auckland', roll: 960, principal: 'Dan Ruka', email: 'office@muriwaigolf.co.nz', stage: 'New', ws: 'caddie' },
];

const saleMeta: Record<number, { notes: { text: string; ts: string }[]; tasks: { text: string; due: string; done: boolean }[] }> = {
  2: { notes: [{ text: 'Principal keen — wants a quote for a yearbook + website bundle.', ts: 'Jul 2, 2026 · 2:14 PM' }], tasks: [{ text: 'Send bundle proposal', due: '2026-07-10', done: false }] },
  3: { notes: [], tasks: [{ text: 'Follow-up call re: pricing', due: '2026-07-08', done: false }] },
  6: { notes: [{ text: 'Met at conference, warm lead.', ts: 'Jun 28, 2026 · 10:02 AM' }], tasks: [{ text: 'Email case studies', due: '2026-07-04', done: false }] },
  8: { notes: [{ text: 'Waiting on board approval before proceeding.', ts: 'Jul 1, 2026 · 4:30 PM' }], tasks: [{ text: 'Check in after board meeting', due: '2026-07-15', done: false }] },
};

const clients = [
  { id: 1, name: 'Aaron Standen - Harcourts Whakatane', contact: 'Aaron Standen', type: 'Client', region: 'Bay of Plenty', roll: '—', website: 'harcourts.co.nz', ws: 'schoolwebsites' },
  { id: 2, name: 'Abundant Life School', contact: 'Tina Takimoana', type: 'Client', region: 'Auckland', roll: '301–600', website: 'abundantlife.school.nz', ws: 'schoolwebsites' },
  { id: 3, name: 'Advert media - Kaimai School', contact: 'Andrea Colebourn', type: 'Client', region: 'Waikato', roll: '51–150', website: 'kaimai.school.nz', ws: 'schoolwebsites' },
  { id: 4, name: 'Agraforum NZ', contact: '—', type: 'Lead', region: 'Waikato', roll: '—', website: 'agraforum.co.nz', ws: 'schoolwebsites' },
  { id: 5, name: 'Alana Whyman & Peter Hickey - Ray White', contact: 'Alana Whyman', type: 'Lead', region: 'Auckland', roll: '—', website: 'raywhite.com', ws: 'schoolwebsites' },
  { id: 6, name: 'Albury School', contact: 'Donna Reid', type: 'Client', region: 'Canterbury', roll: '1–50', website: 'albury.school.nz', ws: 'schoolwebsites' },
  { id: 7, name: 'Amuri Area School', contact: 'Melissa Stott', type: 'Client', region: 'Canterbury', roll: '151–300', website: 'amuri.school.nz', ws: 'schoolwebsites' },
  { id: 8, name: 'Oranga School', contact: 'Gavin Han', type: 'Client', region: 'Auckland', roll: '301–600', website: 'oranga.school.nz', ws: 'schoolwebsites' },
  { id: 9, name: 'Heretaunga Intermediate', contact: 'Kelly Boyd', type: 'Client', region: 'Hawkes Bay', roll: '301–600', website: 'heretaunga.school.nz', ws: 'schoolwebsites' },
  { id: 10, name: 'Northcote Primary School', contact: 'Sam Ngata', type: 'Client', region: 'Auckland', roll: '151–300', website: 'northcote.school.nz', ws: 'schoolwebsites' },
  { id: 11, name: 'Northern Southland College', contact: 'Priya Naidu', type: 'Client', region: 'Southland', roll: '51–150', website: 'nsc.school.nz', ws: 'schoolwebsites' },
  { id: 12, name: 'Greytown School', contact: 'Ben Tait', type: 'Lead', region: 'Wairarapa', roll: '51–150', website: 'greytown.school.nz', ws: 'schoolwebsites' },
  { id: 13, name: 'Howick College', contact: 'Marnie Ford', type: 'Client', region: 'Auckland', roll: '600+', website: 'howickcollege.school.nz', ws: 'schoolwebsites' },
  { id: 14, name: 'Dunstan High School', contact: 'Leah Sipa', type: 'Client', region: 'Otago', roll: '301–600', website: 'dunstan.school.nz', ws: 'schoolwebsites' },
  { id: 15, name: 'Rangiora New Life School', contact: 'Toby Vale', type: 'Client', region: 'Canterbury', roll: '151–300', website: 'rnls.school.nz', ws: 'schoolwebsites' },
  { id: 16, name: 'Cashmere High School', contact: 'Nadia Cole', type: 'Lead', region: 'Canterbury', roll: '600+', website: 'cashmere.school.nz', ws: 'schoolwebsites' },
  { id: 201, name: 'Remuera Golf Club', contact: 'James Fowler', type: 'Client', region: 'Auckland', roll: '—', website: 'remueragolf.co.nz', ws: 'caddie' },
  { id: 202, name: 'Titirangi Golf Club', contact: 'Sarah Bell', type: 'Client', region: 'Auckland', roll: '—', website: 'titirangigolf.co.nz', ws: 'caddie' },
  { id: 203, name: 'Millbrook Resort', contact: 'Anna Voss', type: 'Client', region: 'Otago', roll: '—', website: 'millbrook.co.nz', ws: 'caddie' },
  { id: 204, name: 'Clearwater Golf', contact: 'Mark Reid', type: 'Lead', region: 'Canterbury', roll: '—', website: 'clearwatergolf.co.nz', ws: 'caddie' },
  { id: 205, name: 'Windross Farm', contact: 'Priya Anand', type: 'Client', region: 'Auckland', roll: '—', website: 'windrossfarm.co.nz', ws: 'caddie' },
];

const jobs = [
  { id: 1, client: 'Oranga School', salesDate: 'Jun 29, 2026', jobType: 'Website', status: 'Awaiting Brief', dev: 1800, host: 720, hostingMonth: 'August', region: 'Auckland', thisMonth: true, ws: 'schoolwebsites' },
  { id: 2, client: 'Heretaunga Intermediate', salesDate: 'Jun 25, 2026', jobType: 'Website', status: 'Awaiting Brief', dev: 1800, host: 600, hostingMonth: 'August', region: 'Hawkes Bay', thisMonth: true, ws: 'schoolwebsites' },
  { id: 3, client: 'Northcote Primary School', salesDate: 'Jun 24, 2026', jobType: 'Website', status: 'In Design', dev: 1800, host: 720, hostingMonth: 'August', region: 'Auckland', thisMonth: true, ws: 'schoolwebsites' },
  { id: 4, client: 'Northern Southland College', salesDate: 'Jun 23, 2026', jobType: 'Year Book', status: 'Awaiting Brief', dev: 1500, host: 840, hostingMonth: 'June', region: 'Southland', thisMonth: true, ws: 'schoolwebsites' },
  { id: 5, client: 'TKKM o Te Wananga Whare Tapere', salesDate: 'Jun 22, 2026', jobType: 'Website', status: 'Awaiting Brief', dev: 1800, host: 720, hostingMonth: 'August', region: 'Hawkes Bay', thisMonth: true, ws: 'schoolwebsites' },
  { id: 6, client: 'Greytown School', salesDate: 'Jun 18, 2026', jobType: 'Website', status: 'In Progress', dev: 0, host: 840, hostingMonth: 'July', region: 'Wairarapa', thisMonth: true, ws: 'schoolwebsites' },
  { id: 7, client: 'Te Mātaitihi', salesDate: 'Jun 05, 2026', jobType: 'Website', status: 'Awaiting Brief', dev: 2500, host: 720, hostingMonth: 'July', region: 'Wellington', thisMonth: true, ws: 'schoolwebsites' },
  { id: 8, client: 'Pinehill School - Advert Media', salesDate: 'May 25, 2026', jobType: 'Newsletter ads', status: 'Complete', dev: 900, host: 0, hostingMonth: '—', region: 'Auckland', thisMonth: false, ws: 'schoolwebsites' },
  { id: 9, client: 'Hingaia Peninsula School', salesDate: 'May 25, 2026', jobType: 'Website', status: 'In Design', dev: 1800, host: 600, hostingMonth: 'June', region: 'Auckland', thisMonth: false, ws: 'schoolwebsites' },
  { id: 10, client: 'Howick College', salesDate: 'May 11, 2026', jobType: 'Year Book', status: 'In Progress', dev: 3500, host: 1200, hostingMonth: 'May', region: 'Auckland', thisMonth: false, ws: 'schoolwebsites' },
  { id: 11, client: 'Mt Cook School', salesDate: 'May 11, 2026', jobType: 'Website', status: 'Complete', dev: 1800, host: 720, hostingMonth: 'June', region: 'Wellington', thisMonth: false, ws: 'schoolwebsites' },
  { id: 12, client: 'Dunstan High School', salesDate: 'May 05, 2026', jobType: 'Year Book', status: 'Awaiting Brief', dev: 900, host: 1500, hostingMonth: 'January', region: 'Otago', thisMonth: false, ws: 'schoolwebsites' },
  { id: 13, client: 'Henderson Intermediate School', salesDate: 'May 05, 2026', jobType: 'Website', status: 'In Progress', dev: 2500, host: 840, hostingMonth: 'March', region: 'Auckland', thisMonth: false, ws: 'schoolwebsites' },
  { id: 14, client: 'Heaton Normal Intermediate', salesDate: 'May 05, 2026', jobType: 'Newsletter', status: 'Complete', dev: 0, host: 300, hostingMonth: 'May', region: 'Canterbury', thisMonth: false, ws: 'schoolwebsites' },
  { id: 15, client: 'Rangiora New Life School', salesDate: 'Apr 28, 2026', jobType: 'Custom App', status: 'In Progress', dev: 4200, host: 960, hostingMonth: 'March', region: 'Canterbury', thisMonth: false, ws: 'schoolwebsites' },
  { id: 16, client: 'Cashmere High School', salesDate: 'Apr 20, 2026', jobType: 'Newsletter ads', status: 'Complete', dev: 650, host: 0, hostingMonth: '—', region: 'Canterbury', thisMonth: false, ws: 'schoolwebsites' },
  { id: 17, client: 'Tauranga Girls College', salesDate: 'Apr 02, 2026', jobType: 'Website', status: 'Cancelled', dev: 1800, host: 720, hostingMonth: '—', region: 'Bay of Plenty', thisMonth: false, ws: 'schoolwebsites' },
  { id: 18, client: 'St Kentigern College', salesDate: 'Mar 18, 2026', jobType: 'Custom App', status: 'Complete', dev: 5200, host: 1200, hostingMonth: 'March', region: 'Auckland', thisMonth: false, ws: 'schoolwebsites' },
  { id: 201, client: 'Remuera Golf Club', salesDate: 'Jun 20, 2026', jobType: 'Website', status: 'In Design', dev: 4200, host: 1200, hostingMonth: 'August', region: 'Auckland', thisMonth: true, ws: 'caddie' },
  { id: 202, client: 'Millbrook Resort', salesDate: 'Jun 12, 2026', jobType: 'Custom App', status: 'In Progress', dev: 8500, host: 2400, hostingMonth: 'July', region: 'Otago', thisMonth: true, ws: 'caddie' },
  { id: 203, client: 'Titirangi Golf Club', salesDate: 'May 28, 2026', jobType: 'Website', status: 'Complete', dev: 3800, host: 1200, hostingMonth: 'June', region: 'Auckland', thisMonth: false, ws: 'caddie' },
  { id: 204, client: 'Windross Farm', salesDate: 'May 14, 2026', jobType: 'Custom App', status: 'In Progress', dev: 6400, host: 1800, hostingMonth: 'May', region: 'Auckland', thisMonth: false, ws: 'caddie' },
  { id: 205, client: 'Clearwater Golf', salesDate: 'Apr 30, 2026', jobType: 'Other job', status: 'Awaiting Brief', dev: 2000, host: 0, hostingMonth: '—', region: 'Canterbury', thisMonth: false, ws: 'caddie' },
];

const templates = [
  { id: 1, name: 'Intro — Yearbook & website', subject: 'Bringing {{school_name}}’s yearbook & website online', body: '<p>Kia ora {{principal_first_name}},</p><p>My name is Rachel and I help schools across {{region}} publish digital yearbooks and modern websites.</p><p>I’d love to show <b>{{school_name}}</b> what we’ve built for other {{category}} schools nearby. Would you have 15 minutes this week for a quick call?</p><p>Ngā mihi,<br>Rachel Wills</p>' },
  { id: 2, name: 'Follow-up — no reply', subject: 'Following up — {{school_name}}', body: '<p>Hi {{principal_first_name}},</p><p>Just circling back on my note about a new website and digital yearbook for <b>{{school_name}}</b>. Happy to send a quick example tailored to a {{roll}}-student school.</p><p>Cheers,<br>Rachel</p>' },
];

const salesChannels = ['SEO / Ads', 'Word of Mouth', 'Acquisition', 'Referral Partner', 'Existing Client', 'Cold Calling', 'Other'];
const referralPartners = ['Many Hats', 'Hyper', 'BNI', 'Torri', 'Webfox', 'Damon Hardie', 'Karen Phelps', 'Switched On IT', 'Coast & Co'];

const targets: Record<string, number> = {
  totalHosting: 290000, websiteHosting: 230000, newslettersRev: 34000, chatBotsRev: 14000, alumniRev: 18000, yearbookRev: 45000,
  websites: 300, newsletters: 130, chatBots: 24, alumni: 30, yearbook: 55,
  cad_total: 330000, cad_web: 240000, cad_googleads: 70000, cad_iubenda: 8000, cad_hyper: 8000, cad_seo: 9000, cad_cleantalk: 3500, cad_websites: 360,
};

export async function runSeed() {
  console.log('Seeding database…');
  // Clear (respect FK order)
  await prisma.saleNote.deleteMany();
  await prisma.saleTask.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.sentEmail.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.job.deleteMany();
  await prisma.client.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.salesChannel.deleteMany();
  await prisma.referralPartner.deleteMany();
  await prisma.target.deleteMany();

  for (const c of clients) {
    await prisma.client.create({ data: c });
  }
  for (const j of jobs) {
    await prisma.job.create({ data: j });
  }
  for (const s of sales) {
    await prisma.sale.create({
      data: {
        ...s,
        notes: { create: (saleMeta[s.id]?.notes ?? []).map((n) => ({ text: n.text, ts: n.ts })) },
        tasks: { create: (saleMeta[s.id]?.tasks ?? []).map((t) => ({ text: t.text, due: t.due, done: t.done })) },
      },
    });
  }
  for (const t of templates) {
    await prisma.emailTemplate.create({ data: t });
  }
  await prisma.salesChannel.createMany({ data: salesChannels.map((name, order) => ({ name, order })) });
  await prisma.referralPartner.createMany({ data: referralPartners.map((name, order) => ({ name, order })) });
  await prisma.target.createMany({ data: Object.entries(targets).map(([key, value]) => ({ key, value })) });

  // Advance each Postgres identity sequence past the explicitly-seeded ids so
  // new inserts don't collide.
  for (const table of ['Client', 'Job', 'Sale', 'EmailTemplate']) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${table}"))`
    );
  }

  console.log('Seed complete.');
}

// Run directly (`tsx prisma/seed.ts`) → always reseed.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
