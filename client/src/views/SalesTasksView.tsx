import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { Icon } from '../components/Icon';
import { fmtDue, TODAY } from '../lib';

export function SalesTasksView() {
  const store = useStore();
  const { theme, wsSales } = useWs();
  const accent = theme.accent;
  const modals = useModals();

  const all = wsSales.flatMap((x) => x.tasks.map((tk) => ({ ...tk, school: x.name, region: x.region })));
  all.sort((a, b) => (a.due || '9999-99').localeCompare(b.due || '9999-99'));
  const rows = all.map((tk) => {
    const overdue = !!tk.due && !tk.done && new Date(tk.due + 'T00:00:00') < TODAY;
    return {
      ...tk, overdue, dueStr: fmtDue(tk.due),
      textColor: tk.done ? '#9AA8B4' : '#1B2E3D',
      dueColor: tk.done ? '#9AA8B4' : overdue ? '#C22F35' : '#4B5D6C',
    };
  });
  const openCount = rows.filter((t) => !t.done).length;
  const overdueCount = rows.filter((t) => t.overdue).length;
  const doneCount = rows.filter((t) => t.done).length;

  const chip = (dot: string, label: string, val: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 18px', background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: dot }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A6B7A' }}>{label}</span>
      <span style={{ fontSize: 19, fontWeight: 700, color: '#0F2233' }}>{val}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {chip(accent, 'Open', openCount)}
        {chip('#C22F35', 'Overdue', overdueCount)}
        {chip('#1B9E6E', 'Done', doneCount)}
      </div>
      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5', fontSize: 15, fontWeight: 700, color: '#12222F' }}>Tasks by due date</div>
        {rows.map((tk) => (
          <div key={tk.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderTop: '1px solid #F1F4F7' }}>
            <button onClick={() => store.toggleSaleTask(tk.saleId, tk.id, !tk.done)} style={{ width: 22, height: 22, borderRadius: 7, border: '2px solid #D3DBE2', background: '#fff', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              {tk.done && <Icon name="check" size={14} style={{ color: '#1B9E6E' }} />}
            </button>
            <div onClick={() => modals.openSalePanel(tk.saleId)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: tk.textColor }}>{tk.text}</div>
              <div style={{ fontSize: 12, color: '#94A2AE' }}>{tk.school}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: tk.dueColor }}>
              <Icon name="calendar" size={14} /><span>{tk.dueStr}</span>
              {tk.overdue && <span style={{ padding: '2px 8px', borderRadius: 999, background: '#FBE0E1', color: '#C22F35', fontSize: 10.5, fontWeight: 700 }}>Overdue</span>}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div style={{ padding: 56, textAlign: 'center', color: '#9AA8B4' }}><Icon name="check-check" size={24} /><div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No tasks yet — add one from a sale</div></div>
        )}
      </div>
    </div>
  );
}
