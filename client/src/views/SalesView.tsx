import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { saleEmailContext } from '../emailCtx';
import { Icon } from '../components/Icon';
import { num, categoryStyle, stageStyle, SALE_STAGES } from '../lib';

const SALE_CATS = ['All', 'Primary', 'Intermediate', 'Secondary', 'Composite / Area', 'Specialist / Other'];
const STAT_STAGES = ['New', 'Contacted', 'Interested', 'Proposal', 'Won'];

export function SalesView() {
  const store = useStore();
  const { theme, wsSales, wsId } = useWs();
  const modals = useModals();
  const accent = theme.accent, soft = theme.soft;
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');

  const showRoll = wsId !== 'caddie';
  const contactLabel = wsId === 'caddie' ? 'Contact' : 'Principal';
  const cols = showRoll ? '2fr 1.1fr 1fr .55fr 1.1fr 1fr 1fr 1.7fr' : '2fr 1.1fr 1fr 1.1fr 1fr 1fr 1.7fr';

  let list = wsSales.filter((x) => tab === 'All' || x.category === tab);
  const q = search.trim().toLowerCase();
  if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || (x.principal || '').toLowerCase().includes(q) || (x.town || '').toLowerCase().includes(q) || (x.region || '').toLowerCase().includes(q));

  const iconBtn = { width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', cursor: 'pointer' } as const;

  return (
    <div style={{ maxWidth: 1360 }}>
      {/* stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        {STAT_STAGES.map((st) => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 13px', background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
            <span style={stageStyle(st)}>{st}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{wsSales.filter((x) => x.stage === st).length}</span>
          </div>
        ))}
      </div>

      {/* category tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {SALE_CATS.map((c) => {
          const active = tab === c;
          const count = c === 'All' ? wsSales.length : wsSales.filter((x) => x.category === c).length;
          return (
            <button key={c} onClick={() => setTab(c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 11, border: `1px solid ${active ? 'transparent' : '#E3E9EE'}`, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: active ? accent : '#fff', color: active ? '#fff' : '#516474' }}>
              <span>{c}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: active ? 'rgba(255,255,255,.24)' : '#EFF3F6', color: active ? '#fff' : '#8695A2' }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 16px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 12, color: '#98A6B3', pointerEvents: 'none' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search school, principal, town…" style={{ width: 300, padding: '9px 12px 9px 35px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F8FAFB' }} />
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{list.length} schools</span>
          <button onClick={modals.openAddLead} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Icon name="plus" size={16} />Add lead</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 1320 }}>
            <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 18px', padding: '12px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>School</span><span>Category</span><span>Region</span>{showRoll && <span style={{ textAlign: 'right' }}>Roll</span>}<span>{contactLabel}</span><span>Last contacted</span><span>Stage</span><span></span>
            </div>
            {list.map((x) => {
              const openT = x.tasks.filter((t) => !t.done).length;
              const emailNote = x.notes.find((n) => /^✉/.test(n.text || ''));
              const lastStr = emailNote ? emailNote.ts.split(' · ')[0] : '—';
              const isWon = x.stage === 'Won';
              return (
                <div key={x.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 18px', alignItems: 'center', padding: '9px 24px', borderTop: '1px solid #F1F4F7' }}>
                  <div onClick={() => modals.openSalePanel(x.id)} style={{ minWidth: 0, cursor: 'pointer' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                    <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{x.town}</div>
                  </div>
                  <div><span style={categoryStyle(x.category)}>{x.category}</span></div>
                  <div style={{ fontSize: 13, color: '#4B5D6C' }}>{x.region}</div>
                  {showRoll && <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{num(x.roll || 0)}</div>}
                  <div style={{ fontSize: 13, color: '#4B5D6C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.principal || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4B5D6C' }}><Icon name="clock" size={13} style={{ color: '#B6C1CB' }} />{lastStr}</div>
                  <div>
                    <select value={x.stage} onChange={(e) => store.setSaleStage(x.id, e.target.value)} style={{ width: '100%', maxWidth: 130, padding: '7px 26px 7px 11px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 12.5, fontWeight: 600, outline: 'none', backgroundColor: '#fff', color: '#33475A', cursor: 'pointer' }}>
                      {SALE_STAGES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '34px 34px 34px 118px', gap: 8, alignItems: 'center', justifyContent: 'end' }}>
                    <button title="Email history" onClick={() => store.openSaleEmails(x.id)} style={{ ...iconBtn, color: '#4B5D6C' }}><Icon name="list" size={16} /></button>
                    <button title="Send email" onClick={() => modals.openEmail(saleEmailContext(x))} style={{ ...iconBtn, color: accent }}><Icon name="mail" size={16} /></button>
                    <button title="Notes & tasks" onClick={() => modals.openSalePanel(x.id)} style={{ ...iconBtn, position: 'relative', color: '#4B5D6C' }}>
                      <Icon name="notebook-pen" size={16} />
                      {openT > 0 && <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: accent, color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>{openT}</span>}
                    </button>
                    {isWon ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 0', borderRadius: 8, background: '#DEF3E7', color: '#1B7A45', fontSize: 12.5, fontWeight: 700 }}><Icon name="check-circle-2" size={15} />Client</span>
                    ) : (
                      <button onClick={() => modals.openConvert(x.id)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px 0', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}><Icon name="user-plus" size={15} />Convert</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
