import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { money, num } from '../lib';
import { kpiValue } from '../kpi';

export function GoalsView() {
  const store = useStore();
  const { theme, wsCfg, wsJobs } = useWs();
  const accent = theme.accent, soft = theme.soft;
  // Local text for each goal input (the gain you want this year).
  const [gains, setGains] = useState<Record<string, string>>({});

  const groups = [
    { section: 'Recurring revenue goals', note: wsCfg.name + ' · what you want to gain this year', money: true, defs: wsCfg.revenueDefs },
    { section: 'Client number goals', note: wsCfg.name + ' · new numbers you want this year', money: false, defs: wsCfg.countDefs },
  ];

  const cols = '1.5fr 1fr 1.15fr 1.15fr';

  return (
    <div style={{ maxWidth: 1020, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: soft, border: '1px solid #E6ECF1', borderRadius: 8, padding: '16px 20px' }}>
        <span style={{ width: 38, height: 38, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: accent }}><Icon name="target" size={19} /></span>
        <div style={{ fontSize: 13, color: '#3B4E60', lineHeight: 1.5 }}>Enter <strong>what you want to gain this year</strong> for each metric — the projected year-end total (your current figure plus that goal) updates automatically and feeds the <strong>Dashboard</strong> progress bars.</div>
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
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 20px', padding: '9px 22px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Metric</span><span style={{ textAlign: 'right' }}>Current</span><span>Goal — gain this year</span><span style={{ textAlign: 'right' }}>Projected year-end</span>
            </div>
            {g.defs.map((d) => {
              const key = d.key;
              const current = Math.round(kpiValue(d, wsJobs));
              const storedEoy = store.targets[key] || 0;
              // Default the input to (target − current) so an existing target
              // reads as the gain still needed; once you type, we keep your text.
              const fallback = storedEoy > current ? String(storedEoy - current) : '';
              const gainText = gains[key] ?? fallback;
              const gain = parseFloat((gainText || '').replace(/[^0-9.]/g, '')) || 0;
              const projected = current + gain;
              const pct = projected > 0 ? Math.min(100, Math.round((current / projected) * 100)) : 0;
              const onGain = (v: string) => {
                setGains((s) => ({ ...s, [key]: v }));
                const gnum = parseFloat(v.replace(/[^0-9.]/g, '')) || 0;
                store.setTarget(key, Math.round(current + gnum));
              };
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 20px', alignItems: 'center', padding: '13px 22px', borderTop: '1px solid #F1F4F7' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{d.label}</div>
                  <div style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: '#1B2E3D', fontVariantNumeric: 'tabular-nums' }}>{fmt(current)}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #DDE4EA', borderRadius: 8, overflow: 'hidden', maxWidth: 180 }}>
                      {isMoney && <span style={{ padding: '9px 10px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: 13 }}>+$</span>}
                      {!isMoney && <span style={{ padding: '9px 10px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: 13 }}>+</span>}
                      <input value={gainText} onChange={(e) => onGain(e.target.value)} inputMode="numeric" placeholder="0" style={{ flex: 1, padding: '9px 12px', border: 'none', fontSize: 14, outline: 'none', width: '100%', fontVariantNumeric: 'tabular-nums', color: '#1B2E3D' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: gain > 0 ? accent : '#94A2AE', fontVariantNumeric: 'tabular-nums' }}>{fmt(projected)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                      <div style={{ width: 90, height: 6, borderRadius: 999, background: '#EEF2F5', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 999, transition: 'width .4s' }} /></div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8695A2', width: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                    </div>
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
