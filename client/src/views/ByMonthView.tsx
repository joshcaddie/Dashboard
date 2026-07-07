import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { money, JOB_TYPE_OPTIONS, STATUS_OPTIONS, MONTH_OPTIONS } from '../lib';

const cellSelect = { width: '100%', padding: '6px 20px 6px 9px', border: '1px solid #E3E9EE', borderRadius: 8, fontSize: 12, fontWeight: 600, backgroundColor: '#fff', color: '#33475A', cursor: 'pointer', outline: 'none' } as const;

const monthsOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', '—'];

export function ByMonthView() {
  const store = useStore();
  const { theme, wsJobs } = useWs();
  const accent = theme.accent;
  const [byMonthFilter, setByMonthFilter] = useState('All');
  const [byMonthSearch, setByMonthSearch] = useState('');

  const cols = '1.8fr 1.05fr 1.05fr 1fr .95fr .95fr';
  const activeJobs = wsJobs.filter((j) => j.status !== 'Cancelled');
  const bmMonthsPresent = monthsOrder.filter((mn) => activeJobs.some((j) => (j.hostingMonth || '—') === mn));
  const tabs = ['All', ...bmMonthsPresent];

  let bmJobs = byMonthFilter === 'All' ? activeJobs : activeJobs.filter((j) => (j.hostingMonth || '—') === byMonthFilter);
  const bmq = byMonthSearch.trim().toLowerCase();
  if (bmq) bmJobs = bmJobs.filter((j) => j.client.toLowerCase().includes(bmq) || j.jobType.toLowerCase().includes(bmq) || (j.region || '').toLowerCase().includes(bmq));

  const byMonthCount = bmJobs.length;
  const byMonthTotalStr = money(bmJobs.reduce((a, b) => a + b.host, 0));

  return (
    <div style={{ maxWidth: 1360 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {tabs.map((mn) => {
          const active = byMonthFilter === mn;
          const label = mn === 'All' ? 'All months' : mn === '—' ? 'No month' : mn;
          const count = mn === 'All' ? activeJobs.length : activeJobs.filter((j) => (j.hostingMonth || '—') === mn).length;
          return (
            <button key={mn} onClick={() => setByMonthFilter(mn)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 10, border: `1px solid ${active ? 'transparent' : '#E3E9EE'}`, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, background: active ? accent : '#fff', color: active ? '#fff' : '#516474' }}>
              <span>{label}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: active ? 'rgba(255,255,255,.24)' : '#EFF3F6', color: active ? '#fff' : '#8695A2' }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 16px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, color: '#98A6B3', pointerEvents: 'none' }} />
            <input value={byMonthSearch} onChange={(e) => setByMonthSearch(e.target.value)} placeholder="Search jobs…" style={{ width: 260, padding: '9px 12px 9px 35px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F8FAFB' }} />
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{byMonthCount} jobs · {byMonthTotalStr} hosting</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 940 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', padding: '12px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Client</span><span>Job type</span><span>Status</span><span>Renews</span><span>Monthly hosting</span><span style={{ textAlign: 'right' }}>Annual hosting</span>
            </div>
            {bmJobs.map((j) => (
              <div key={j.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', alignItems: 'center', padding: '9px 24px', borderTop: '1px solid #F1F4F7' }}>
                <div onClick={() => store.openJob(j.id)} style={{ minWidth: 0, cursor: 'pointer' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client}</div>
                  <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{j.region || '—'}</div>
                </div>
                <div><select value={j.jobType} onChange={(e) => store.patchJob(j.id, { jobType: e.target.value })} style={cellSelect}>{JOB_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><select value={j.status} onChange={(e) => store.patchJob(j.id, { status: e.target.value })} style={cellSelect}>{STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div><select value={j.hostingMonth && j.hostingMonth !== '—' ? j.hostingMonth : 'August'} onChange={(e) => store.patchJob(j.id, { hostingMonth: e.target.value })} style={cellSelect}>{MONTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E3E9EE', borderRadius: 8, overflow: 'hidden' }}>
                    <span style={{ padding: '6px 6px', background: '#F4F7F9', color: '#7A8894', fontSize: 11.5, fontWeight: 700 }}>$</span>
                    <input value={j.host ? Math.round(j.host / 12) : ''} onChange={(e) => store.patchJob(j.id, { host: Math.round((parseFloat(String(e.target.value).replace(/[^0-9.]/g, '')) || 0) * 12) })} inputMode="numeric" placeholder="0" style={{ width: '100%', border: 'none', padding: '6px 8px', fontSize: 12.5, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(j.host) : '—'}</div>
              </div>
            ))}
            {bmJobs.length === 0 && (
              <div style={{ padding: 56, textAlign: 'center', color: '#9AA8B4' }}><Icon name="calendar-x" size={24} /><div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No jobs for this month</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
