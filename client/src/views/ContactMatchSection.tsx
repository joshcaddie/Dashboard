import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import type { Client } from '../types';

interface Proposal {
  email: string; name: string; domain: string; unsub: boolean;
  status: 'match' | 'exists' | 'nomatch'; clientId: number | null; clientName: string | null;
}

// Rank clients by a query across name + website (prefix matches first).
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

export function ContactMatchSection() {
  const { user } = useAuth();
  const { theme, wsId, wsCfg, wsClients } = useWs();
  const accent = theme.accent;
  const [file, setFile] = useState<File | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (user?.role !== 'super_admin') return null;
  const isCombined = wsId === 'combined';
  const wsName = wsCfg.name;

  const match = async () => {
    if (!file || busy) return;
    setBusy(true); setMsg(null);
    try {
      const csv = await file.text();
      const r = await api.post('/import/match-contacts', { workspace: wsId, csv });
      const props: Proposal[] = r.proposals || [];
      setProposals(props);
      setChecked(new Set(props.filter((p) => p.status === 'match').map((p) => p.email)));
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Could not read the file.' });
    } finally { setBusy(false); }
  };

  const toggle = (email: string) => setChecked((s) => { const n = new Set(s); n.has(email) ? n.delete(email) : n.add(email); return n; });
  // Manually assign a client to a row (fixes a no-match or a wrong auto-match).
  const assign = (email: string, c: Client) => {
    setProposals((ps) => (ps || []).map((p) => (p.email === email ? { ...p, status: 'match', clientId: c.id, clientName: c.name } : p)));
    setChecked((s) => new Set(s).add(email));
    setPickerFor(null);
  };
  const matchable = (proposals || []).filter((p) => p.status === 'match');
  const allChecked = matchable.length > 0 && matchable.every((p) => checked.has(p.email));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(matchable.map((p) => p.email)));

  const apply = async () => {
    if (busy || !proposals) return;
    const items = proposals.filter((p) => p.status === 'match' && checked.has(p.email)).map((p) => ({ clientId: p.clientId, name: p.name, email: p.email }));
    if (!items.length) { setMsg({ ok: false, text: 'Nothing selected.' }); return; }
    if (!confirm(`Add ${items.length} contacts to their matched ${wsName} clients?`)) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api.post('/import/apply-contacts', { items });
      setMsg({ ok: true, text: `Added ${r.added} contacts${r.skipped ? ` (${r.skipped} skipped)` : ''}. Reloading…` });
      setTimeout(() => window.location.reload(), 1400);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Failed to add contacts.' });
      setBusy(false);
    }
  };

  const reset = () => { setProposals(null); setChecked(new Set()); setFile(null); setMsg(null); };

  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;
  const counts = {
    match: (proposals || []).filter((p) => p.status === 'match').length,
    nomatch: (proposals || []).filter((p) => p.status === 'nomatch').length,
    exists: (proposals || []).filter((p) => p.status === 'exists').length,
  };
  const badge = (bg: string, fg: string, txt: string) => <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: fg, background: bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>{txt}</span>;

  return (
    <div style={{ maxWidth: 1000, marginTop: 16 }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Match mailing list to clients — {isCombined ? 'select a workspace' : wsName}</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Upload an email list; approve the suggested client for each and add them as contacts</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {isCombined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 8, background: '#EEF3F7', border: '1px solid #DCE6EE', fontSize: 12.5, color: '#4B5D6C' }}>
              <Icon name="info" size={16} style={{ color: accent }} />Switch to a specific workspace to match into it.
            </div>
          ) : !proposals ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
                <Icon name="file-spreadsheet" size={18} style={{ color: accent }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1B2E3D' }}>Mailing list CSV</div>
                  <div style={{ fontSize: 12, color: '#8695A2' }}>{file ? file.name : 'Email, First name, Last name…'}</div>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>
                  {file ? 'Change' : 'Choose'}
                  <input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] || null); setMsg(null); }} style={{ display: 'none' }} />
                </label>
              </div>
              {msg && <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35', marginTop: 12 }}>{msg.text}</div>}
              <button onClick={match} disabled={!file || busy} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 17px', border: 'none', borderRadius: 8, background: (!file || busy) ? '#9AA8B4' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (!file || busy) ? 'default' : 'pointer' }}>
                <Icon name="wand-sparkles" size={16} />{busy ? 'Matching…' : 'Match to clients'}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5A6B7A' }}>{counts.match} matched · {counts.nomatch} no match · {counts.exists} already a contact</span>
                <div style={{ flex: 1 }} />
                {msg && <span style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35' }}>{msg.text}</span>}
                <button onClick={reset} style={{ padding: '8px 13px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Start over</button>
                <button onClick={apply} disabled={busy || checked.size === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: (busy || checked.size === 0) ? '#9AA8B4' : accent, color: '#fff', fontSize: 13, fontWeight: 700, cursor: (busy || checked.size === 0) ? 'default' : 'pointer' }}>
                  <Icon name="user-plus" size={15} />Add {checked.size} contact{checked.size === 1 ? '' : 's'}
                </button>
              </div>
              <div style={{ border: '1px solid #EEF2F5', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '34px 1.6fr 1.2fr 1.4fr', gap: '0 12px', padding: '9px 14px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD', alignItems: 'center' }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  <span>Email</span><span>Name</span><span>Matched client</span>
                </div>
                <div style={{ maxHeight: 460, overflowY: 'auto' }}>
                  {proposals.map((p, i) => {
                    const on = checked.has(p.email);
                    const can = p.status === 'match';
                    const picking = pickerFor === p.email;
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '34px 1.6fr 1.2fr 1.4fr', gap: '0 12px', padding: '9px 14px', borderTop: '1px solid #F1F4F7', alignItems: picking ? 'start' : 'center', background: can && on ? '#F7FBF9' : '#fff', opacity: can || picking || p.status === 'nomatch' ? 1 : 0.7 }}>
                        <input type="checkbox" disabled={!can} checked={on && can} onChange={() => toggle(p.email)} style={{ marginTop: picking ? 6 : 0, cursor: can ? 'pointer' : 'default' }} />
                        <span style={{ fontSize: 12.5, color: '#33475A', wordBreak: 'break-all' }}>{p.email}{p.unsub && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#B07A17' }}>UNSUB</span>}</span>
                        <span style={{ fontSize: 12.5, color: '#4B5D6C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        <div style={{ minWidth: 0 }}>
                          {p.status === 'exists' ? badge('#EAF1F8', '#2B6CB0', 'Already a contact')
                            : picking ? <ClientPicker clients={wsClients} accent={accent} onPick={(c) => assign(p.email, c)} onCancel={() => setPickerFor(null)} />
                            : p.status === 'match' ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.clientName}</span>
                                <button onClick={() => setPickerFor(p.email)} style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: '#8695A2', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>change</button>
                              </div>
                            ) : (
                              <button onClick={() => setPickerFor(p.email)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: accent, background: '#fff', border: `1px solid ${accent}55`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}><Icon name="search" size={13} />Assign client</button>
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
