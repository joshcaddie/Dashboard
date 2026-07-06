import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { Icon } from '../components/Icon';
import { money, JOB_TYPE_OPTIONS, STATUS_OPTIONS, MONTH_OPTIONS } from '../lib';

const TAB_DEF = [
  { id: 'all', label: 'All jobs' },
  { id: 'website', label: 'Website' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'ads', label: 'Newsletter ads' },
  { id: 'apps', label: 'Custom apps' },
  { id: 'cancelled', label: 'Cancelled' },
];
const TAB_MAP: Record<string, string | null> = { all: null, website: 'Website', newsletter: 'Newsletter', ads: 'Newsletter ads', apps: 'Custom App', cancelled: '__cancelled' };

function matchTab(j: { jobType: string; status: string }, tab: string) {
  if (tab === 'all') return j.status !== 'Cancelled';
  if (tab === 'cancelled') return j.status === 'Cancelled';
  return j.jobType === TAB_MAP[tab] && j.status !== 'Cancelled';
}

const cellSelect = { width: '100%', padding: '6px 20px 6px 9px', border: '1px solid #E3E9EE', borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: '#fff', color: '#33475A', cursor: 'pointer', outline: 'none' } as const;

export function JobsView() {
  const store = useStore();
  const { theme, wsJobs } = useWs();
  const modals = useModals();
  const accent = theme.accent;
  const [tab, setTab] = useState('all');

  const cols = '1.7fr .9fr 1.1fr 1.1fr .8fr 1fr 1fr .9fr 44px';
  const q = store.jobSearch.trim().toLowerCase();
  let list = wsJobs.filter((j) => matchTab(j, tab));
  if (q) list = list.filter((j) => j.client.toLowerCase().includes(q) || j.jobType.toLowerCase().includes(q) || (j.region || '').toLowerCase().includes(q));
  const revenue = list.reduce((a, b) => a + b.dev + b.host, 0);

  return (
    <div style={{ maxWidth: 1360 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TAB_DEF.map((t) => {
          const active = tab === t.id;
          const count = wsJobs.filter((j) => matchTab(j, t.id)).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 11, border: `1px solid ${active ? 'transparent' : '#E3E9EE'}`, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: active ? accent : '#fff', color: active ? '#fff' : '#516474' }}>
              <span>{t.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: active ? 'rgba(255,255,255,.24)' : '#EFF3F6', color: active ? '#fff' : '#8695A2' }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, color: '#98A6B3', pointerEvents: 'none' }} />
            <input value={store.jobSearch} onChange={(e) => store.setJobSearch(e.target.value)} placeholder="Search jobs…" style={{ width: 260, padding: '9px 12px 9px 35px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F8FAFB' }} />
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{list.length} jobs · {money(revenue)}</span>
          <button onClick={modals.openAddJob} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Icon name="plus" size={16} />Add job</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1080 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 12px', padding: '14px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Client</span><span>Sales date</span><span>Type</span><span>Status</span><span style={{ textAlign: 'right' }}>Dev rev</span><span>Hosting</span><span>Renews</span><span style={{ textAlign: 'right' }}>Total</span><span></span>
            </div>
            {list.map((j) => (
              <div key={j.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 12px', alignItems: 'center', padding: '10px 24px', borderTop: '1px solid #F1F4F7' }}>
                <div onClick={() => store.openJob(j.id)} style={{ minWidth: 0, cursor: 'pointer' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client}</div>
                  <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{j.region || '—'}</div>
                </div>
                <div style={{ fontSize: 13, color: '#4B5D6C' }}>{j.salesDate}</div>
                <div><select value={j.jobType} onChange={(e) => store.patchJob(j.id, { jobType: e.target.value })} style={cellSelect}>{JOB_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><select value={j.status} onChange={(e) => store.patchJob(j.id, { status: e.target.value })} style={cellSelect}>{STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.dev ? money(j.dev) : '—'}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E3E9EE', borderRadius: 8, overflow: 'hidden' }}>
                    <span style={{ padding: '6px 6px', background: '#F4F7F9', color: '#7A8894', fontSize: 11.5, fontWeight: 700 }}>$</span>
                    <input value={j.host || ''} onChange={(e) => store.patchJob(j.id, { host: parseFloat(String(e.target.value).replace(/[^0-9.]/g, '')) || 0 })} inputMode="numeric" placeholder="0" style={{ width: '100%', border: 'none', padding: '6px 8px', fontSize: 12.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                  </div>
                </div>
                <div><select value={j.hostingMonth === '—' ? 'August' : j.hostingMonth} onChange={(e) => store.patchJob(j.id, { hostingMonth: e.target.value })} style={cellSelect}>{MONTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{money(j.dev + j.host)}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button title="Delete" onClick={() => store.deleteJob(j.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={15} /></button>
                </div>
              </div>
            ))}
            {list.length === 0 && (
              <div style={{ padding: 56, textAlign: 'center', color: '#9AA8B4' }}><Icon name="briefcase" size={24} /><div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No jobs here yet</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
