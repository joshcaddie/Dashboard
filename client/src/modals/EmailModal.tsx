import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Modal, inputStyle, labelStyle } from '../components/Modal';
import { Icon } from '../components/Icon';
import { htmlToText } from '../lib';
import { renderMerge } from '../emailCtx';
import { api } from '../api';
import type { EmailContext } from './ModalProvider';

const ALL_TOKENS: (keyof EmailContext['merge'])[] = ['school_name', 'principal_first_name', 'principal', 'region', 'city', 'category', 'roll'];

export function EmailModal({ ctx, onClose }: { ctx: EmailContext; onClose: () => void }) {
  const store = useStore();
  const { theme, wsId } = useWs();
  const accent = theme.accent, soft = theme.soft;

  const [emailTo, setEmailTo] = useState(ctx.recipients[0]?.email || '');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState(ctx.prefill?.subject || '');
  const [body, setBody] = useState(ctx.prefill?.body || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const multi = ctx.recipients.length > 1;

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = store.templates.find((x) => String(x.id) === id);
    if (!t) { return; }
    setSubject(renderMerge(t.subject, ctx.merge));
    setBody(htmlToText(renderMerge(t.body, ctx.merge)));
  };

  const generate = async () => {
    const p = aiPrompt.trim();
    if (!p || aiGenerating) return;
    setAiGenerating(true); setAiError('');
    try {
      const availableTokens = ALL_TOKENS
        .filter((k) => String((ctx.merge as any)[k]).trim() !== '')
        .map((k) => `{{${k}}}`);
      const wsForApi = wsId === 'combined' ? 'schoolwebsites' : wsId;
      const out = await api.post('/ai/email', { prompt: p, workspace: wsForApi, availableTokens });
      setSubject(renderMerge(out.subject || '', ctx.merge));
      setBody(renderMerge(out.body || '', ctx.merge));
      setTemplateId('');
    } catch (e) {
      setAiError('Could not generate — please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const send = async () => {
    if (!subject.trim() && !body.trim()) return;
    if (sending) return;
    setSending(true);
    setSendError('');
    try {
      await store.sendEmail({ kind: ctx.kind, refId: ctx.refId, to: emailTo, subject, body, tag: ctx.prefill?.tag });
      onClose();
    } catch (e: any) {
      setSendError(e?.message || 'Could not send email.');
      setSending(false);
    }
  };

  const focus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const blur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };

  // No real address on file → the email is unsendable (we never guess one).
  const noAddress = !emailTo.trim() || emailTo.trim() === '—' || !emailTo.includes('@');

  return (
    <Modal
      title="Send email"
      subtitle={`To ${ctx.toLine}`}
      onClose={onClose}
      maxWidth={600}
      footer={
        <>
          {sendError && <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#C22F35', textAlign: 'left' }}>{sendError}</span>}
          {!sendError && noAddress && <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#B45309', textAlign: 'left' }}>No email address on file — add one to the record first.</span>}
          <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Cancel</button>
          <button onClick={send} disabled={sending || noAddress} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: sending || noAddress ? 'default' : 'pointer', opacity: sending || noAddress ? 0.5 : 1, boxShadow: '0 1px 2px rgba(15,30,44,.14)' }}><Icon name="send" size={16} />{sending ? 'Sending…' : 'Send email'}</button>
        </>
      }
    >
      <div style={{ padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '66vh', overflowY: 'auto' }}>
        <div>
          <label style={labelStyle}>Send to</label>
          {multi ? (
            <select value={emailTo} onChange={(e) => setEmailTo(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...inputStyle, backgroundColor: '#fff', color: '#33475A' }}>
              {ctx.recipients.map((r) => <option key={r.email} value={r.email}>{r.name} · {r.email}</option>)}
            </select>
          ) : (
            <div style={{ width: '100%', padding: '11px 14px', border: '1px solid #EEF1F4', borderRadius: 8, fontSize: 13.5, color: '#4B5D6C', background: '#FAFCFD' }}>
              {ctx.recipients[0] ? `${ctx.recipients[0].name} · ${ctx.recipients[0].email}` : ''}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Start from a template</label>
          <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} onFocus={focus} onBlur={blur} style={{ ...inputStyle, backgroundColor: '#fff', color: '#33475A' }}>
            <option value="">Write from scratch…</option>
            {store.templates.map((t) => <option key={t.id} value={String(t.id)}>{t.name || 'Untitled'}</option>)}
          </select>
        </div>

        {templateId === '' && (
          <div style={{ border: `1px solid ${soft}`, background: soft, borderRadius: 10, padding: '13px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <Icon name="sparkles" size={15} style={{ color: accent }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: accent }}>Generate with AI</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: '#7A8894' }}>— personalised placeholders added automatically</span>
            </div>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder={'Describe the email you want — e.g. "Intro offer for a new school website with a spring discount, friendly tone"'} rows={3} style={{ width: '100%', padding: '11px 12px', border: '1px solid #D6E4E0', borderRadius: 8, fontSize: 13.5, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9 }}>
              <button onClick={generate} disabled={aiGenerating} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: aiGenerating ? 'default' : 'pointer', opacity: aiGenerating ? 0.7 : 1 }}>
                <Icon name="sparkles" size={15} /><span>{aiGenerating ? 'Generating…' : 'Generate with AI'}</span>
              </button>
              {aiError && <span style={{ fontSize: 12, fontWeight: 600, color: '#C22F35' }}>{aiError}</span>}
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} onFocus={focus} onBlur={blur} placeholder="Subject line" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} onFocus={focus} onBlur={blur} placeholder="Write your message…" rows={10} style={{ ...inputStyle, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      </div>
    </Modal>
  );
}
