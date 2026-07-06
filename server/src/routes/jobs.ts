import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  const jobs = await prisma.job.findMany({ orderBy: { id: 'desc' } });
  res.json(jobs);
});

router.post('/', async (req, res) => {
  const b = req.body ?? {};
  if (!b.client) return res.status(400).json({ error: 'client is required' });
  const job = await prisma.job.create({
    data: {
      client: String(b.client),
      salesDate: b.salesDate || '',
      jobType: b.jobType || 'Website',
      status: b.status || 'Awaiting Brief',
      dev: Number(b.dev) || 0,
      host: Number(b.host) || 0,
      hostingMonth: b.hostingMonth || '—',
      region: b.region || '',
      thisMonth: !!b.thisMonth,
      ws: b.ws === 'combined' ? 'schoolwebsites' : b.ws || 'schoolwebsites',
      salesChannel: b.salesChannel || '',
      referralPartner: b.salesChannel === 'Referral Partner' ? b.referralPartner || '' : '',
    },
  });
  res.status(201).json(job);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  for (const k of ['jobType', 'status', 'hostingMonth', 'region', 'salesChannel', 'referralPartner', 'salesDate']) {
    if (k in b) data[k] = b[k];
  }
  if ('dev' in b) data.dev = Number(b.dev) || 0;
  if ('host' in b) data.host = Number(b.host) || 0;
  const job = await prisma.job.update({ where: { id }, data });
  res.json(job);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.job.delete({ where: { id } });
  res.status(204).end();
});

export default router;
