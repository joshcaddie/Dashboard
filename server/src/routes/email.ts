import { Router } from 'express';
import { prisma } from '../db.js';
import { senderFor, sendMail } from '../mailer.js';
import { isConnected as gmailConnected, sendMessage as gmailSend } from '../gmail.js';

const router = Router();

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

    // Send via Gmail when the workspace's mailbox is connected (so it lands in
    // Sent + threads); otherwise fall back to SMTP2GO.
    if (await gmailConnected(ws)) {
      await gmailSend(ws, { from: `${sender.name} <${sender.from}>`, to, subject, text: body });
    } else {
      if (!sender.apiKey) {
        return res.status(503).json({ error: `Email sending isn't configured for ${sender.name}. Connect Gmail or add an SMTP2GO key.` });
      }
      await sendMail(sender, { to, subject, text: body });
    }

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
