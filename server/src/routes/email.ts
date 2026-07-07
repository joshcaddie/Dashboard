import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

// Per-workspace SMTP2GO sender config. A record's ws is either 'caddie' or
// 'schoolwebsites' (Combined records are stored as 'schoolwebsites').
function senderFor(ws: string) {
  if (ws === 'caddie') {
    return { apiKey: process.env.SMTP2GO_API_KEY_CADDIE, from: 'josh@caddiedigital.co.nz', name: 'Caddie Digital' };
  }
  return { apiKey: process.env.SMTP2GO_API_KEY_SCHOOLWEBSITES, from: 'joshua@websites.school.nz', name: 'School Websites NZ' };
}

async function smtp2goSend(apiKey: string, opts: { sender: string; to: string; subject: string; text: string }) {
  const r = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Smtp2go-Api-Key': apiKey },
    body: JSON.stringify({
      sender: opts.sender,
      to: [opts.to],
      subject: opts.subject,
      text_body: opts.text,
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  const succeeded = j?.data?.succeeded ?? 0;
  if (!r.ok || succeeded < 1) {
    const msg =
      j?.data?.error ||
      j?.data?.failures?.[0]?.error ||
      j?.error ||
      `SMTP2GO error (HTTP ${r.status})`;
    throw new Error(String(msg));
  }
  return j?.data?.email_id as string | undefined;
}

// POST /api/send-email  { kind: 'client'|'sale', refId, to, subject, body }
// Actually sends via SMTP2GO, then records the email into the archive and
// updates last-contacted / logs a note.
router.post('/', async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const kind: 'client' | 'sale' = b.kind === 'sale' ? 'sale' : 'client';
    const refId = Number(b.refId);
    const to = String(b.to || '').trim();
    const subject = (String(b.subject || '').trim()) || '(no subject)';
    const body = String(b.body || '');

    if (!to || to === '—') return res.status(400).json({ error: 'No email address for this recipient.' });
    if (!subject.trim() && !body.trim()) return res.status(400).json({ error: 'Email is empty.' });

    // Resolve the record's workspace.
    let ws = 'schoolwebsites';
    if (kind === 'client') {
      const c = await prisma.client.findUnique({ where: { id: refId } });
      if (!c) return res.status(404).json({ error: 'Client not found.' });
      ws = c.ws;
    } else {
      const s = await prisma.sale.findUnique({ where: { id: refId } });
      if (!s) return res.status(404).json({ error: 'Lead not found.' });
      ws = s.ws;
    }

    const sender = senderFor(ws);
    if (!sender.apiKey) {
      return res.status(503).json({ error: `Email sending isn't configured for ${sender.name}.` });
    }

    // Send.
    await smtp2goSend(sender.apiKey, { sender: `${sender.name} <${sender.from}>`, to, subject, text: body });

    // Record.
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    await prisma.sentEmail.create({ data: { kind, refId, subject, body, day, time } });

    if (kind === 'client') {
      const today = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await prisma.client.update({ where: { id: refId }, data: { lastContacted: today } });
      return res.json({ ok: true, lastContacted: today });
    } else {
      const ts =
        d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' +
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      const note = await prisma.saleNote.create({ data: { saleId: refId, text: '✉ Emailed: ' + subject, ts } });
      return res.json({ ok: true, note });
    }
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'Failed to send email.' });
  }
});

export default router;
