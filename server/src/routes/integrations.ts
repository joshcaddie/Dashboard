import { Router } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../db.js';

const router = Router();

/**
 * POST /api/integrations/caddie — Caddie Optimise pushes the shareable SEO
 * report link whenever a report is generated for a record created from this
 * CRM (crmId = "client:<id>" or "sale:<id>", set by the Run-audit deep link).
 * Authenticated by a shared secret header, not a user session.
 */
router.post('/caddie', async (req, res) => {
  const secret = process.env.CADDIE_WEBHOOK_SECRET || '';
  if (!secret) return res.status(503).json({ error: 'integration_not_configured' });
  const given = String(req.get('x-caddie-secret') || '');
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { crmId, shareUrl, pdfUrl, overallScore, auditedAt } = req.body || {};
  const m = /^(client|sale):(\d+)$/.exec(String(crmId || ''));
  if (!m || typeof shareUrl !== 'string' || !/^https?:\/\//.test(shareUrl)) {
    return res.status(400).json({ error: 'bad_payload' });
  }
  const id = Number(m[2]);
  const data = {
    auditUrl: shareUrl.slice(0, 500),
    auditPdf: typeof pdfUrl === 'string' && /^https?:\/\//.test(pdfUrl) ? pdfUrl.slice(0, 500) : '',
    auditScore: Number.isFinite(Number(overallScore)) ? Math.round(Number(overallScore)) : null,
    auditAt: auditedAt
      ? new Date(auditedAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  try {
    if (m[1] === 'client') await prisma.client.update({ where: { id }, data });
    else await prisma.sale.update({ where: { id }, data });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'record_not_found' });
  }
});

export default router;
