import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';

interface Jobless { id: number; name: string; region: string; type: string; contacts: number; lastContacted: string | null; }

export function CleanupSection() {
  const { user } = useAuth();
  const { theme, wsId, wsCfg } = useWs();
  const accent = theme.accent;
  const [list, setList] = useState<Jobless[] | null>(null);
  const [total, setTotal] = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (user?.role !== 'super_admin') return null;
  const isCombined = wsId === 'combined';
  const wsName = wsCfg.name;

  const find = async () => {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.get(`/clients/no-jobs?ws=${wsId}`);
      setList(r.jobless); setTotal(r.total);
      setChecked(new Set(r.jobless.map((c: Jobless) => c.id)));
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Could not load.' }); }
    finally { setBusy(false); }
  };

  const del = async () => {
    if (busy || !checked.size) return;
    if (!confirm(`Permanently delete ${checked.size} ${wsName} clients that have no job attached (and their contacts)? Jobs, leads and the other workspace are unaffected. This can't be undone.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/clients/bulk-delete', { ids: [...checked] });
      setMsg({ ok: true, text: `Deleted ${r.deleted} clients. Reloading…` });
      setTimeout(() => window.location.reload(), 1400);
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'Delete failed.' }); setBusy(false); }
  };

  const toggle = (id: number) => setChecked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const filtered = (list || []).filter((c) => !q.trim() || c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const shown = filtered.slice(0, 300);

  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;

  return (
    <div style={{ maxWidth: 1000, marginTop: 16 }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Remove clients without jobs — {isCombined ? 'select a workspace' : wsName}</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Clients with no job attached aren’t really clients. Review and delete them.</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {isCombined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 8, background: '#EEF3F7', border: '1px solid #DCE6EE', fontSize: 12.5, color: '#4B5D6C' }}>
              <Icon name="info" size={16} style={{ color: accent }} />Switch to a specific workspace to clean it up.
            </div>
          ) : list === null ? (
            <>
              {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35', marginBottom: 12 }}>{msg.text}</div>}
              <button onClick={find} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 17px', border: 'none', borderRadius: 8, background: busy ? '#9AA8B4' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
                <Icon name="search" size={16} />{busy ? 'Checking…' : 'Find clients with no jobs'}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5A6B7A' }}><strong>{list.length}</strong> of {total} clients have no job attached · {checked.size} selected</span>
                <div style={{ flex: 1 }} />
                {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35' }}>{msg.text}</span>}
                <button onClick={() => setChecked(new Set(list.map((c) => c.id)))} style={linkBtn}>Select all</button>
                <button onClick={() => setChecked(new Set())} style={linkBtn}>Clear</button>
                <button onClick={() => { setList(null); setChecked(new Set()); setQ(''); setMsg(null); }} style={{ ...linkBtn, color: '#8695A2' }}>Start over</button>
                <button onClick={del} disabled={busy || !checked.size} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: (busy || !checked.size) ? '#9AA8B4' : '#C22F35', color: '#fff', fontSize: 13, fontWeight: 700, cursor: (busy || !checked.size) ? 'default' : 'pointer' }}>
                  <Icon name="trash-2" size={15} />Delete {checked.size} client{checked.size === 1 ? '' : 's'}
                </button>
              </div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search these clients (to find any you want to keep)…" style={{ width: '100%', padding: '9px 12px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13, outline: 'none', background: '#F8FAFB', marginBottom: 10, boxSizing: 'border-box' }} />
              <div style={{ border: '1px solid #EEF2F5', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '34px 1.8fr 1fr .7fr 1fr', gap: '0 12px', padding: '9px 14px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
                  <span></span><span>Client</span><span>Region</span><span>Contacts</span><span>Last contacted</span>
                </div>
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {shown.map((c) => {
                    const on = checked.has(c.id);
                    return (
                      <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '34px 1.8fr 1fr .7fr 1fr', gap: '0 12px', padding: '8px 14px', borderTop: '1px solid #F1F4F7', alignItems: 'center', background: on ? '#FCF4F4' : '#fff' }}>
                        <input type="checkbox" checked={on} onChange={() => toggle(c.id)} style={{ cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        <span style={{ fontSize: 12.5, color: '#4B5D6C' }}>{c.region || '—'}</span>
                        <span style={{ fontSize: 12.5, color: c.contacts ? '#B07A17' : '#8695A2' }}>{c.contacts || '—'}</span>
                        <span style={{ fontSize: 12.5, color: c.lastContacted ? '#B07A17' : '#8695A2' }}>{c.lastContacted || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {filtered.length > shown.length && <div style={{ fontSize: 12, color: '#8695A2', marginTop: 8 }}>Showing {shown.length} of {filtered.length}. All selected clients are deleted, whether shown or not — search to find specific ones to keep.</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = { padding: '8px 12px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' };
