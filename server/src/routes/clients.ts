import { Router } from 'express';
import { prisma } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();

// List clients (with their extra contacts)
router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { id: 'desc' },
    include: { contacts: { orderBy: { id: 'asc' } } },
  });
  res.json(clients);
});

// GET /api/clients/no-jobs?ws=... — clients in a workspace with no job attached
// (jobs link to a client by name). For the "remove non-clients" cleanup.
router.get('/no-jobs', async (req, res) => {
  const ws = String(req.query.ws || 'schoolwebsites');
  const [clients, jobs] = await Promise.all([
    prisma.client.findMany({ where: { ws }, include: { _count: { select: { contacts: true } } } }),
    prisma.job.findMany({ where: { ws }, select: { client: true } }),
  ]);
  const jobNames = new Set(jobs.map((j) => (j.client || '').trim().toLowerCase()));
  const jobless = clients
    .filter((c) => !jobNames.has((c.name || '').trim().toLowerCase()))
    .map((c) => ({ id: c.id, name: c.name, region: c.region, type: c.type, contacts: c._count.contacts, lastContacted: c.lastContacted }));
  res.json({ ws, total: clients.length, jobless });
});

// POST /api/clients/bulk-delete { ids } — super admin. Cascades contacts.
router.post('/bulk-delete', requireRole('super_admin'), async (req, res) => {
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(Boolean);
  if (!ids.length) return res.json({ ok: true, deleted: 0 });
  const r = await prisma.client.deleteMany({ where: { id: { in: ids } } });
  res.json({ ok: true, deleted: r.count });
});

// Create client
router.post('/', async (req, res) => {
  const b = req.body ?? {};
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'name is required' });
  const client = await prisma.client.create({
    data: {
      name: String(b.name).trim(),
      contact: (b.contact && String(b.contact).trim()) || '—',
      type: b.type || 'Client',
      region: b.region || '',
      roll: b.roll || '—',
      website: (b.website || '').trim(),
      ws: b.ws === 'combined' ? 'schoolwebsites' : b.ws || 'schoolwebsites',
      businessType: b.businessType || 'Primary School',
      notes: b.notes || '',
    },
  });
  res.status(201).json(client);
});

// Patch client (any editable field)
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  for (const k of ['name', 'contact', 'type', 'region', 'roll', 'website', 'businessType', 'notes', 'lastContacted', 'phone', 'email']) {
    if (k in b) data[k] = b[k];
  }
  // Jobs link to a client by name — keep them attached if the name changes.
  if ('name' in data) {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (existing && existing.name !== data.name) {
      await prisma.job.updateMany({ where: { client: existing.name, ws: existing.ws }, data: { client: String(data.name) } });
    }
  }
  const client = await prisma.client.update({ where: { id }, data });
  res.json(client);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.client.delete({ where: { id } });
  res.status(204).end();
});

// Add contact to a client
router.post('/:id/contacts', async (req, res) => {
  const clientId = Number(req.params.id);
  const b = req.body ?? {};
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'name is required' });
  const contact = await prisma.contact.create({
    data: {
      clientId,
      name: String(b.name).trim(),
      title: (b.title && String(b.title).trim()) || 'Contact',
      email: (b.email && String(b.email).trim()) || '—',
      phone: (b.phone && String(b.phone).trim()) || '—',
    },
  });
  res.status(201).json(contact);
});

export default router;
