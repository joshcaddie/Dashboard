// Authentication helpers: password hashing, JWT sessions in an httpOnly cookie,
// and Express middleware for gating routes by login + role.
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

export const COOKIE_NAME = 'sh_session';
const SESSION_DAYS = 30;

// JWT secret. Prefer an explicit env var; otherwise derive a stable secret from
// DATABASE_URL so sessions survive restarts without extra config. (If neither is
// set — local dev with SQLite-less setup — fall back to a fixed dev string.)
function jwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const seed = process.env.DATABASE_URL || 'schoolhub-dev-secret';
  return crypto.createHash('sha256').update('schoolhub-jwt|' + seed).digest('hex');
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Rank roles so requireRole('admin') also admits super_admin.
const ROLE_RANK: Record<string, number> = { member: 1, admin: 2, super_admin: 3 };
export function roleAtLeast(role: string, min: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[min] ?? 99);
}

// ---- passwords ----
export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// ---- one-time tokens (invite + password reset) ----
// We store only a SHA-256 of the token so a DB leak can't be used to set passwords.
export function makeToken(): { token: string; hash: string; expiry: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = hashToken(token);
  const expiry = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h
  return { token, hash, expiry };
}
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---- session cookie ----
export function issueSession(res: Response, req: Request, user: SessionUser) {
  const token = jwt.sign(
    { uid: user.id, email: user.email, name: user.name, role: user.role },
    jwtSecret(),
    { expiresIn: `${SESSION_DAYS}d` },
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure, // true behind Render's TLS-terminating proxy (trust proxy on)
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}
export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function readSession(req: Request): SessionUser | null {
  const raw = (req as any).cookies?.[COOKIE_NAME];
  if (!raw) return null;
  try {
    const p: any = jwt.verify(raw, jwtSecret());
    return { id: p.uid, email: p.email, name: p.name, role: p.role };
  } catch {
    return null;
  }
}

// Attach req.user if a valid session cookie is present (does not block).
export function attachUser(req: Request, _res: Response, next: NextFunction) {
  (req as any).user = readSession(req);
  next();
}

// Block unless logged in.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const u = (req as any).user ?? readSession(req);
  if (!u) return res.status(401).json({ error: 'Not signed in.' });
  (req as any).user = u;
  next();
}

// Block unless logged in AND at least `min` role.
export function requireRole(min: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u: SessionUser | null = (req as any).user ?? readSession(req);
    if (!u) return res.status(401).json({ error: 'Not signed in.' });
    if (!roleAtLeast(u.role, min)) return res.status(403).json({ error: 'Not allowed.' });
    (req as any).user = u;
    next();
  };
}

// Ensure the super admin exists on boot. Idempotent: creates Joshua Woodham if
// missing, and (only if that account has no password yet) sets one from
// SUPERADMIN_INITIAL_PASSWORD when provided. Never downgrades an existing admin.
export async function ensureSuperAdmin() {
  const email = 'joshua@websites.school.nz';
  const name = 'Joshua Woodham';
  const existing = await prisma.user.findUnique({ where: { email } });
  const initialPw = process.env.SUPERADMIN_INITIAL_PASSWORD;

  if (!existing) {
    const data: any = { email, name, role: 'super_admin', status: 'invited' };
    if (initialPw) {
      data.passwordHash = await hashPassword(initialPw);
      data.status = 'active';
    }
    await prisma.user.create({ data });
    console.log(`Seeded super admin ${email}${initialPw ? ' (password set from env)' : ' (invite pending)'}.`);
    return;
  }

  // Make sure the account is a super_admin.
  const patch: any = {};
  if (existing.role !== 'super_admin') patch.role = 'super_admin';
  // If an initial password is provided and the account still has none, set it.
  if (initialPw && !existing.passwordHash) {
    patch.passwordHash = await hashPassword(initialPw);
    patch.status = 'active';
  }
  if (Object.keys(patch).length) {
    await prisma.user.update({ where: { email }, data: patch });
    console.log(`Updated super admin ${email}.`);
  }
}
