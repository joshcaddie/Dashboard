import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { fmtDue, TODAY } from '../lib';

export function SalePanel({ saleId, onClose }: { saleId: number; onClose: () => void }) {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent, soft = theme.soft;
  const sale = store.sales.find((s) => s.id === saleId);
  const [noteDraft, setNoteDraft] = useState('');
  const [taskText, setTaskText] = useState('');
  const [taskDue, setTaskDue] = useState('');

  if (!sale) return null;

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    await store.addSaleNote(saleId, noteDraft.trim());
    setNoteDraft('');
  };
  const addTask = async () => {
    if (!taskText.trim()) return;
    await store.addSaleTask(saleId, taskText.trim(), taskDue);
    setTaskText(''); setTaskDue('');
  };

  const focus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const blur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };
  const addBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 16px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 } as const;
  const draftInput = { flex: 1, padding: '11px 13px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 13.5, outline: 'none' } as const;

  return (
    <Modal
      title={sale.name}
      subtitle={`${sale.region} · ${sale.principal || '—'}`}
      onClose={onClose}
      maxWidth={560}
      footer={<button onClick={onClose} style={{ padding: '11px 20px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>}
    >
      <div style={{ padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '66vh', overflowY: 'auto' }}>
        {/* notes */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33475A', marginBottom: 8 }}>Notes</label>
          <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
            <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onFocus={focus} onBlur={blur} placeholder="Add a note…" style={draftInput} />
            <button onClick={addNote} style={addBtn}><Icon name="plus" size={16} />Add note</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sale.notes.map((n) => (
              <div key={n.id} style={{ padding: '12px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#94A2AE', marginBottom: 5 }}><Icon name="clock" size={12} />{n.ts}</div>
                <div style={{ fontSize: 13.5, color: '#33475A', lineHeight: 1.5 }}>{n.text}</div>
              </div>
            ))}
            {sale.notes.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#9AA8B4' }}>No notes yet — add one above.</div>}
          </div>
        </div>
        {/* tasks */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#33475A', marginBottom: 8 }}>Tasks &amp; follow-ups</label>
          <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
            <input value={taskText} onChange={(e) => setTaskText(e.target.value)} onFocus={focus} onBlur={blur} placeholder="e.g. Follow-up call" style={draftInput} />
            <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} onFocus={focus} onBlur={blur} style={{ width: 150, padding: '11px 12px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 13.5, outline: 'none', color: '#33475A' }} />
            <button onClick={addTask} style={addBtn}><Icon name="plus" size={16} />Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sale.tasks.map((tk) => {
              const overdue = !!tk.due && !tk.done && new Date(tk.due + 'T00:00:00') < TODAY;
              return (
                <div key={tk.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
                  <button onClick={() => store.toggleSaleTask(saleId, tk.id, !tk.done)} style={{ width: 22, height: 22, borderRadius: 7, border: '2px solid #D3DBE2', background: '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    {tk.done && <Icon name="check" size={14} style={{ color: '#1B9E6E' }} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{tk.text}</div>
                    {tk.due && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginTop: 2, color: tk.done ? '#9AA8B4' : overdue ? '#C22F35' : '#6B7C8C' }}>
                        <Icon name="calendar" size={13} />{fmtDue(tk.due)}
                        {overdue && <span style={{ padding: '1px 7px', borderRadius: 999, background: '#FBE0E1', color: '#C22F35', fontSize: 10, fontWeight: 700 }}>Overdue</span>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => store.deleteSaleTask(saleId, tk.id)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="trash-2" size={14} /></button>
                </div>
              );
            })}
            {sale.tasks.length === 0 && <div style={{ padding: 18, textAlign: 'center', fontSize: 13, color: '#9AA8B4' }}>No tasks yet — add a follow-up above.</div>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
