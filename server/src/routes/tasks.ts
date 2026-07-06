import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  if ('done' in b) data.done = !!b.done;
  if ('text' in b) data.text = b.text;
  if ('due' in b) data.due = b.due;
  const task = await prisma.saleTask.update({ where: { id }, data });
  res.json(task);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.saleTask.delete({ where: { id } });
  res.status(204).end();
});

export default router;
