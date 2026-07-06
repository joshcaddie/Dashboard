import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { Icon } from './Icon';

export function Topbar({ title, subtitle }: { title: string; subtitle: string }) {
  const store = useStore();
  const { theme } = useWs();
  const modals = useModals();

  const primaryLabel = store.view === 'clients' ? 'Add client' : 'Add job';
  const onPrimary = () => {
    if (store.view === 'jobs') modals.openAddJob();
    else if (store.view === 'clients') modals.openAddClient();
    else { store.goto('jobs'); setTimeout(() => modals.openAddJob(), 0); }
  };

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 20, background: 'rgba(238,242,245,.82)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E2E8EE', padding: '12px 26px', display: 'flex', alignItems: 'center', gap: 15,
      }}
    >
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.025em', color: '#12222F' }}>{title}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: '#6B7C8C', marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Icon name="search" size={16} style={{ position: 'absolute', left: 13, color: '#94A3AE', pointerEvents: 'none' }} />
        <input
          value={store.view === 'clients' ? store.clientSearch : store.view === 'jobs' ? store.jobSearch : ''}
          onChange={(e) => store.onGlobalSearch(e.target.value)}
          placeholder="Search clients, jobs…"
          style={{ width: 280, padding: '10px 14px 10px 38px', border: '1px solid #DEE5EB', borderRadius: 8, background: '#fff', fontSize: 13.5, color: '#12222F', outline: 'none' }}
        />
      </div>
      <button
        onClick={onPrimary}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: 'none', borderRadius: 8, background: theme.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15,30,44,.14)' }}
      >
        <Icon name="plus" size={15} />
        <span>{primaryLabel}</span>
      </button>
    </header>
  );
}
