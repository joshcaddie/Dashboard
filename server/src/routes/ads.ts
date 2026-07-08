import { Router } from 'express';
import { prisma } from '../db.js';
import { senderFor, sendMail } from '../mailer.js';
import { isConnected as gmailConnected, sendMessage as gmailSend } from '../gmail.js';

const router = Router();

// ---- Notes (dated) ----
router.get('/:clientId/notes', async (req, res, next) => {
  try {
    const clientId = Number(req.params.clientId);
    const notes = await prisma.adNote.findMany({ where: { clientId }, orderBy: { id: 'desc' } });
    res.json(notes);
  } catch (e) { next(e); }
});

router.post('/:clientId/notes', async (req, res, next) => {
  try {
    const clientId = Number(req.params.clientId);
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Note text is required.' });
    const date = String(req.body?.date || '').trim() || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const note = await prisma.adNote.create({ data: { clientId, date, text } });
    res.status(201).json(note);
  } catch (e) { next(e); }
});

router.delete('/notes/:id', async (req, res, next) => {
  try {
    await prisma.adNote.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// ---- Reports (uploaded files, stored base64) ----
// List returns metadata only (never the file blob).
router.get('/:clientId/reports', async (req, res, next) => {
  try {
    const clientId = Number(req.params.clientId);
    const reports = await prisma.adReport.findMany({
      where: { clientId }, orderBy: { id: 'desc' },
      select: { id: true, clientId: true, month: true, year: true, filename: true, mime: true, createdAt: true },
    });
    res.json(reports);
  } catch (e) { next(e); }
});

router.post('/:clientId/reports', async (req, res, next) => {
  try {
    const clientId = Number(req.params.clientId);
    const b = req.body ?? {};
    const data = String(b.data || '');
    if (!data) return res.status(400).json({ error: 'No file provided.' });
    // Guard against oversized uploads (~18MB of base64 ≈ ~13MB file).
    if (data.length > 18_000_000) return res.status(413).json({ error: 'File too large (max ~13MB).' });
    const created = await prisma.adReport.create({
      data: {
        clientId,
        month: String(b.month || '').trim(),
        year: String(b.year || '').trim(),
        filename: String(b.filename || 'report.pdf').trim(),
        mime: String(b.mime || 'application/pdf'),
        data,
      },
    });
    res.status(201).json({ id: created.id, clientId, month: created.month, year: created.year, filename: created.filename, mime: created.mime, createdAt: created.createdAt });
  } catch (e) { next(e); }
});

router.delete('/reports/:id', async (req, res, next) => {
  try {
    await prisma.adReport.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch (e) { next(e); }
});

// Download the file itself.
router.get('/reports/:id/download', async (req, res, next) => {
  try {
    const rep = await prisma.adReport.findUnique({ where: { id: Number(req.params.id) } });
    if (!rep) return res.status(404).json({ error: 'Not found.' });
    const buf = Buffer.from(rep.data, 'base64');
    res.setHeader('Content-Type', rep.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${rep.filename}"`);
    res.send(buf);
  } catch (e) { next(e); }
});

// Email the report to the client, with the file attached.
router.post('/reports/:id/email', async (req, res, next) => {
  try {
    const rep = await prisma.adReport.findUnique({ where: { id: Number(req.params.id) } });
    if (!rep) return res.status(404).json({ error: 'Report not found.' });
    const client = await prisma.client.findUnique({ where: { id: rep.clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const to = String(req.body?.to || client.email || '').trim();
    const subject = String(req.body?.subject || '').trim() || `Your Google Ads report — ${rep.month} ${rep.year}`.trim();
    const body = String(req.body?.body || '');
    if (!to || to === '—') return res.status(400).json({ error: 'No email address for this client.' });

    const attachments = [{ filename: rep.filename || 'report.pdf', mimetype: rep.mime || 'application/pdf', base64: rep.data }];
    const sender = senderFor(client.ws);

    if (await gmailConnected(client.ws)) {
      await gmailSend(client.ws, { from: `${sender.name} <${sender.from}>`, to, subject, text: body, attachments });
    } else {
      if (!sender.apiKey) return res.status(503).json({ error: `Email sending isn't configured for ${sender.name}. Connect Gmail or add an SMTP2GO key.` });
      await sendMail(sender, { to, subject, text: body, attachments });
    }

    // Record into the client's email archive + last contacted.
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    await prisma.sentEmail.create({ data: { kind: 'client', refId: client.id, subject, body: body + `\n\n[Attached: ${rep.filename}]`, day, time } });
    const today = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    await prisma.client.update({ where: { id: client.id }, data: { lastContacted: today } });

    res.json({ ok: true, lastContacted: today });
  } catch (e: any) {
    res.status(502).json({ error: e?.message || 'Failed to send email.' });
  }
});

export default router;
