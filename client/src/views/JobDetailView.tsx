import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { money, typeStyle, statusStyle } from '../lib';

export function JobDetailView() {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent;

  const djb = store.jobs.find((j) => j.id === store.selectedJobId);
  if (!djb) return null;

  const label = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA8B4' } as const;

  return (
    <div style={{ maxWidth: 1020, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <button onClick={() => store.goBack()} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}><Icon name="arrow-left" size={16} />Back</button>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '17px 20px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.025em', color: '#12222F' }}>{djb.client}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={typeStyle(djb.jobType)}>{djb.jobType}</span>
              <span style={statusStyle(djb.status)}>{djb.status}</span>
              <span style={{ fontSize: 13, color: '#6B7C8C' }}>{djb.region || '—'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8695A2' }}>Total job revenue</div>
            <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 28, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{money(djb.dev + djb.host)}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '13px 15px' }}><div style={label}>Development revenue</div><div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#0F2233', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{money(djb.dev)}</div></div>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '13px 15px' }}><div style={label}>Annual hosting</div><div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#0F2233', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{money(djb.host)}</div></div>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '13px 15px' }}><div style={label}>Monthly hosting</div><div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 22, fontWeight: 700, color: '#0F2233', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{money(Math.round(djb.host / 12))}</div></div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '15px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 16 }}>Job details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
          <div><div style={label}>Hosting month</div><div style={{ marginTop: 6 }}><span style={typeStyle(djb.hostingMonth)}>{djb.hostingMonth || '—'}</span></div></div>
          <div><div style={label}>Sales date</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>{djb.salesDate}</div></div>
          <div><div style={label}>Region</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>{djb.region || '—'}</div></div>
          <div style={{ gridColumn: '1 / -1' }}><div style={label}>Description</div><div style={{ fontSize: 13.5, color: '#5A6B7A', marginTop: 4, lineHeight: 1.5 }}>No description recorded yet.</div></div>
        </div>
      </div>
    </div>
  );
}
