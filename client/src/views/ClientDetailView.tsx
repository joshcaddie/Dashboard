import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { useWs, deriveEmail } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { Icon } from '../components/Icon';
import { money, initials, avatarColors, clientTypeStyle, typeStyle, statusStyle, BUSINESS_TYPE_OPTIONS } from '../lib';

const STATUS_OPTS = ['Client', 'Lead', 'Trial'];

const fieldBase: CSSProperties = { width: '100%', padding: '7px 9px', border: '1px solid #E3E9EE', borderRadius: 7, fontSize: 14, color: '#33475A', outline: 'none', background: '#fff', fontFamily: 'inherit' };
const ring = (accent: string) => ({
  onFocus: (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}22`; },
});

function TextField({ value, onSave, accent, placeholder, cell }: { value: string; onSave: (v: string) => void; accent: string; placeholder?: string; cell?: boolean }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { setV(value ?? ''); }, [value]);
  return (
    <input
      value={v} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      {...ring(accent)}
      onBlur={(e) => { e.target.style.borderColor = '#E3E9EE'; e.target.style.boxShadow = 'none'; if ((v ?? '') !== (value ?? '')) onSave(v.trim()); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      style={cell ? { ...fieldBase, padding: '6px 8px', fontSize: 13 } : fieldBase}
    />
  );
}

function SelectField({ value, options, onSave, accent }: { value: string; options: string[]; onSave: (v: string) => void; accent: string }) {
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select value={value} onChange={(e) => onSave(e.target.value)} {...ring(accent)}
      onBlur={(e) => { e.target.style.borderColor = '#E3E9EE'; e.target.style.boxShadow = 'none'; }}
      style={{ ...fieldBase, cursor: 'pointer' }}>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function AreaField({ value, onSave, accent, placeholder }: { value: string; onSave: (v: string) => void; accent: string; placeholder?: string }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { setV(value ?? ''); }, [value]);
  return (
    <textarea value={v} placeholder={placeholder} rows={3}
      onChange={(e) => setV(e.target.value)}
      {...ring(accent)}
      onBlur={(e) => { e.target.style.borderColor = '#E3E9EE'; e.target.style.boxShadow = 'none'; if ((v ?? '') !== (value ?? '')) onSave(v); }}
      style={{ ...fieldBase, resize: 'vertical', lineHeight: 1.5 }} />
  );
}

const label = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA8B4' } as const;

export function ClientDetailView() {
  const store = useStore();
  const { theme } = useWs();
  const modals = useModals();
  const accent = theme.accent, soft = theme.soft;

  const dcl = store.clients.find((c) => c.id === store.selectedClientId);
  // Keep the editable name field local so a rename doesn't fight the input.
  const [name, setName] = useState(dcl?.name ?? '');
  useEffect(() => { setName(dcl?.name ?? ''); }, [dcl?.id, dcl?.name]);
  if (!dcl) return null;

  const set = (patch: Partial<typeof dcl>) => store.patchClient(dcl.id, patch);

  const cj = store.jobs.filter((j) => j.client === dcl.name);
  const totalDev = cj.reduce((a, b) => a + b.dev, 0);
  const totalHost = cj.reduce((a, b) => a + b.host, 0);
  const av = avatarColors(dcl.name);
  const derivedEmail = deriveEmail(dcl.contact, dcl.website);
  const lastContacted = dcl.lastContacted || '—';

  return (
    <div style={{ maxWidth: 1360, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <button onClick={() => store.goBack()} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}><Icon name="arrow-left" size={16} />Back</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 56, height: 56, borderRadius: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, background: av[0], color: av[1] }}>{initials(dcl.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            onFocus={(e) => { e.target.style.borderColor = accent; e.target.style.background = '#fff'; }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; const n = name.trim(); if (n && n !== dcl.name) set({ name: n }); else setName(dcl.name); }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', color: '#12222F', border: '1px solid transparent', borderRadius: 8, padding: '2px 8px', marginLeft: -8, background: 'transparent', outline: 'none', width: '100%', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, paddingLeft: 2 }}>
            <span style={clientTypeStyle(dcl.type, accent, soft)}>{dcl.type}</span>
            <span style={{ fontSize: 13, color: '#6B7C8C' }}>{dcl.region || '—'} · {dcl.website || '—'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7C8C' }}>Total development revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#0F2233', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{money(totalDev)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7C8C' }}>Annual hosting revenue</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: accent, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{money(totalHost)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 14, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '15px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 16 }}>Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 16px' }}>
            <div><div style={label}>Business type</div><div style={{ marginTop: 5 }}><SelectField value={dcl.businessType} options={BUSINESS_TYPE_OPTIONS} onSave={(v) => set({ businessType: v })} accent={accent} /></div></div>
            <div><div style={label}>Status</div><div style={{ marginTop: 5 }}><SelectField value={dcl.type} options={STATUS_OPTS} onSave={(v) => set({ type: v })} accent={accent} /></div></div>
            <div><div style={label}>Region</div><div style={{ marginTop: 5 }}><TextField value={dcl.region} onSave={(v) => set({ region: v })} accent={accent} placeholder="Region" /></div></div>
            <div><div style={label}>School roll</div><div style={{ marginTop: 5 }}><TextField value={dcl.roll} onSave={(v) => set({ roll: v })} accent={accent} placeholder="—" /></div></div>
            <div><div style={label}>Main contact</div><div style={{ marginTop: 5 }}><TextField value={dcl.contact === '—' ? '' : dcl.contact} onSave={(v) => set({ contact: v || '—' })} accent={accent} placeholder="Name" /></div></div>
            <div><div style={label}>Phone</div><div style={{ marginTop: 5 }}><TextField value={dcl.phone} onSave={(v) => set({ phone: v })} accent={accent} placeholder="—" /></div></div>
            <div><div style={label}>Website</div><div style={{ marginTop: 5 }}><TextField value={dcl.website} onSave={(v) => set({ website: v })} accent={accent} placeholder="domain.school.nz" /></div></div>
            <div><div style={label}>Email</div><div style={{ marginTop: 5 }}><TextField value={dcl.email} onSave={(v) => set({ email: v })} accent={accent} placeholder={derivedEmail !== '—' ? derivedEmail : 'name@domain'} /></div></div>
            <div style={{ gridColumn: '1 / -1' }}><div style={label}>Notes</div><div style={{ marginTop: 5 }}><AreaField value={dcl.notes} onSave={(v) => set({ notes: v })} accent={accent} placeholder="Add a note…" /></div></div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Contacts</div><span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{dcl.contacts.length}</span></div>
            <button onClick={() => modals.openAddContact(dcl.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: accent, cursor: 'pointer' }}><Icon name="user-plus" size={15} />Add contact</button>
          </div>
          {dcl.contacts.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr .95fr .8fr 36px', gap: '0 10px', padding: '11px 20px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}><span>Name</span><span>Email</span><span>Phone</span><span>Last</span><span></span></div>
              {dcl.contacts.map((ct) => (
                <div key={ct.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr .95fr .8fr 36px', gap: '0 10px', alignItems: 'center', padding: '10px 20px', borderTop: '1px solid #F1F4F7' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <TextField value={ct.name} onSave={(v) => store.patchContact(dcl.id, ct.id, { name: v })} accent={accent} placeholder="Name" cell />
                    <TextField value={ct.title === 'Contact' ? '' : ct.title} onSave={(v) => store.patchContact(dcl.id, ct.id, { title: v || 'Contact' })} accent={accent} placeholder="Title" cell />
                  </div>
                  <TextField value={ct.email === '—' ? '' : ct.email} onSave={(v) => store.patchContact(dcl.id, ct.id, { email: v || '—' })} accent={accent} placeholder="email@…" cell />
                  <TextField value={ct.phone === '—' ? '' : ct.phone} onSave={(v) => store.patchContact(dcl.id, ct.id, { phone: v || '—' })} accent={accent} placeholder="—" cell />
                  <div style={{ fontSize: 12, color: '#8695A2', whiteSpace: 'nowrap' }}>{lastContacted}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => store.removeContact(dcl.id, ct.id)} title="Remove contact" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={14} /></button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: 34, textAlign: 'center', color: '#9AA8B4' }}><Icon name="user-x" size={26} /><div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>No contacts yet</div></div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Client's jobs</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{cj.length} jobs</span>
            <button onClick={() => modals.openAddJob(dcl.name)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}><Icon name="plus" size={15} />Add job</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr .9fr .9fr .9fr 1fr', padding: '12px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
            <span>Job type</span><span>Status</span><span style={{ textAlign: 'right' }}>Dev rev</span><span style={{ textAlign: 'right' }}>Monthly</span><span style={{ textAlign: 'right' }}>Hosting</span><span style={{ textAlign: 'right' }}>Total</span>
          </div>
          {cj.map((j) => (
            <div key={j.id} onClick={() => store.openJob(j.id)} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr .9fr .9fr .9fr 1fr', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid #F1F4F7', cursor: 'pointer' }}>
              <div><span style={typeStyle(j.jobType)}>{j.jobType}</span></div>
              <div><span style={statusStyle(j.status)}>{j.status}</span></div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.dev ? money(j.dev) : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(Math.round(j.host / 12)) : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(j.host) : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{money(j.dev + j.host)}</div>
            </div>
          ))}
        </div></div>
      </div>
    </div>
  );
}
