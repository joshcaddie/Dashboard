import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// Patch a contact (name / title / email / phone)
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const data: Record<string, unknown> = {};
  for (const k of ['name', 'title', 'email', 'phone']) if (k in b) data[k] = b[k];
  const contact = await prisma.contact.update({ where: { id }, data });
  res.json(contact);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.contact.delete({ where: { id } });
  res.status(204).end();
});

export default router;
