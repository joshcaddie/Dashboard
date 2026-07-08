import { Router } from 'express';
import { prisma } from '../db.js';

const router = Router();

const WS_CFG: Record<string, { name: string; offer: string }> = {
  schoolwebsites: { name: 'School Websites NZ', offer: 'websites, newsletters, chatbots, alumni portals and yearbooks for New Zealand schools' },
  caddie: { name: 'Caddie Digital', offer: 'websites and digital marketing for golf clubs' },
};

const TOKEN_LABELS: Record<string, string> = {
  '{{school_name}}': "the organisation's name",
  '{{principal_first_name}}': "the contact's first name",
  '{{principal}}': "the contact's full name",
  '{{region}}': 'region',
  '{{city}}': 'town/city',
  '{{category}}': 'category/type',
  '{{roll}}': 'student roll',
};

// POST /api/ai/email  { prompt, workspace, availableTokens: ["{{school_name}}", ...] }
// Returns { subject, body } — text may contain merge tokens the client resolves.
router.post('/email', async (req, res) => {
  const b = req.body ?? {};
  const prompt = String(b.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  const cfg = WS_CFG[b.workspace] || WS_CFG.schoolwebsites;
  const available: string[] = Array.isArray(b.availableTokens) && b.availableTokens.length
    ? b.availableTokens
    : Object.keys(TOKEN_LABELS);

  const tokenList = available.map((k) => `${k} — ${TOKEN_LABELS[k] || ''}`).join('; ');
  const system =
    'You write concise, warm-but-professional B2B sales emails. You MUST personalise using ONLY these ' +
    'merge placeholder tokens, and never invent real names, places, or numbers. Do NOT use any token that is ' +
    'not in this list, and never leave a sentence with a missing value. Available tokens: ' + tokenList +
    '. Put each token exactly where that piece of personalisation belongs. Reply with ONLY strict minified ' +
    'JSON: {"subject":"...","body":"..."} and nothing else.';
  const user =
    `Sender: ${cfg.name} — an agency providing ${cfg.offer}.\n` +
    `Write the email based on this instruction: "${prompt}".\n` +
    'Requirements: greeting must be "Kia ora {{principal_first_name}}," ; refer to the organisation as ' +
    '{{school_name}} at least once; 3-5 short paragraphs; plain text with \\n line breaks (no HTML); ' +
    `sign off "Ngā mihi,\\nRachel Wills\\n${cfg.name}". Only use tokens from the available list above.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 900,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = resp.content.filter((c) => c.type === 'text').map((c: any) => c.text).join('');
      const parsed = extractJson(text);
      return res.json({ subject: parsed.subject || '', body: parsed.body || '', source: 'anthropic' });
    } catch (e) {
      console.error('AI generation failed, using fallback:', e);
      // fall through to local fallback
    }
  }

  // Local fallback (no API key or API error) — keeps the demo functional.
  const fallback = localDraft(prompt, cfg.name, available);
  return res.json({ ...fallback, source: 'fallback' });
});

// POST /api/ai/report-email { clientName, contactName, month, year, spend, fee }
// Generates a friendly cover email for a monthly Google Ads report (no merge
// tokens — the client's real details are provided and written in directly).
router.post('/report-email', async (req, res) => {
  const b = req.body ?? {};
  const clientName = String(b.clientName || 'your business').trim();
  const contactName = String(b.contactName || '').trim();
  const month = String(b.month || '').trim();
  const year = String(b.year || '').trim();
  const spend = Number(b.spend) || 0;
  const fee = Number(b.fee) || 0;
  const period = [month, year].filter(Boolean).join(' ') || 'this period';
  const greetName = contactName || 'there';

  const system =
    'You write concise, warm, professional client-facing emails for a digital marketing agency (Caddie Digital) ' +
    'sending a monthly Google Ads performance report. Reply with ONLY strict minified JSON: {"subject":"...","body":"..."} and nothing else. ' +
    'Body is plain text with \\n line breaks (no HTML). Do not invent specific metrics or numbers beyond any provided. ' +
    'Mention that the full report is attached. 3-4 short paragraphs. Sign off "Ngā mihi,\\nJosh\\nCaddie Digital".';
  const user =
    `Write a cover email to accompany the attached Google Ads report for ${clientName} for ${period}.\n` +
    `Greeting: "Kia ora ${greetName},".\n` +
    (spend ? `Monthly ad spend was about $${spend.toLocaleString()}. ` : '') +
    (fee ? `Management fee $${fee.toLocaleString()}. ` : '') +
    'Keep it friendly, thank them for their business, invite questions or a quick call, and note the report is attached.';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model: 'claude-opus-4-8', max_tokens: 900, system,
        messages: [{ role: 'user', content: user }],
      });
      const text = resp.content.filter((c) => c.type === 'text').map((c: any) => c.text).join('');
      const parsed = extractJson(text);
      return res.json({ subject: parsed.subject || `Your Google Ads report — ${period}`, body: parsed.body || '', source: 'anthropic' });
    } catch (e) {
      console.error('AI report-email generation failed, using fallback:', e);
    }
  }

  const subject = `Your Google Ads report — ${period}`;
  const body =
    `Kia ora ${greetName},\n\n` +
    `Please find attached your Google Ads performance report for ${clientName} covering ${period}.\n\n` +
    (spend ? `Over the period your campaigns ran with a monthly ad spend of around $${spend.toLocaleString()}, and we've continued to optimise for the best possible results.\n\n` : `We've continued to optimise your campaigns for the best possible results over the period.\n\n`) +
    `If you'd like to talk through anything in the report, just reply here or let me know a good time for a quick call.\n\n` +
    `Ngā mihi,\nJosh\nCaddie Digital`;
  return res.json({ subject, body, source: 'fallback' });
});

// POST /api/ai/proposal-email  { kind: 'client'|'sale', refId, videoUrl? }
// Drafts the SEO-proposal outreach email for a record whose Caddie Optimise
// report + proposal links are on file. Grounds the "short version" paragraph
// in the actual report by fetching the public share page. Real details are
// written in directly (no merge tokens).
router.post('/proposal-email', async (req, res) => {
  const b = req.body ?? {};
  const kind: 'client' | 'sale' = b.kind === 'sale' ? 'sale' : 'client';
  const refId = Number(b.refId);
  const videoUrl = typeof b.videoUrl === 'string' && /^https?:\/\//.test(b.videoUrl.trim()) ? b.videoUrl.trim() : '';

  const rec = kind === 'client'
    ? await prisma.client.findUnique({ where: { id: refId } })
    : await prisma.sale.findUnique({ where: { id: refId } });
  if (!rec) return res.status(404).json({ error: 'Record not found.' });
  if (!rec.proposalUrl) return res.status(400).json({ error: 'No proposal on this record yet — generate one in Caddie Optimise first.' });

  const businessName = rec.name;
  const contactFull = kind === 'client' ? (rec as any).contact : (rec as any).principal;
  const firstName = (String(contactFull || '').trim().split(/\s+/)[0] || '').replace(/^—$/, '') || 'there';

  // Ground the email in the real report: fetch the public share page and strip it to text.
  let reportText = '';
  if (rec.auditUrl) {
    try {
      const r = await fetch(rec.auditUrl, { signal: AbortSignal.timeout(15_000) });
      if (r.ok) {
        reportText = (await r.text())
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 7000);
      }
    } catch { /* draft still works from score alone */ }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const system =
        'You write short, warm, zero-pressure outreach emails from Josh at Caddie Digital sharing an SEO audit + proposal ' +
        'with a business owner. Reply with ONLY strict minified JSON: {"subject":"...","body":"..."} and nothing else. ' +
        'Body is plain text with \\n line breaks (no HTML, no markdown). Ground every specific claim in the supplied report text — never invent numbers.';
      const user =
        `Write the email following this exact structure and tone (vary the wording naturally, keep it this casual and low-pressure):\n` +
        `1. Greeting: "Hi ${firstName},"\n` +
        `2. Short opener: hope they're well; you ran an SEO audit on the ${businessName} website recently — "just something I do from time to time for clients and businesses I think could benefit" — and wanted to share what came up.\n` +
        `3. "The short version:" one tight paragraph — the genuine strengths first (use real numbers from the report), then the core problem/opportunity in plain words (real numbers again).\n` +
        (videoUrl
          ? `4. Video paragraph: "I've recorded a 5 minute video here walking through the suggestions" then on its own line "Watch the video here: ${videoUrl}"\n`
          : '') +
        `${videoUrl ? '5' : '4'}. Proposal paragraph: you've put together a proposal covering all of this with a suggested scope and price; have a read when they get a chance; no pressure at all, just flagging real opportunities. Then the link on its own line: ${rec.proposalUrl}\n` +
        `${videoUrl ? '6' : '5'}. "Happy to jump on a call if useful."\n` +
        `${videoUrl ? '7' : '6'}. Sign off: "Cheers,\\nJosh"\n\n` +
        `Subject: short and personal, e.g. a few things I spotted on the ${businessName} website (write your own).\n` +
        (rec.auditScore != null ? `Overall audit score: ${rec.auditScore}/100.\n` : '') +
        (reportText ? `\nReport text to ground the facts in:\n${reportText}` : '\nNo report text available — keep the short version general (no invented numbers).');

      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const resp = await client.messages.create({
        model: 'claude-opus-4-8', max_tokens: 1200, system,
        messages: [{ role: 'user', content: user }],
      });
      const text = resp.content.filter((c) => c.type === 'text').map((c: any) => c.text).join('');
      const parsed = extractJson(text);
      if (parsed.body) return res.json({ subject: parsed.subject || `A few things I spotted on the ${businessName} website`, body: parsed.body, source: 'anthropic' });
    } catch (e) {
      console.error('AI proposal-email generation failed, using fallback:', e);
    }
  }

  // Fallback: the example skeleton with what we know filled in.
  const body =
    `Hi ${firstName},\n\n` +
    `Hope you're keeping well. I ran an SEO audit on the ${businessName} website recently, just something I do from time to time for clients and businesses I think could benefit, and wanted to share what came up.\n\n` +
    (rec.auditScore != null
      ? `The short version: there's a solid foundation to work with, and the site scored ${rec.auditScore}/100 overall — with some clear, practical opportunities to win more of the searches you should be showing up for.\n\n`
      : `The short version: there's a solid foundation to work with, and some clear, practical opportunities to win more of the searches you should be showing up for.\n\n`) +
    (videoUrl ? `I've recorded a 5 minute video here walking through the suggestions\nWatch the video here: ${videoUrl}\n\n` : '') +
    `I've put together a proposal covering all of this with a suggested scope and price. Have a read when you get a chance. No pressure at all, just flagging some real opportunities I noticed.\n${rec.proposalUrl}\n\n` +
    `Happy to jump on a call if useful.\n\nCheers,\nJosh`;
  return res.json({ subject: `A few things I spotted on the ${businessName} website`, body, source: 'fallback' });
});

function extractJson(raw: string): { subject?: string; body?: string } {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : raw);
  } catch {
    return { body: raw };
  }
}

function localDraft(prompt: string, sender: string, available: string[]) {
  const has = (t: string) => available.includes(t);
  const org = has('{{school_name}}') ? '{{school_name}}' : 'your organisation';
  const region = has('{{region}}') ? ' across {{region}}' : '';
  const first = has('{{principal_first_name}}') ? '{{principal_first_name}}' : 'there';
  const subject = `A quick idea for ${org}`;
  const body =
    `Kia ora ${first},\n\n` +
    `I'm reaching out from ${sender}. ${capitalise(prompt)}\n\n` +
    `We'd love to show ${org}${region} what we've built for similar organisations — would you have 15 minutes this week for a quick chat?\n\n` +
    `Ngā mihi,\nRachel Wills\n${sender}`;
  return { subject, body };
}

function capitalise(s: string) {
  s = s.trim();
  if (!s) return '';
  const withPeriod = /[.!?]$/.test(s) ? s : s + '.';
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
}

export default router;
