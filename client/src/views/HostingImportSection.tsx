import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import type { Client } from '../types';

interface HProposal {
  idx: number; name: string; url: string;
  websiteHost: string; domainHost: string; domainUser: string; hasPass: boolean;
  status: 'match' | 'nomatch'; clientId: number | null; clientName: string | null;
}

function rankClients(clients: Client[], q: string): Client[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return clients
    .map((c) => ({ c, hay: (c.name + ' ' + (c.website || '')).toLowerCase(), nm: c.name.toLowerCase() }))
    .filter((x) => x.hay.includes(s))
    .sort((a, b) => (a.nm.startsWith(s) ? 0 : 1) - (b.nm.startsWith(s) ? 0 : 1) || a.nm.localeCompare(b.nm))
    .slice(0, 7)
    .map((x) => x.c);
}

function ClientPicker({ clients, accent, onPick, onCancel }: { clients: Client[]; accent: string; onPick: (c: Client) => void; onCancel: () => void }) {
  const [q, setQ] = useState('');
  const results = rankClients(clients, q);
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client…"
          onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
          style={{ flex: 1, minWidth: 0, padding: '6px 9px', border: `1px solid ${accent}`, borderRadius: 7, fontSize: 12.5, outline: 'none', boxShadow: `0 0 0 3px ${accent}22` }} />
        <button onClick={onCancel} style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 6, border: '1px solid #E1E8ED', background: '#fff', color: '#8695A2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={14} /></button>
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: 5, border: '1px solid #E6ECF1', borderRadius: 8, background: '#fff', boxShadow: '0 6px 16px -6px rgba(15,30,44,.28)', overflow: 'hidden' }}>
          {results.map((c) => (
            <div key={c.id} onClick={() => onPick(c)}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F8FA')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
              style={{ padding: '7px 10px', cursor: 'pointer' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
              {c.website && <div style={{ fontSize: 11, color: '#9AA8B4' }}>{c.website}</div>}
            </div>
          ))}
        </div>
      )}
      {q.trim() && results.length === 0 && <div style={{ marginTop: 5, fontSize: 12, color: '#9AA8B4' }}>No clients found</div>}
    </div>
  );
}

export function HostingImportSection() {
  const { user } = useAuth();
  const { theme, wsId, wsClients } = useWs();
  const accent = theme.accent;
  const [file, setFile] = useState<File | null>(null);
  const [csv, setCsv] = useState('');
  const [proposals, setProposals] = useState<HProposal[] | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (user?.role !== 'super_admin') return null;

  const cols = '32px 1.5fr 1.5fr 1fr 1.4fr';
  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;

  const run = async () => {
    if (!file || busy) return;
    setBusy(true); setMsg(null);
    try {
      const text = await file.text();
      setCsv(text);
      const r = await api.post('/import/hosting-match', { csv: text });
      const props: HProposal[] = r.proposals || [];
      setProposals(props);
      setChecked(new Set(props.filter((p) => p.status === 'match').map((p) => p.idx)));
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Could not read the file.' });
    } finally { setBusy(false); }
  };

  const toggle = (idx: number) => setChecked((s) => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  const assign = (idx: number, c: Client) => {
    setProposals((ps) => (ps || []).map((p) => (p.idx === idx ? { ...p, status: 'match', clientId: c.id, clientName: c.name } : p)));
    setChecked((s) => new Set(s).add(idx));
    setPickerFor(null);
  };
  const matchable = (proposals || []).filter((p) => p.status === 'match' && p.clientId);
  const allChecked = matchable.length > 0 && matchable.every((p) => checked.has(p.idx));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(matchable.map((p) => p.idx)));

  const apply = async () => {
    if (busy || !proposals) return;
    const items = proposals.filter((p) => p.clientId && checked.has(p.idx)).map((p) => ({ idx: p.idx, clientId: p.clientId }));
    if (!items.length) { setMsg({ ok: false, text: 'Nothing selected.' }); return; }
    if (!confirm(`Apply hosting/domain info to ${items.length} Caddie client${items.length === 1 ? '' : 's'}? Sensitive values are encrypted.`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/import/hosting-apply', { csv, items });
      setMsg({ ok: true, text: `Updated ${r.updated} client${r.updated === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} skipped)` : ''}. Reloading…` });
      setTimeout(() => window.location.reload(), 1400);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Failed to apply.' });
      setBusy(false);
    }
  };

  const reset = () => { setProposals(null); setChecked(new Set()); setFile(null); setCsv(''); setMsg(null); };

  const counts = {
    match: (proposals || []).filter((p) => p.status === 'match').length,
    nomatch: (proposals || []).filter((p) => p.status === 'nomatch').length,
  };

  return (
    <div style={{ maxWidth: 1000, marginTop: 16 }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Import hosting &amp; domain audit — Caddie Digital</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Upload the hosting CSV; approve the matched client for each row to fill in website host, domain host, and login. Sensitive values are encrypted at rest.</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {wsId !== 'caddie' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 8, background: '#EEF3F7', border: '1px solid #DCE6EE', fontSize: 12.5, color: '#4B5D6C' }}>
              <Icon name="info" size={16} style={{ color: accent }} />Switch to the <strong>&nbsp;Caddie Digital&nbsp;</strong> workspace to run this import.
            </div>
          ) : !proposals ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
                <Icon name="file-spreadsheet" size={18} style={{ color: accent }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1B2E3D' }}>Hosting audit CSV</div>
                  <div style={{ fontSize: 12, color: '#8695A2' }}>{file ? file.name : 'Client, Live domain, Host, Domain info, Username, Password'}</div>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>
                  {file ? 'Change' : 'Choose'}
                  <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setMsg(null); }} style={{ display: 'none' }} />
                </label>
              </div>
              {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35', marginTop: 12 }}>{msg.text}</div>}
              <button onClick={run} disabled={!file || busy} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 17px', border: 'none', borderRadius: 8, background: (!file || busy) ? '#9AA8B4' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (!file || busy) ? 'default' : 'pointer' }}>
                <Icon name="wand-sparkles" size={16} />{busy ? 'Matching…' : 'Match to clients'}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5A6B7A' }}>{counts.match} matched · {counts.nomatch} no match</span>
                <div style={{ flex: 1 }} />
                {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35' }}>{msg.text}</span>}
                <button onClick={reset} style={{ padding: '8px 13px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Start over</button>
                <button onClick={apply} disabled={busy || checked.size === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: (busy || checked.size === 0) ? '#9AA8B4' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (busy || checked.size === 0) ? 'default' : 'pointer' }}>
                  <Icon name="save" size={15} />Apply to {checked.size} client{checked.size === 1 ? '' : 's'}
                </button>
              </div>
              <div style={{ border: '1px solid #EEF2F5', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 12px', padding: '9px 14px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD', alignItems: 'center' }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  <span>Row (name · URL)</span><span>Website / domain host</span><span>Login</span><span>Matched client</span>
                </div>
                <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                  {proposals.map((p) => {
                    const on = checked.has(p.idx);
                    const can = !!p.clientId;
                    const picking = pickerFor === p.idx;
                    return (
                      <div key={p.idx} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 12px', padding: '9px 14px', borderTop: '1px solid #F1F4F7', alignItems: picking ? 'start' : 'center', background: can && on ? '#F7FBF9' : '#fff' }}>
                        <input type="checkbox" disabled={!can} checked={on && can} onChange={() => toggle(p.idx)} style={{ marginTop: picking ? 6 : 0, cursor: can ? 'pointer' : 'default' }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#9AA8B4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.url || '—'}</div>
                        </div>
                        <div style={{ minWidth: 0, fontSize: 12, color: '#4B5D6C' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.websiteHost || '—'}</div>
                          <div style={{ fontSize: 11, color: '#9AA8B4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.domainHost || '—'}</div>
                        </div>
                        <div style={{ minWidth: 0, fontSize: 12, color: '#4B5D6C', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.domainUser || '—'}</span>
                          {p.hasPass && <span title="Value present" style={{ width: 5, height: 5, borderRadius: 999, background: '#B6C1CB', flexShrink: 0 }} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          {picking ? <ClientPicker clients={wsClients} accent={accent} onPick={(c) => assign(p.idx, c)} onCancel={() => setPickerFor(null)} />
                            : p.clientId ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.clientName}</span>
                                <button onClick={() => setPickerFor(p.idx)} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: '#8695A2', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>change</button>
                              </div>
                            ) : (
                              <button onClick={() => setPickerFor(p.idx)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: accent, background: '#fff', border: `1px solid ${accent}55`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}><Icon name="search" size={13} />Assign client</button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
