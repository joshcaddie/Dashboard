// Gmail integration: per-workspace OAuth (offline refresh token) + Gmail REST
// for reading threads and sending mail. Dependency-free (uses global fetch).
import crypto from 'node:crypto';
import { prisma } from './db.js';

export type Ws = 'caddie' | 'schoolwebsites';

// Read + send. gmail.readonly & gmail.send are enough; getProfile (readonly)
// gives us the connected address.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

interface GCfg { clientId?: string; clientSecret?: string; hint: string; }

// Per-workspace client credentials, so each agency can use its own (Internal)
// OAuth app. Falls back to a single shared GOOGLE_CLIENT_ID/SECRET pair.
export function gcfg(ws: string): GCfg {
  if (ws === 'caddie') {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID_CADDIE || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_CADDIE || process.env.GOOGLE_CLIENT_SECRET,
      hint: 'josh@caddiedigital.co.nz',
    };
  }
  return {
    clientId: process.env.GOOGLE_CLIENT_ID_SCHOOLWEB || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET_SCHOOLWEB || process.env.GOOGLE_CLIENT_SECRET,
    hint: 'joshua@websites.school.nz',
  };
}
export const isConfigured = (ws: string) => { const c = gcfg(ws); return !!(c.clientId && c.clientSecret); };

// ---- refresh-token encryption at rest (AES-256-GCM) ----
function encKey(): Buffer {
  const seed = process.env.GMAIL_TOKEN_KEY || process.env.JWT_SECRET || process.env.DATABASE_URL || 'schoolhub-dev';
  return crypto.createHash('sha256').update('gmail-token|' + seed).digest();
}
export function encryptToken(txt: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([c.update(txt, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function decryptToken(b64: string): string {
  const buf = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', encKey(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

// ---- OAuth ----
export function authUrl(ws: string, redirectUri: string, state: string): string {
  const c = gcfg(ws);
  const p = new URLSearchParams({
    client_id: c.clientId || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token every time
    include_granted_scopes: 'true',
    login_hint: c.hint,
    state,
  });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + p.toString();
}

export async function exchangeCode(ws: string, code: string, redirectUri: string): Promise<any> {
  const c = gcfg(ws);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: c.clientId || '', client_secret: c.clientSecret || '',
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error_description || j.error || `Token exchange failed (HTTP ${r.status})`);
  return j; // { access_token, refresh_token, expires_in, ... }
}

// In-memory access-token cache per workspace.
const tokenCache = new Map<string, { token: string; exp: number }>();
export function clearTokenCache(ws: string) { tokenCache.delete(ws); }

async function refreshAccess(ws: string, refreshToken: string): Promise<{ token: string; exp: number }> {
  const c = gcfg(ws);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: c.clientId || '', client_secret: c.clientSecret || '',
      refresh_token: refreshToken, grant_type: 'refresh_token',
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || 'Could not refresh Gmail access.');
  return { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) - 60) * 1000 };
}

async function getAccessToken(ws: string): Promise<string> {
  const cached = tokenCache.get(ws);
  if (cached && cached.exp > Date.now()) return cached.token;
  const acct = await prisma.gmailAccount.findUnique({ where: { ws } });
  if (!acct) throw new Error(`Gmail isn't connected for this workspace.`);
  const fresh = await refreshAccess(ws, decryptToken(acct.refreshToken));
  tokenCache.set(ws, fresh);
  return fresh.token;
}

export const isConnected = async (ws: string) => !!(await prisma.gmailAccount.findUnique({ where: { ws } }));

// ---- Gmail REST ----
async function gapi(ws: string, path: string, init?: RequestInit): Promise<any> {
  const token = await getAccessToken(ws);
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, {
    ...init,
    headers: { Authorization: 'Bearer ' + token, ...(init?.headers || {}) },
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Gmail API error (HTTP ${r.status})`);
  return j;
}

export async function getProfileEmail(ws: string): Promise<string> {
  const j = await gapi(ws, 'profile');
  return j.emailAddress || '';
}

export interface GmailMsg {
  id: string; threadId: string; from: string; to: string;
  subject: string; snippet: string; dateMs: number; isOut: boolean; unread: boolean;
}

function header(headers: any[], name: string): string {
  const h = (headers || []).find((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}
function emailOnly(v: string): string {
  const m = (v || '').match(/<([^>]+)>/);
  return (m ? m[1] : v || '').trim().toLowerCase();
}

// Fetch recent messages to/from any of the given addresses (newest first).
export async function listForAddresses(ws: string, addresses: string[], max = 25): Promise<GmailMsg[]> {
  const clean = addresses.map((a) => a.trim().toLowerCase()).filter((a) => a && a.includes('@') && a !== '—');
  if (!clean.length) return [];
  const q = clean.map((a) => `from:${a} OR to:${a}`).join(' OR ');
  const list = await gapi(ws, `messages?q=${encodeURIComponent(q)}&maxResults=${max}`);
  const ids: { id: string }[] = list.messages || [];
  const mine = (await getMailboxEmail(ws)).toLowerCase();
  const msgs = await Promise.all(ids.map(async (m) => {
    const full = await gapi(ws, `messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`);
    const hs = full.payload?.headers || [];
    const from = header(hs, 'From');
    return {
      id: full.id, threadId: full.threadId,
      from, to: header(hs, 'To'), subject: header(hs, 'Subject') || '(no subject)',
      snippet: (full.snippet || '').trim(),
      dateMs: Number(full.internalDate || 0),
      isOut: emailOnly(from) === mine,
      unread: (full.labelIds || []).includes('UNREAD'),
    } as GmailMsg;
  }));
  return msgs.sort((a, b) => b.dateMs - a.dateMs);
}

export interface GmailFull extends GmailMsg { cc: string; text: string; html: string; }

// Recursively collect text/plain and text/html bodies from a payload tree.
function walkParts(payload: any, acc: { text: string; html: string }) {
  if (!payload) return;
  const mt = payload.mimeType || '';
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf8');
    if (mt === 'text/plain') acc.text += decoded;
    else if (mt === 'text/html') acc.html += decoded;
  }
  for (const p of payload.parts || []) walkParts(p, acc);
}

export async function getMessageFull(ws: string, id: string): Promise<GmailFull> {
  const full = await gapi(ws, `messages/${id}?format=full`);
  const hs = full.payload?.headers || [];
  const acc = { text: '', html: '' };
  walkParts(full.payload, acc);
  const from = header(hs, 'From');
  const mine = (await getMailboxEmail(ws)).toLowerCase();
  return {
    id: full.id, threadId: full.threadId,
    from, to: header(hs, 'To'), cc: header(hs, 'Cc'),
    subject: header(hs, 'Subject') || '(no subject)',
    snippet: (full.snippet || '').trim(),
    dateMs: Number(full.internalDate || 0),
    isOut: emailOnly(from) === mine,
    unread: (full.labelIds || []).includes('UNREAD'),
    text: acc.text.trim(), html: acc.html.trim(),
  };
}

function extractEmails(s: string): string[] {
  return (String(s || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).map((e) => e.toLowerCase());
}

// Scan the Sent folder and return the most-recent send time (ms) per recipient
// address, newest-first, capped so it stays bounded on large mailboxes.
export async function listSentRecipients(ws: string, cap = 1500): Promise<{ recipients: Map<string, number>; scanned: number }> {
  const recipients = new Map<string, number>();
  let pageToken: string | undefined;
  let scanned = 0;
  while (scanned < cap) {
    const list = await gapi(ws, `messages?q=in%3Asent&maxResults=500${pageToken ? `&pageToken=${pageToken}` : ''}`);
    const ids: { id: string }[] = list.messages || [];
    if (!ids.length) break;
    for (let i = 0; i < ids.length; i += 25) {
      const chunk = ids.slice(i, i + 25);
      const metas = await Promise.all(chunk.map((m) =>
        gapi(ws, `messages/${m.id}?format=metadata&metadataHeaders=To&metadataHeaders=Cc`).catch(() => null)));
      for (const meta of metas) {
        if (!meta) continue;
        const dateMs = Number(meta.internalDate || 0);
        const hs = meta.payload?.headers || [];
        const addrs = extractEmails(`${header(hs, 'To')},${header(hs, 'Cc')}`);
        for (const a of addrs) if (dateMs > (recipients.get(a) || 0)) recipients.set(a, dateMs);
      }
    }
    scanned += ids.length;
    pageToken = list.nextPageToken;
    if (!pageToken) break;
  }
  return { recipients, scanned };
}

// Cache the connected mailbox address (used to decide message direction).
const mailboxCache = new Map<string, string>();
async function getMailboxEmail(ws: string): Promise<string> {
  if (mailboxCache.has(ws)) return mailboxCache.get(ws)!;
  const acct = await prisma.gmailAccount.findUnique({ where: { ws } });
  const email = acct?.email || gcfg(ws).hint;
  mailboxCache.set(ws, email);
  return email;
}
export function clearMailboxCache(ws: string) { mailboxCache.delete(ws); }

// ---- send ----
function encodeHeader(v: string): string {
  // RFC 2047 encoded-word for non-ASCII header values (e.g. subjects).
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(v)) return v;
  return '=?UTF-8?B?' + Buffer.from(v, 'utf8').toString('base64') + '?=';
}

export async function sendMessage(ws: string, opts: { from: string; to: string; subject: string; text: string }): Promise<string> {
  const mime = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    opts.text,
  ].join('\r\n');
  const raw = Buffer.from(mime, 'utf8').toString('base64url');
  const j = await gapi(ws, 'messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  return j.id as string;
}
