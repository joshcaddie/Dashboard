import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

function rollBand(n: number): string {
  n = n || 0;
  if (n <= 50) return '1–50';
  if (n <= 150) return '51–150';
  if (n <= 300) return '151–300';
  if (n <= 600) return '301–600';
  return '600+';
}

router.get('/', async (_req, res) => {
  const sales = await prisma.sale.findMany({
    orderBy: { id: 'desc' },
    include: { notes: { orderBy: { id: 'desc' } }, tasks: { orderBy: { id: 'asc' } } },
  });
  res.json(sales);
});

// Add a lead
router.post('/', async (req, res) => {
  const b = req.body ?? {};
  if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'name is required' });
  const sale = await prisma.sale.create({
    data: {
      name: String(b.name).trim(),
      town: (b.town || '').trim(),
      category: b.category || 'Primary',
      region: b.region || '',
      roll: Number(b.roll) || 0,
      principal: (b.contact && String(b.contact).trim()) || (b.principal && String(b.principal).trim()) || '—',
      email: (b.email || '').trim(),
      stage: b.stage || 'New',
      ws: b.ws === 'combined' ? 'schoolwebsites' : b.ws || 'schoolwebsites',
    },
    include: { notes: true, tasks: true },
  });
  res.status(201).json(sale);
});

// Update sale (stage)
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  for (const k of ['stage', 'name', 'town', 'category', 'region', 'principal', 'email']) if (k in b) data[k] = b[k];
  if ('roll' in b) data.roll = Number(b.roll) || 0;
  const sale = await prisma.sale.update({ where: { id }, data });
  res.json(sale);
});

// Notes
router.post('/:id/notes', async (req, res) => {
  const saleId = Number(req.params.id);
  const b = req.body ?? {};
  if (!b.text || !String(b.text).trim()) return res.status(400).json({ error: 'text is required' });
  const note = await prisma.saleNote.create({ data: { saleId, text: String(b.text).trim(), ts: b.ts || '' } });
  res.status(201).json(note);
});

// Tasks
router.post('/:id/tasks', async (req, res) => {
  const saleId = Number(req.params.id);
  const b = req.body ?? {};
  if (!b.text || !String(b.text).trim()) return res.status(400).json({ error: 'text is required' });
  const task = await prisma.saleTask.create({ data: { saleId, text: String(b.text).trim(), due: b.due || '', done: false } });
  res.status(201).json(task);
});

// Convert a sale to a client + job
router.post('/:id/convert', async (req, res) => {
  const id = Number(req.params.id);
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return res.status(404).json({ error: 'sale not found' });
  const b = req.body ?? {};
  const monthly = Number(b.monthlyHosting) || 0;
  const disp = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const ws = sale.ws || 'schoolwebsites';

  const client = await prisma.client.create({
    data: {
      name: sale.name, contact: sale.principal || '—', type: 'Client',
      region: sale.region, roll: rollBand(sale.roll), website: '', ws,
    },
    include: { contacts: true },
  });
  const job = await prisma.job.create({
    data: {
      client: sale.name, salesDate: disp, jobType: b.jobType || 'Website', status: 'Awaiting Brief',
      dev: Number(b.devRevenue) || 0, host: monthly * 12, hostingMonth: b.hostingMonth || 'August',
      region: sale.region, thisMonth: true, ws,
    },
  });
  const updatedSale = await prisma.sale.update({ where: { id }, data: { stage: 'Won' } });
  res.status(201).json({ client, job, sale: updatedSale });
});

export default router;
