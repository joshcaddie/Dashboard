import { Router } from 'express';

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
