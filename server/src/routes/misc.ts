import { Router } from 'express';
import { prisma } from '../db.js';
import {
  workspaceConfigs, trendBase, trendLabels, monthlyBarsBase, seedRef,
} from '../dashboardConfig.js';

const router = Router();

// ---- Dashboard / workspace config ----
router.get('/config', (_req, res) => {
  res.json({ workspaceConfigs, trendBase, trendLabels, monthlyBarsBase, seedRef });
});

// ---- Email templates ----
router.get('/templates', async (_req, res) => {
  res.json(await prisma.emailTemplate.findMany({ orderBy: { id: 'asc' } }));
});
router.post('/templates', async (req, res) => {
  const b = req.body ?? {};
  const t = await prisma.emailTemplate.create({ data: { name: b.name || 'Untitled', subject: b.subject || '', body: b.body || '' } });
  res.status(201).json(t);
});
router.patch('/templates/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  for (const k of ['name', 'subject', 'body']) if (k in b) data[k] = b[k];
  res.json(await prisma.emailTemplate.update({ where: { id }, data }));
});
router.delete('/templates/:id', async (req, res) => {
  await prisma.emailTemplate.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---- Sales channels ----
router.get('/channels', async (_req, res) => {
  res.json(await prisma.salesChannel.findMany({ orderBy: { order: 'asc' } }));
});
router.post('/channels', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const existing = await prisma.salesChannel.findUnique({ where: { name } });
  if (existing) return res.json(existing);
  const max = await prisma.salesChannel.aggregate({ _max: { order: true } });
  res.status(201).json(await prisma.salesChannel.create({ data: { name, order: (max._max.order ?? 0) + 1 } }));
});
router.delete('/channels/:id', async (req, res) => {
  await prisma.salesChannel.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---- Referral partners ----
router.get('/partners', async (_req, res) => {
  res.json(await prisma.referralPartner.findMany({ orderBy: { order: 'asc' } }));
});
router.post('/partners', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const existing = await prisma.referralPartner.findUnique({ where: { name } });
  if (existing) return res.json(existing);
  const max = await prisma.referralPartner.aggregate({ _max: { order: true } });
  res.status(201).json(await prisma.referralPartner.create({ data: { name, order: (max._max.order ?? 0) + 1 } }));
});
router.delete('/partners/:id', async (req, res) => {
  await prisma.referralPartner.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

// ---- Targets (goals) ----
router.get('/targets', async (_req, res) => {
  const rows = await prisma.target.findMany();
  const map: Record<string, number> = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  res.json(map);
});
router.put('/targets/:key', async (req, res) => {
  const key = req.params.key;
  const value = Number(req.body?.value) || 0;
  const row = await prisma.target.upsert({ where: { key }, create: { key, value }, update: { value } });
  res.json(row);
});

// ---- Sent emails (composed from the dashboard) ----
router.get('/sent-emails', async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.kind) where.kind = String(req.query.kind);
  if (req.query.refId) where.refId = Number(req.query.refId);
  res.json(await prisma.sentEmail.findMany({ where, orderBy: { id: 'desc' } }));
});
router.post('/sent-emails', async (req, res) => {
  const b = req.body ?? {};
  const email = await prisma.sentEmail.create({
    data: {
      kind: b.kind || 'client', refId: Number(b.refId) || 0,
      subject: b.subject || '(no subject)', body: b.body || '', day: b.day || '', time: b.time || '',
    },
  });
  res.status(201).json(email);
});

export default router;
