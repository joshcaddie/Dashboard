import crypto from 'crypto';

// Symmetric encryption at rest for stored secrets (e.g. domain passwords).
// AES-256-GCM with a key derived from a server-side seed. The plaintext never
// leaves the server except through an explicitly authorised reveal endpoint.
function encKey(): Buffer {
  const seed = process.env.SECRET_BOX_KEY || process.env.GMAIL_TOKEN_KEY || process.env.JWT_SECRET || process.env.DATABASE_URL || 'schoolhub-dev';
  return crypto.createHash('sha256').update('secret-box|' + seed).digest();
}

export function encryptSecret(txt: string): string {
  if (!txt) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([c.update(txt, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

export function decryptSecret(b64: string): string {
  if (!b64) return '';
  try {
    const buf = Buffer.from(b64, 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', encKey(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
  } catch {
    return '';
  }
}
