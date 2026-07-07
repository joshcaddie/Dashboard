import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { clientEmailContext } from '../emailCtx';
import { api } from '../api';
import { Icon } from '../components/Icon';
import { initials, avatarColors } from '../lib';

export function ClientsView() {
  const store = useStore();
  const { theme, wsClients, wsId } = useWs();
  const modals = useModals();
  const accent = theme.accent, soft = theme.soft;

  // Show a "sync last-contacted from Gmail" action when this workspace's mailbox
  // is connected.
  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  useEffect(() => {
    if (wsId === 'combined') { setGmailConnected(false); return; }
    let alive = true;
    api.get('/gmail/status')
      .then((rows) => { if (alive) setGmailConnected(!!(rows || []).find((r: any) => r.ws === wsId && r.connected)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [wsId]);

  const syncContacted = async () => {
    if (syncing) return;
    setSyncing(true); setSyncMsg('');
    try {
      const r = await api.post('/gmail/sync-contacted', { ws: wsId });
      setSyncMsg(`Updated ${r.updated} from ${r.scanned} sent emails. Reloading…`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      setSyncMsg(e?.message || 'Sync failed.');
      setSyncing(false);
    }
  };

  const q = store.clientSearch.trim().toLowerCase();
  let list = wsClients;
  if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.contact || '').toLowerCase().includes(q));

  const cols = '2.2fr 1.3fr .9fr .55fr 1fr 122px';
  const iconBtn = { width: 32, height: 32, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

  return (
    <div style={{ maxWidth: 1360, background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #EEF2F5', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 12, color: '#98A6B3', pointerEvents: 'none' }} />
          <input value={store.clientSearch} onChange={(e) => store.setClientSearch(e.target.value)} placeholder="Search clients…" style={{ width: 260, padding: '9px 12px 9px 35px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F8FAFB' }} />
        </div>
        <div style={{ flex: 1 }} />
        {syncMsg && <span style={{ fontSize: 12, fontWeight: 600, color: '#2E7D6B' }}>{syncMsg}</span>}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{list.length} clients</span>
        {gmailConnected && (
          <button onClick={syncContacted} disabled={syncing} title="Update ‘last contacted’ from your Gmail Sent folder" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.7 : 1 }}>
            <Icon name="refresh-cw" size={15} />{syncing ? 'Syncing…' : 'Update from Gmail'}
          </button>
        )}
        <button onClick={modals.openAddClient} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Icon name="plus" size={16} />Add client</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 16px', padding: '14px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#93A1AD' }}>
        <span>Client</span><span>Contact</span><span>Region</span><span style={{ textAlign: 'right' }}>Roll</span><span>Last contacted</span><span></span>
      </div>

      {list.map((c) => {
        const av = avatarColors(c.name);
        const last = c.lastContacted || '—';
        return (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 16px', alignItems: 'center', padding: `${theme.rowPad} 24px`, borderTop: '1px solid #F1F4F7' }}>
            <div onClick={() => store.openClient(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, cursor: 'pointer' }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: av[0], color: av[1] }}>{initials(c.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{c.website || '—'}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#4B5D6C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contact || '—'}</div>
            <div style={{ fontSize: 13, color: '#4B5D6C' }}>{c.region}</div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{c.roll}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4B5D6C' }}><Icon name="clock" size={13} style={{ color: '#B6C1CB' }} />{last}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button title="Email history" onClick={() => store.openClientEmails(c.id)} style={{ ...iconBtn, color: '#8695A2' }}><Icon name="list" size={15} /></button>
              <button title="Send email" onClick={() => modals.openEmail(clientEmailContext(c))} style={{ ...iconBtn, color: '#8695A2' }}><Icon name="mail" size={15} /></button>
              <button title="Delete" onClick={() => store.deleteClient(c.id)} style={{ ...iconBtn, color: '#B6C1CB' }}><Icon name="trash-2" size={15} /></button>
            </div>
          </div>
        );
      })}

      {list.length === 0 && (
        <div style={{ padding: 56, textAlign: 'center', color: '#9AA8B4' }}>
          <Icon name="users" size={24} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>No clients match your search</div>
        </div>
      )}
    </div>
  );
}
