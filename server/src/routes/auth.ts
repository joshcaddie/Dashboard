import { Router, type Request } from 'express';
import { prisma } from '../db.js';
import {
  hashPassword, verifyPassword, makeToken, hashToken,
  issueSession, clearSession, requireAuth,
} from '../auth.js';
import { authSender, sendMail } from '../mailer.js';

const router = Router();

// Base URL for links in emails. Prefer APP_URL; else derive from the request.
function appUrl(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}`;
}

const publicUser = (u: any) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status });

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    issueSession(res, req, { id: user.id, email: user.email, name: user.name, role: user.role });
    res.json(publicUser(user));
  } catch (e) { next(e); }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// GET /api/auth/me  — current user or 401
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const sess = (req as any).user;
    const user = await prisma.user.findUnique({ where: { id: sess.id } });
    if (!user) { clearSession(res); return res.status(401).json({ error: 'Not signed in.' }); }
    res.json(publicUser(user));
  } catch (e) { next(e); }
});

// POST /api/auth/forgot  { email }
// Always responds ok (no account enumeration). Emails a reset link if the
// account exists.
router.post('/forgot', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const { token, hash, expiry } = makeToken();
      await prisma.user.update({ where: { id: user.id }, data: { tokenHash: hash, tokenExpiry: expiry } });
      const link = `${appUrl(req)}/reset?token=${token}`;
      try {
        await sendMail(authSender(), {
          to: user.email,
          subject: 'Reset your Schoolhub CRM password',
          text: `Hi ${user.name},\n\nUse this link to set a new password (valid for 48 hours):\n${link}\n\nIf you didn't request this, you can ignore this email.`,
          html: resetHtml(user.name, link, 'reset your password'),
        });
      } catch (mailErr: any) {
        // Surface config errors to the server log but don't leak to the client.
        console.error('Password reset email failed:', mailErr?.message);
      }
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/auth/reset  { token, password }
// Handles both password reset and invite acceptance (same token mechanism).
router.post('/reset', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim();
    const password = String(req.body?.password || '');
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const hash = hashToken(token);
    const user = await prisma.user.findFirst({ where: { tokenHash: hash } });
    if (!user || !user.tokenExpiry || user.tokenExpiry.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This link is invalid or has expired.' });
    }
    const passwordHash = await hashPassword(password);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, status: 'active', tokenHash: null, tokenExpiry: null },
    });
    // Sign them in immediately.
    issueSession(res, req, { id: updated.id, email: updated.email, name: updated.name, role: updated.role });
    res.json(publicUser(updated));
  } catch (e) { next(e); }
});

// GET /api/auth/reset/:token — check a token is still valid (for the reset page).
router.get('/reset/:token', async (req, res, next) => {
  try {
    const hash = hashToken(String(req.params.token || ''));
    const user = await prisma.user.findFirst({ where: { tokenHash: hash } });
    if (!user || !user.tokenExpiry || user.tokenExpiry.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This link is invalid or has expired.' });
    }
    res.json({ ok: true, email: user.email, name: user.name, invite: user.status === 'invited' });
  } catch (e) { next(e); }
});

export function resetHtml(name: string, link: string, action: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#33475A;line-height:1.6">
    <p>Hi ${name},</p>
    <p>Use the button below to ${action} (valid for 48 hours):</p>
    <p><a href="${link}" style="display:inline-block;padding:11px 20px;background:#2E7D6B;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Set your password</a></p>
    <p style="font-size:13px;color:#7A8894">Or paste this link into your browser:<br>${link}</p>
    <p style="font-size:13px;color:#7A8894">If you didn't request this, you can ignore this email.</p>
  </div>`;
}

export default router;
