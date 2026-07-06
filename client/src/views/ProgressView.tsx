import { useWs } from '../derive';
import { money, typeStyle, statusStyle } from '../lib';

const IN_PROGRESS = ['Awaiting Brief', 'In Design', 'In Progress'];

export function ProgressView() {
  const { theme, wsJobs } = useWs();
  const rowPad = theme.rowPad;

  const cols = '2fr 1.1fr 1.1fr 1fr .9fr 1fr';
  const progressList = wsJobs.filter((j) => IN_PROGRESS.includes(j.status));
  const progressCount = progressList.length;
  const progressHostStr = money(progressList.reduce((a, b) => a + b.host, 0));

  return (
    <div style={{ maxWidth: 1360 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        {IN_PROGRESS.map((st) => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', background: '#fff', border: '1px solid #E6ECF1', borderRadius: 14, boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
            <span style={statusStyle(st)}>{st}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{progressList.filter((j) => j.status === st).length}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Work in progress</div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{progressCount} jobs · {progressHostStr} hosting</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 940 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, padding: '12px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Client</span><span>Job type</span><span>Status</span><span>Renews</span><span style={{ textAlign: 'right' }}>Monthly</span><span style={{ textAlign: 'right' }}>Hosting/yr</span>
            </div>
            {progressList.map((j) => (
              <div key={j.id} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', padding: `${rowPad} 24px`, borderTop: '1px solid #F1F4F7' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client}</div>
                  <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{j.region || '—'}</div>
                </div>
                <div><span style={typeStyle(j.jobType)}>{j.jobType}</span></div>
                <div><span style={statusStyle(j.status)}>{j.status}</span></div>
                <div style={{ fontSize: 13, color: '#4B5D6C' }}>{j.hostingMonth || '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(Math.round(j.host / 12)) + '/mo' : '—'}</div>
                <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(j.host) : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
