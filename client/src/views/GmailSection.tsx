import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';

interface GStatus { ws: string; configured: boolean; connected: boolean; email: string; connectedAt: string | null; }

const WS_NAME: Record<string, string> = { schoolwebsites: 'School Websites NZ', caddie: 'Caddie Digital' };

const BANNERS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: 'Gmail connected.' },
  denied: { ok: false, text: 'Gmail connection was cancelled.' },
  norefresh: { ok: false, text: 'Google didn’t return a refresh token — remove the app under your Google Account → Security → Third-party access, then try again.' },
  notconfigured: { ok: false, text: 'Google credentials aren’t set for that workspace yet.' },
  badstate: { ok: false, text: 'The connection link expired — please try again.' },
  error: { ok: false, text: 'Something went wrong connecting Gmail.' },
};

export function GmailSection() {
  const { user } = useAuth();
  const { theme } = useWs();
  const accent = theme.accent;
  const [rows, setRows] = useState<GStatus[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const isSuper = user?.role === 'super_admin';

  const load = () => api.get('/gmail/status').then((r) => setRows(r)).catch(() => {}).finally(() => setLoaded(true));

  useEffect(() => {
    if (!isSuper) return;
    // Surface the outcome of an OAuth redirect (?gmail=…) then clean the URL.
    const p = new URLSearchParams(window.location.search);
    const g = p.get('gmail');
    if (g && BANNERS[g]) setBanner(BANNERS[g]);
    if (g) window.history.replaceState({}, '', window.location.pathname);
    load();
  }, [isSuper]);

  if (!isSuper) return null;

  const connect = (ws: string) => { window.location.href = `/api/gmail/connect?ws=${ws}`; };
  const disconnect = async (ws: string) => {
    if (!confirm(`Disconnect Gmail for ${WS_NAME[ws] || ws}? Email history and Gmail sending will stop until you reconnect.`)) return;
    setBusy(ws);
    try { await api.post('/gmail/disconnect', { ws }); await load(); }
    finally { setBusy(''); }
  };

  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;

  return (
    <div style={{ maxWidth: 1000, marginTop: 16 }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Gmail connection</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Sync email history per client and send from your real mailbox</div>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {banner && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: banner.ok ? '#2E7D6B' : '#C22F35', padding: '2px 2px' }}>{banner.text}</div>
          )}
          {!loaded && <div style={{ fontSize: 13, color: '#8695A2' }}>Loading…</div>}
          {rows.map((r) => (
            <div key={r.ws} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: r.connected ? '#DEF3E7' : '#EEF2F5', color: r.connected ? '#1B7A45' : '#8695A2' }}>
                <Icon name="mail" size={17} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1B2E3D' }}>{WS_NAME[r.ws] || r.ws}</div>
                <div style={{ fontSize: 12, color: r.connected ? '#2E7D6B' : '#8695A2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.connected ? `Connected · ${r.email}` : r.configured ? `Not connected (${r.email})` : 'Google credentials not set'}
                </div>
              </div>
              {!r.configured ? (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#B7791F', background: '#FEF6E7', border: '1px solid #F5E3BE', borderRadius: 999, padding: '4px 10px' }}>Needs setup</span>
              ) : r.connected ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => connect(r.ws)} style={{ padding: '8px 13px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Reconnect</button>
                  <button onClick={() => disconnect(r.ws)} disabled={busy === r.ws} style={{ padding: '8px 13px', border: '1px solid #F1D3D5', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#C22F35', cursor: 'pointer' }}>{busy === r.ws ? '…' : 'Disconnect'}</button>
                </div>
              ) : (
                <button onClick={() => connect(r.ws)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                  <Icon name="mail" size={15} />Connect Gmail
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
