import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.contact.delete({ where: { id } });
  res.status(204).end();
});

export default router;
