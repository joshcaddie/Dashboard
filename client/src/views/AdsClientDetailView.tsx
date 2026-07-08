import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { money } from '../lib';
import type { AdNote, AdReport } from '../types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Live money input (commits on change), mirroring the job detail editor.
function MoneyField({ value, onSave, accent }: { value: number; onSave: (n: number) => void; accent: string }) {
  const [v, setV] = useState(String(value || ''));
  useEffect(() => { if ((parseFloat(v) || 0) !== value) setV(value ? String(value) : ''); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E3E9EE', borderRadius: 8, overflow: 'hidden', maxWidth: 220 }}>
      <span style={{ padding: '10px 11px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: 16 }}>$</span>
      <input value={v} inputMode="numeric" placeholder="0"
        onChange={(e) => { setV(e.target.value); onSave(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0); }}
        onFocus={(e) => { (e.target.parentElement as HTMLElement).style.borderColor = accent; (e.target.parentElement as HTMLElement).style.boxShadow = `0 0 0 3px ${accent}22`; }}
        onBlur={(e) => { (e.target.parentElement as HTMLElement).style.borderColor = '#E3E9EE'; (e.target.parentElement as HTMLElement).style.boxShadow = 'none'; }}
        style={{ flex: 1, padding: '10px 12px', border: 'none', fontSize: 20, fontWeight: 700, outline: 'none', width: '100%', color: '#0F2233', fontVariantNumeric: 'tabular-nums' }} />
    </div>
  );
}

const label = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA8B4' } as const;
const card: CSSProperties = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '15px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' };
const inputBase: CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #DDE4EA', borderRadius: 7, fontSize: 13.5, color: '#33475A', outline: 'none', background: '#fff', fontFamily: 'inherit' };

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function AdsClientDetailView() {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent;

  const dcl = store.clients.find((c) => c.id === store.selectedClientId);
  const clientId = dcl?.id;

  const [notes, setNotes] = useState<AdNote[] | null>(null);
  const [reports, setReports] = useState<AdReport[] | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));

  const [upMonth, setUpMonth] = useState(MONTHS[new Date().getMonth()]);
  const [upYear, setUpYear] = useState(String(new Date().getFullYear()));
  const [upFile, setUpFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [emailReport, setEmailReport] = useState<AdReport | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!clientId) return;
    setNotes(null); setReports(null);
    api.get(`/ads/${clientId}/notes`).then(setNotes).catch(() => setNotes([]));
    api.get(`/ads/${clientId}/reports`).then(setReports).catch(() => setReports([]));
  }, [clientId]);

  if (!dcl || !clientId) return null;
  const set = (patch: Partial<typeof dcl>) => store.patchClient(dcl.id, patch);

  const addNote = async () => {
    const text = noteText.trim();
    if (!text) return;
    const n = await api.post(`/ads/${clientId}/notes`, { text, date: noteDate });
    setNotes((ns) => [n, ...(ns || [])]);
    setNoteText('');
  };
  const delNote = async (id: number) => { await api.del(`/ads/notes/${id}`); setNotes((ns) => (ns || []).filter((n) => n.id !== id)); };

  const upload = async () => {
    if (!upFile || uploading) return;
    setUploading(true); setErr('');
    try {
      const data = await toBase64(upFile);
      const rep = await api.post(`/ads/${clientId}/reports`, { month: upMonth, year: upYear, filename: upFile.name, mime: upFile.type || 'application/pdf', data });
      setReports((rs) => [rep, ...(rs || [])]);
      setUpFile(null);
    } catch (e: any) { setErr(e?.message || 'Upload failed.'); } finally { setUploading(false); }
  };
  const delReport = async (id: number) => { if (!confirm('Delete this report?')) return; await api.del(`/ads/reports/${id}`); setReports((rs) => (rs || []).filter((r) => r.id !== id)); };

  return (
    <div style={{ maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <button onClick={() => store.goBack()} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}><Icon name="arrow-left" size={16} />Back</button>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', color: '#12222F' }}>{dcl.name}</div>
          <div style={{ fontSize: 13, color: '#6B7C8C', marginTop: 4 }}>{dcl.region || '—'} · {dcl.website || '—'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#8695A2' }}>Monthly total</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{money((dcl.adSpend || 0) + (dcl.mgmtFee || 0))}</div>
        </div>
      </div>

      {/* Spend + fee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}><div style={label}>Monthly ad spend</div><div style={{ marginTop: 8 }}><MoneyField value={dcl.adSpend} onSave={(n) => set({ adSpend: n })} accent={accent} /></div></div>
        <div style={card}><div style={label}>Management fee</div><div style={{ marginTop: 8 }}><MoneyField value={dcl.mgmtFee} onSave={(n) => set({ mgmtFee: n })} accent={accent} /></div></div>
      </div>

      {/* Notes */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 14 }}>Notes</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 14 }}>
          <input value={noteDate} onChange={(e) => setNoteDate(e.target.value)} placeholder="Date" style={{ ...inputBase, width: 150 }} />
          <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…" rows={2} style={{ ...inputBase, flex: 1, minWidth: 240, resize: 'vertical', lineHeight: 1.5 }} />
          <button onClick={addNote} disabled={!noteText.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 15px', border: 'none', borderRadius: 8, background: noteText.trim() ? accent : '#9AA8B4', color: '#fff', fontSize: 13, fontWeight: 600, cursor: noteText.trim() ? 'pointer' : 'default' }}><Icon name="plus" size={15} />Add note</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(notes || []).map((n) => (
            <div key={n.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: accent, whiteSpace: 'nowrap', paddingTop: 1, minWidth: 92 }}>{n.date}</span>
              <span style={{ flex: 1, fontSize: 13.5, color: '#33475A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</span>
              <button onClick={() => delNote(n.id)} title="Delete note" style={{ border: 'none', background: 'transparent', color: '#B6C1CB', cursor: 'pointer', padding: 2 }}><Icon name="trash-2" size={15} /></button>
            </div>
          ))}
          {notes && notes.length === 0 && <div style={{ fontSize: 13, color: '#9AA8B4', padding: '6px 2px' }}>No notes yet.</div>}
          {notes === null && <div style={{ fontSize: 13, color: '#9AA8B4', padding: '6px 2px' }}>Loading…</div>}
        </div>
      </div>

      {/* Reports */}
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 14 }}>Google Ads reports</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14, padding: '12px 14px', border: '1px dashed #D8E0E7', borderRadius: 8, background: '#FAFCFD' }}>
          <select value={upMonth} onChange={(e) => setUpMonth(e.target.value)} style={{ ...inputBase, width: 150, cursor: 'pointer' }}>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          <input value={upYear} onChange={(e) => setUpYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} placeholder="Year" style={{ ...inputBase, width: 90 }} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer', maxWidth: 260, overflow: 'hidden' }}>
            <Icon name="paperclip" size={15} /><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upFile ? upFile.name : 'Choose file'}</span>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" onChange={(e) => { setUpFile(e.target.files?.[0] || null); setErr(''); }} style={{ display: 'none' }} />
          </label>
          <button onClick={upload} disabled={!upFile || uploading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 15px', border: 'none', borderRadius: 8, background: (upFile && !uploading) ? accent : '#9AA8B4', color: '#fff', fontSize: 13, fontWeight: 600, cursor: (upFile && !uploading) ? 'pointer' : 'default' }}><Icon name="upload" size={15} />{uploading ? 'Uploading…' : 'Upload report'}</button>
          {err && <span style={{ fontSize: 12.5, fontWeight: 600, color: '#C22F35' }}>{err}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(reports || []).map((r) => (
            <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 14px', border: '1px solid #EEF2F5', borderRadius: 8 }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.soft, color: accent }}><Icon name="file-text" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{[r.month, r.year].filter(Boolean).join(' ') || 'Report'}</div>
                <div style={{ fontSize: 11.5, color: '#9AA8B4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.filename}</div>
              </div>
              <a href={`/api/ads/reports/${r.id}/download`} title="Download" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E3E9EE', background: '#fff', color: '#5A6B7A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}><Icon name="download" size={15} /></a>
              <button onClick={() => setEmailReport(r)} title="Email to client" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}><Icon name="mail" size={15} />Email</button>
              <button onClick={() => delReport(r.id)} title="Delete report" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={15} /></button>
            </div>
          ))}
          {reports && reports.length === 0 && <div style={{ fontSize: 13, color: '#9AA8B4', padding: '6px 2px' }}>No reports uploaded yet.</div>}
          {reports === null && <div style={{ fontSize: 13, color: '#9AA8B4', padding: '6px 2px' }}>Loading…</div>}
        </div>
      </div>

      {emailReport && (
        <ReportEmailModal report={emailReport} client={dcl} accent={accent} onClose={() => setEmailReport(null)}
          onSent={() => { setEmailReport(null); }} />
      )}
    </div>
  );
}

function ReportEmailModal({ report, client, accent, onClose, onSent }: { report: AdReport; client: { id: number; name: string; email: string; contact: string; adSpend: number; mgmtFee: number }; accent: string; onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState(client.email && client.email !== '—' ? client.email : '');
  const [subject, setSubject] = useState(`Your Google Ads report — ${[report.month, report.year].filter(Boolean).join(' ')}`);
  const [body, setBody] = useState('');
  const [gen, setGen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const generate = async () => {
    setGen(true); setMsg('');
    try {
      const r = await api.post('/ai/report-email', {
        clientName: client.name, contactName: (client.contact && client.contact !== '—') ? client.contact : '',
        month: report.month, year: report.year, spend: client.adSpend, fee: client.mgmtFee,
      });
      if (r.subject) setSubject(r.subject);
      setBody(r.body || '');
    } catch (e: any) { setMsg(e?.message || 'Generation failed.'); } finally { setGen(false); }
  };
  const send = async () => {
    if (!to.trim()) { setMsg('Enter a recipient email.'); return; }
    setBusy(true); setMsg('');
    try {
      await api.post(`/ads/reports/${report.id}/email`, { to: to.trim(), subject, body });
      onSent();
    } catch (e: any) { setMsg(e?.message || 'Failed to send.'); setBusy(false); }
  };

  const fieldStyle: CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 13.5, outline: 'none', fontFamily: 'inherit' };

  return (
    <Modal title="Email report to client" subtitle={`${[report.month, report.year].filter(Boolean).join(' ')} · ${report.filename}`} onClose={onClose} maxWidth={620}
      footer={<>
        <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Cancel</button>
        <button onClick={send} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: busy ? '#9AA8B4' : accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}><Icon name="send" size={15} />{busy ? 'Sending…' : 'Send with report attached'}</button>
      </>}>
      <div style={{ padding: '17px 22px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <div style={{ ...label, marginBottom: 6 }}>To</div>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@email.com" style={fieldStyle} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={label}>Subject</div>
            <button onClick={generate} disabled={gen} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', border: `1px solid ${accent}55`, borderRadius: 7, background: '#fff', color: accent, fontSize: 12, fontWeight: 700, cursor: gen ? 'default' : 'pointer' }}><Icon name="wand-sparkles" size={14} />{gen ? 'Writing…' : 'Generate with AI'}</button>
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={fieldStyle} />
        </div>
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Message</div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Write a message, or click “Generate with AI”." style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#6B7C8C' }}>
          <Icon name="paperclip" size={14} style={{ color: accent }} />The report <strong>&nbsp;{report.filename}&nbsp;</strong> will be attached automatically.
        </div>
        {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: '#C22F35' }}>{msg}</div>}
      </div>
    </Modal>
  );
}
