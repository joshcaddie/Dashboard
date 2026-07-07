import { useEffect, useState, type CSSProperties } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { money, JOB_TYPE_OPTIONS, STATUS_OPTIONS, MONTH_OPTIONS } from '../lib';

const fieldBase: CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #E3E9EE', borderRadius: 7, fontSize: 14, color: '#33475A', outline: 'none', background: '#fff', fontFamily: 'inherit' };
const focusRing = (accent: string) => ({
  onFocus: (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}22`; },
  onBlur: (e: any) => { e.target.style.borderColor = '#E3E9EE'; e.target.style.boxShadow = 'none'; },
});

function TextField({ value, onSave, accent, placeholder }: { value: string; onSave: (v: string) => void; accent: string; placeholder?: string }) {
  const [v, setV] = useState(value ?? '');
  useEffect(() => { if (v !== value) setV(value ?? ''); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} {...focusRing(accent)}
    onBlur={(e) => { focusRing(accent).onBlur(e); if ((v ?? '') !== (value ?? '')) onSave(v.trim()); }}
    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} style={fieldBase} />;
}

function SelectField({ value, options, onSave, accent }: { value: string; options: string[]; onSave: (v: string) => void; accent: string }) {
  const opts = value && !options.includes(value) ? [value, ...options] : options;
  return <select value={value} onChange={(e) => onSave(e.target.value)} {...focusRing(accent)} style={{ ...fieldBase, cursor: 'pointer' }}>
    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>;
}

// Money input; commits the numeric value on change (kept live for the totals).
function MoneyField({ value, onSave, accent, big }: { value: number; onSave: (n: number) => void; accent: string; big?: boolean }) {
  const [v, setV] = useState(String(value || ''));
  useEffect(() => { if ((parseFloat(v) || 0) !== value) setV(value ? String(value) : ''); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E3E9EE', borderRadius: 8, overflow: 'hidden' }}>
      <span style={{ padding: big ? '10px 11px' : '8px 10px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: big ? 16 : 13 }}>$</span>
      <input value={v} inputMode="numeric" placeholder="0"
        onChange={(e) => { setV(e.target.value); onSave(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0); }}
        onFocus={(e) => { (e.target.parentElement as HTMLElement).style.borderColor = accent; (e.target.parentElement as HTMLElement).style.boxShadow = `0 0 0 3px ${accent}22`; }}
        onBlur={(e) => { (e.target.parentElement as HTMLElement).style.borderColor = '#E3E9EE'; (e.target.parentElement as HTMLElement).style.boxShadow = 'none'; }}
        style={{ flex: 1, padding: big ? '10px 12px' : '8px 10px', border: 'none', fontSize: big ? 20 : 14, fontWeight: big ? 700 : 400, outline: 'none', width: '100%', color: '#0F2233', fontVariantNumeric: 'tabular-nums' }} />
    </div>
  );
}

const label = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA8B4' } as const;
const cardBox: CSSProperties = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '13px 15px' };

export function JobDetailView() {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent;

  const djb = store.jobs.find((j) => j.id === store.selectedJobId);
  if (!djb) return null;
  const set = (patch: Partial<typeof djb>) => store.patchJob(djb.id, patch);

  return (
    <div style={{ maxWidth: 1020, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <button onClick={() => store.goBack()} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}><Icon name="arrow-left" size={16} />Back</button>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '17px 20px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em', color: '#12222F' }}>{djb.client}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 150 }}><SelectField value={djb.jobType} options={JOB_TYPE_OPTIONS} onSave={(v) => set({ jobType: v })} accent={accent} /></div>
              <div style={{ minWidth: 140 }}><SelectField value={djb.status} options={STATUS_OPTIONS} onSave={(v) => set({ status: v })} accent={accent} /></div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8695A2' }}>Total job revenue</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{money(djb.dev + djb.host)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <div style={cardBox}><div style={label}>Development revenue</div><div style={{ marginTop: 8 }}><MoneyField value={djb.dev} onSave={(n) => set({ dev: n })} accent={accent} big /></div></div>
        <div style={cardBox}><div style={label}>Annual hosting</div><div style={{ marginTop: 8 }}><MoneyField value={djb.host} onSave={(n) => set({ host: n })} accent={accent} big /></div></div>
        <div style={cardBox}><div style={label}>Monthly hosting</div><div style={{ marginTop: 8 }}><MoneyField value={Math.round(djb.host / 12)} onSave={(n) => set({ host: Math.round(n * 12) })} accent={accent} big /></div></div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '15px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 16 }}>Job details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', maxWidth: 620 }}>
          <div><div style={label}>Hosting renews</div><div style={{ marginTop: 6 }}><SelectField value={djb.hostingMonth && djb.hostingMonth !== '—' ? djb.hostingMonth : 'August'} options={MONTH_OPTIONS} onSave={(v) => set({ hostingMonth: v })} accent={accent} /></div></div>
          <div><div style={label}>Sales date</div><div style={{ marginTop: 6 }}><TextField value={djb.salesDate} onSave={(v) => set({ salesDate: v })} accent={accent} placeholder="e.g. Jul 6, 2026" /></div></div>
          <div><div style={label}>Region</div><div style={{ marginTop: 6 }}><TextField value={djb.region} onSave={(v) => set({ region: v })} accent={accent} placeholder="Region" /></div></div>
        </div>
      </div>
    </div>
  );
}
