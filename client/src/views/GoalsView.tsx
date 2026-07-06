import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { money, num } from '../lib';

export function GoalsView() {
  const store = useStore();
  const { theme, wsCfg } = useWs();
  const accent = theme.accent, soft = theme.soft;

  const groups = [
    { section: 'Recurring revenue targets', note: wsCfg.name + ' · annual recurring goals', money: true, defs: wsCfg.revenueDefs },
    { section: 'Client number targets', note: wsCfg.name + ' · numbers goals for the year', money: false, defs: wsCfg.countDefs },
  ];

  const cols = '1.3fr .9fr .9fr 1.1fr 1.5fr';

  return (
    <div style={{ maxWidth: 1020, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: soft, border: '1px solid #E6ECF1', borderRadius: 8, padding: '16px 20px' }}>
        <span style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: accent }}><Icon name="target" size={19} /></span>
        <div style={{ fontSize: 13, color: '#3B4E60', lineHeight: 1.5 }}>Set your annual targets below. Each goal feeds the progress bars on the <strong>Dashboard</strong> automatically.</div>
      </div>

      {groups.map((g) => {
        const isMoney = g.money;
        const fmt = (n: number) => (isMoney ? money(n) : num(n));
        return (
          <div key={g.section} style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>{g.section}</div>
              <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>{g.note}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 20px', padding: '9px 16px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Metric</span><span style={{ textAlign: 'right' }}>Start of year</span><span style={{ textAlign: 'right' }}>Current</span><span>Annual target</span><span>Progress this year</span>
            </div>
            {g.defs.map((d) => {
              const key = d.key;
              const raw = d.raw;
              const target = store.targets[key] || 0;
              const start = Math.round(raw * (0.80 + ((key.length * 7) % 10) / 100));
              const gained = Math.max(0, raw - start);
              const need = Math.max(0, target - start);
              const pct = need > 0 ? Math.min(100, Math.round((gained / need) * 100)) : (raw >= target ? 100 : 0);
              const barColor = pct >= 100 ? '#1B9E6E' : accent;
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 20px', alignItems: 'center', padding: '13px 22px', borderTop: '1px solid #F1F4F7' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{d.label}</div>
                  <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 600, color: '#94A2AE', fontVariantNumeric: 'tabular-nums' }}>{fmt(start)}</div>
                  <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: '#1B2E3D', fontVariantNumeric: 'tabular-nums' }}>{fmt(raw)}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #DDE4EA', borderRadius: 8, overflow: 'hidden', maxWidth: 170 }}>
                      {isMoney && <span style={{ padding: '9px 10px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: 13 }}>$</span>}
                      <input value={target} onChange={(e) => store.setTarget(key, parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} inputMode="numeric" style={{ flex: 1, padding: '9px 12px', border: 'none', fontSize: 14, outline: 'none', width: '100%', fontVariantNumeric: 'tabular-nums', color: '#1B2E3D' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingRight: 12 }}>
                    <div style={{ flex: 1, height: 7, borderRadius: 999, background: '#EEF2F5', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 999, transition: 'width .4s' }} /></div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#5A6B7A', width: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
