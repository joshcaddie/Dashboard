import { Router, type Request } from 'express';
import { prisma } from '../db.js';
import { makeToken, requireRole, type SessionUser } from '../auth.js';
import { authSender, sendMail } from '../mailer.js';
import { resetHtml } from './auth.js';

const router = Router();

// All team-management routes require at least admin.
router.use(requireRole('admin'));

const VALID_ROLES = ['member', 'admin', 'super_admin'];
const publicUser = (u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt });

function appUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  return `${proto}://${req.get('host')}`;
}

// GET /api/users — list the team.
router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json(users.map(publicUser));
  } catch (e) { next(e); }
});

// POST /api/users — invite a new team member { email, name, role }.
router.post('/', async (req, res, next) => {
  try {
    const me: SessionUser = (req as any).user;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    let role = String(req.body?.role || 'member');
    if (!email || !name) return res.status(400).json({ error: 'Name and email are required.' });
    if (!VALID_ROLES.includes(role)) role = 'member';
    // Only a super_admin can create another super_admin.
    if (role === 'super_admin' && me.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only a super admin can grant super admin.' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'A user with that email already exists.' });

    const { token, hash, expiry } = makeToken();
    const user = await prisma.user.create({
      data: { email, name, role, status: 'invited', tokenHash: hash, tokenExpiry: expiry },
    });
    const link = `${appUrl(req)}/reset?token=${token}`;
    let emailed = true;
    try {
      await sendMail(authSender(), {
        to: email,
        subject: `You've been invited to Schoolhub CRM`,
        text: `Hi ${name},\n\n${me.name} invited you to Schoolhub CRM. Set your password to get started (link valid for 48 hours):\n${link}`,
        html: resetHtml(name, link, 'set your password and sign in'),
      });
    } catch (mailErr: any) {
      emailed = false;
      console.error('Invite email failed:', mailErr?.message);
    }
    res.status(201).json({ ...publicUser(user), emailed });
  } catch (e) { next(e); }
});

// PATCH /api/users/:id — update name and/or role.
router.patch('/:id', async (req, res, next) => {
  try {
    const me: SessionUser = (req as any).user;
    const id = Number(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const patch: any = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) patch.name = req.body.name.trim();

    if (typeof req.body?.role === 'string' && req.body.role !== target.role) {
      const newRole = req.body.role;
      if (!VALID_ROLES.includes(newRole)) return res.status(400).json({ error: 'Invalid role.' });
      // Only super_admin can grant or revoke super_admin.
      if ((newRole === 'super_admin' || target.role === 'super_admin') && me.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only a super admin can change super admin roles.' });
      }
      // Don't strip the last super_admin.
      if (target.role === 'super_admin' && newRole !== 'super_admin') {
        const supers = await prisma.user.count({ where: { role: 'super_admin' } });
        if (supers <= 1) return res.status(400).json({ error: 'There must be at least one super admin.' });
      }
      patch.role = newRole;
    }

    if (!Object.keys(patch).length) return res.json(publicUser(target));
    const updated = await prisma.user.update({ where: { id }, data: patch });
    res.json(publicUser(updated));
  } catch (e) { next(e); }
});

// DELETE /api/users/:id — remove a team member.
router.delete('/:id', async (req, res, next) => {
  try {
    const me: SessionUser = (req as any).user;
    const id = Number(req.params.id);
    if (id === me.id) return res.status(400).json({ error: "You can't remove yourself." });
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found.' });
    // Only super_admin can remove a super_admin.
    if (target.role === 'super_admin' && me.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only a super admin can remove a super admin.' });
    }
    if (target.role === 'super_admin') {
      const supers = await prisma.user.count({ where: { role: 'super_admin' } });
      if (supers <= 1) return res.status(400).json({ error: 'There must be at least one super admin.' });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/users/:id/resend — re-send an invite / issue a fresh set-password link.
router.post('/:id/resend', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { token, hash, expiry } = makeToken();
    await prisma.user.update({ where: { id }, data: { tokenHash: hash, tokenExpiry: expiry } });
    const link = `${appUrl(req)}/reset?token=${token}`;
    await sendMail(authSender(), {
      to: user.email,
      subject: `Your Schoolhub CRM invite`,
      text: `Hi ${user.name},\n\nSet your password to get started (link valid for 48 hours):\n${link}`,
      html: resetHtml(user.name, link, 'set your password and sign in'),
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
