import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';

const PLACEHOLDERS = ['{{school_name}}', '{{principal}}', '{{principal_first_name}}', '{{city}}', '{{region}}', '{{category}}', '{{roll}}'];
const SAMPLE: Record<string, string> = {
  '{{school_name}}': 'Te Kura o Te Kao', '{{principal}}': 'Aroha Ngata', '{{principal_first_name}}': 'Aroha',
  '{{city}}': 'Kaitaia', '{{region}}': 'Northland', '{{category}}': 'Primary', '{{roll}}': '182',
};
const renderSample = (s: string) => { let o = s || ''; Object.keys(SAMPLE).forEach((k) => (o = o.split(k).join(SAMPLE[k]))); return o; };

function RichText({ html, docKey, onChange, editorRef }: { html: string; docKey: string; onChange: (h: string) => void; editorRef: React.MutableRefObject<HTMLDivElement | null> }) {
  const el = useRef<HTMLDivElement | null>(null);
  const lastKey = useRef<string>('');
  useEffect(() => {
    if (el.current && lastKey.current !== docKey) {
      el.current.innerHTML = html || '';
      lastKey.current = docKey;
    }
  }, [docKey, html]);
  useEffect(() => { editorRef.current = el.current; });

  const exec = (cmd: string, val?: string) => {
    el.current?.focus();
    document.execCommand(cmd, false, val);
    if (el.current) onChange(el.current.innerHTML);
  };
  const btn = { width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E3E9EE', borderRadius: 8, background: '#fff', color: '#4B5D6C', cursor: 'pointer' } as const;

  return (
    <div style={{ border: '1px solid #DDE4EA', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid #EEF2F5', background: '#FAFCFD', flexWrap: 'wrap' }}>
        <button type="button" title="Bold" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} style={btn}><Icon name="bold" size={15} /></button>
        <button type="button" title="Italic" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} style={btn}><Icon name="italic" size={15} /></button>
        <button type="button" title="Underline" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} style={btn}><Icon name="underline" size={15} /></button>
        <button type="button" title="Bulleted list" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} style={btn}><Icon name="list" size={15} /></button>
        <button type="button" title="Numbered list" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }} style={btn}><Icon name="list-ordered" size={15} /></button>
        <button type="button" title="Link" onMouseDown={(e) => { e.preventDefault(); const u = prompt('Link URL'); if (u) exec('createLink', u); }} style={btn}><Icon name="link" size={15} /></button>
      </div>
      <div
        ref={el}
        contentEditable
        suppressContentEditableWarning
        onInput={() => el.current && onChange(el.current.innerHTML)}
        style={{ minHeight: 220, padding: 14, fontSize: 14, lineHeight: 1.6, outline: 'none', color: '#1F2E3D' }}
      />
    </div>
  );
}

export function EmailTemplatesView() {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent, soft = theme.soft;

  const [selectedId, setSelectedId] = useState<number | null>(store.templates[0]?.id ?? null);
  const [form, setForm] = useState(() => {
    const t = store.templates[0];
    return { name: t?.name || '', subject: t?.subject || '', body: t?.body || '' };
  });
  const [showPreview, setShowPreview] = useState(false);
  const [newSeq, setNewSeq] = useState(0);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const docKey = selectedId != null ? 't' + selectedId : 'new' + newSeq;

  const selectTemplate = (id: number) => {
    const t = store.templates.find((x) => x.id === id);
    if (!t) return;
    setSelectedId(id);
    setForm({ name: t.name, subject: t.subject, body: t.body });
    setShowPreview(false);
  };
  const newTemplate = () => { setSelectedId(null); setForm({ name: '', subject: '', body: '' }); setShowPreview(false); setNewSeq((n) => n + 1); };
  const save = async () => {
    if (!form.name.trim()) return;
    const id = await store.saveTemplate(selectedId, form);
    setSelectedId(id);
  };
  const del = async () => {
    if (selectedId == null) return;
    const next = await store.deleteTemplate(selectedId);
    if (next != null) selectTemplate(next);
    else { setSelectedId(null); setForm({ name: '', subject: '', body: '' }); setShowPreview(false); setNewSeq((n) => n + 1); }
  };
  const insertPlaceholder = (ph: string) => { editorRef.current?.focus(); document.execCommand('insertText', false, ph); };

  const focus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const blur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };
  const lbl = { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#93A1AD', marginBottom: 7 };
  const inp = { width: '100%', padding: '12px 14px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 14, outline: 'none' } as const;

  return (
    <div style={{ maxWidth: 1360, display: 'grid', gridTemplateColumns: '280px 1fr', gap: 14, alignItems: 'start' }}>
      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', padding: 16 }}>
        <button onClick={newTemplate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: 11, border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}><Icon name="plus" size={16} />New template</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {store.templates.map((t) => {
            const active = t.id === selectedId;
            return (
              <button key={t.id} onClick={() => selectTemplate(t.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 11, border: `1px solid ${active ? 'transparent' : '#EEF2F5'}`, cursor: 'pointer', fontSize: 13.5, fontWeight: active ? 700 : 600, background: active ? soft : '#fff', color: active ? accent : '#33475A' }}>{t.name || 'Untitled template'}</button>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={lbl}>Template name</label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onFocus={focus} onBlur={blur} placeholder="e.g. Intro email" style={inp} /></div>
        <div><label style={lbl}>Subject</label><input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} onFocus={focus} onBlur={blur} placeholder="Email subject line" style={inp} /></div>
        <div>
          <label style={lbl}>Body</label>
          <RichText html={form.body} docKey={docKey} onChange={(h) => setForm((f) => ({ ...f, body: h }))} editorRef={editorRef} />
        </div>
        <div style={{ background: '#F6F8FA', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#5A6B7A', marginBottom: 9 }}>Placeholders <span style={{ color: '#94A2AE', fontWeight: 500 }}>— click to insert into the body</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {PLACEHOLDERS.map((p) => (
              <button key={p} onMouseDown={(e) => { e.preventDefault(); insertPlaceholder(p); }} style={{ padding: '6px 11px', border: '1px solid #DCE3E9', borderRadius: 8, background: '#fff', fontFamily: "'IBM Plex Sans', monospace", fontSize: 12, fontWeight: 600, color: accent, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        </div>
        {showPreview && (
          <div style={{ border: '1px solid #E6ECF1', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#FAFCFD', borderBottom: '1px solid #EEF2F5', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#93A1AD' }}>Preview · Te Kura o Te Kao</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 10 }}>{renderSample(form.subject)}</div>
              <div style={{ fontSize: 14, color: '#33475A', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: renderSample(form.body) }} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <button onClick={save} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15,30,44,.14)' }}><Icon name="check" size={16} />Save template</button>
          <button onClick={() => setShowPreview((p) => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}><Icon name="eye" size={16} />Preview</button>
          <div style={{ flex: 1 }} />
          <button onClick={del} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 18px', border: '1px solid #F3D6D7', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#D33', cursor: 'pointer' }}><Icon name="trash-2" size={16} />Delete</button>
        </div>
      </div>
    </div>
  );
}
