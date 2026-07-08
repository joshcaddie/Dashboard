import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { money } from '../lib';

export function GoogleAdsView() {
  const store = useStore();
  const { theme, wsClients, wsJobs } = useWs();
  const accent = theme.accent;
  const [q, setQ] = useState('');

  // Clients with at least one active Google Ads job (jobs link by client name).
  const adClientNames = new Set(
    wsJobs.filter((j) => j.jobType === 'Google Ads' && j.status !== 'Cancelled').map((j) => j.client),
  );
  let list = wsClients.filter((c) => adClientNames.has(c.name));
  const s = q.trim().toLowerCase();
  if (s) list = list.filter((c) => c.name.toLowerCase().includes(s) || (c.region || '').toLowerCase().includes(s));
  list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const totalSpend = list.reduce((a, c) => a + (c.adSpend || 0), 0);
  const totalFee = list.reduce((a, c) => a + (c.mgmtFee || 0), 0);
  const cols = '1.9fr 1.1fr 1fr 1fr 1fr 40px';

  return (
    <div style={{ maxWidth: 1360 }}>
      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, color: '#98A6B3', pointerEvents: 'none' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" style={{ width: 260, padding: '9px 12px 9px 35px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F8FAFB' }} />
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{list.length} client{list.length === 1 ? '' : 's'} · {money(totalSpend)} spend · {money(totalFee)} fees</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', padding: '12px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Client</span><span>Region</span><span style={{ textAlign: 'right' }}>Monthly ad spend</span><span style={{ textAlign: 'right' }}>Management fee</span><span style={{ textAlign: 'right' }}>Monthly total</span><span></span>
            </div>
            {list.map((c) => (
              <div key={c.id} onClick={() => store.openAdsClient(c.id)} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 14px', alignItems: 'center', padding: '12px 24px', borderTop: '1px solid #F1F4F7', cursor: 'pointer' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: '#9AA8B4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.website || '—'}</div>
                </div>
                <div style={{ fontSize: 13, color: '#4B5D6C' }}>{c.region || '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{c.adSpend ? money(c.adSpend) : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{c.mgmtFee ? money(c.mgmtFee) : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{(c.adSpend || c.mgmtFee) ? money((c.adSpend || 0) + (c.mgmtFee || 0)) : '—'}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: '#C2CCD4' }}><Icon name="chevron-right" size={17} /></div>
              </div>
            ))}
            {list.length === 0 && (
              <div style={{ padding: 56, textAlign: 'center', color: '#9AA8B4' }}><Icon name="megaphone" size={24} /><div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No clients with active Google Ads jobs</div><div style={{ fontSize: 12.5, marginTop: 4 }}>Add a "Google Ads" job to a client to see them here.</div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
