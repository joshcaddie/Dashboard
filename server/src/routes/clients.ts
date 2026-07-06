import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// List clients (with their extra contacts)
router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { id: 'desc' },
    include: { contacts: { orderBy: { id: 'asc' } } },
  });
  res.json(clients);
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

// Patch client (e.g. lastContacted)
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  for (const k of ['name', 'contact', 'type', 'region', 'roll', 'website', 'businessType', 'notes', 'lastContacted']) {
    if (k in b) data[k] = b[k];
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
