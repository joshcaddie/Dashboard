// SMTP2GO email sending, shared by the composer and the auth flows.

export interface Sender {
  apiKey: string | undefined;
  from: string;
  name: string;
}

// Per-workspace sender. A record's ws is 'caddie' or 'schoolwebsites'.
export function senderFor(ws: string): Sender {
  if (ws === 'caddie') {
    return { apiKey: process.env.SMTP2GO_API_KEY_CADDIE, from: 'josh@caddiedigital.co.nz', name: 'Caddie Digital' };
  }
  return { apiKey: process.env.SMTP2GO_API_KEY_SCHOOLWEBSITES, from: 'joshua@websites.school.nz', name: 'School Websites NZ' };
}

// System sender for auth emails (invites / password resets).
export function authSender(): Sender {
  return {
    apiKey: process.env.SMTP2GO_API_KEY_SCHOOLWEBSITES || process.env.SMTP2GO_API_KEY_CADDIE,
    from: process.env.AUTH_FROM_EMAIL || 'joshua@websites.school.nz',
    name: process.env.AUTH_FROM_NAME || 'Schoolhub CRM',
  };
}

export async function smtp2goSend(apiKey: string, opts: { sender: string; to: string; subject: string; text: string; html?: string }) {
  const body: Record<string, unknown> = {
    sender: opts.sender,
    to: [opts.to],
    subject: opts.subject,
    text_body: opts.text,
  };
  if (opts.html) body.html_body = opts.html;
  const r = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify(body),
  });
  const j: any = await r.json().catch(() => ({}));
  const succeeded = j?.data?.succeeded ?? 0;
  if (!r.ok || succeeded < 1) {
    const msg = j?.data?.error || j?.data?.failures?.[0]?.error || j?.error || `SMTP2GO error (HTTP ${r.status})`;
    throw new Error(String(msg));
  }
  return j?.data?.email_id as string | undefined;
}

export async function sendMail(sender: Sender, opts: { to: string; subject: string; text: string; html?: string }) {
  if (!sender.apiKey) throw new Error(`Email sending isn't configured (${sender.name}).`);
  return smtp2goSend(sender.apiKey, { sender: `${sender.name} <${sender.from}>`, ...opts });
}
