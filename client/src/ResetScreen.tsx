import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { api } from './api';

const ACCENT = '#2E7D6B';
const ACCENT_DARK = '#256656';

const shell: React.CSSProperties = {
  minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg,#0F2E3B 0%,#14414A 55%,#1C5A54 100%)', padding: 24,
};
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16,
  boxShadow: '0 28px 60px -20px rgba(6,24,32,.55)', padding: '30px 30px 26px',
};
const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#4B5D6C', marginBottom: 6 };
const input: React.CSSProperties = {
  width: '100%', padding: '11px 13px', border: '1px solid #DDE4EA', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const primaryBtn = (busy: boolean): React.CSSProperties => ({
  width: '100%', padding: '12px 16px', border: 'none', borderRadius: 9, background: ACCENT, color: '#fff',
  fontSize: 14, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1, marginTop: 4,
});

// Clear ?token=… from the address bar and return to the app root.
function goHome() {
  window.history.replaceState({}, '', '/');
}

export function ResetScreen({ token }: { token: string }) {
  const { setUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [invite, setInvite] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get(`/auth/reset/${encodeURIComponent(token)}`)
      .then((r) => { if (alive) { setValid(true); setInvite(!!r.invite); setName(r.name || ''); } })
      .catch((e: any) => { if (alive) setError(e?.message || 'This link is invalid or has expired.'); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [token]);

  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px ${ACCENT}22`; };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords don’t match.'); return; }
    setBusy(true); setError('');
    try {
      const u = await api.post('/auth/reset', { token, password });
      goHome();
      setUser(u); // logs straight in
    } catch (err: any) {
      setError(err?.message || 'Could not set your password.');
      setBusy(false);
    }
  };

  return (
    <div style={shell}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${ACCENT},${ACCENT_DARK})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20 }}>S</div>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#12222F', letterSpacing: '-.02em' }}>Schoolhub CRM</div>
            <div style={{ fontSize: 12, color: '#8695A2', fontWeight: 600 }}>{invite ? 'Set your password' : 'Choose a new password'}</div>
          </div>
        </div>

        {checking ? (
          <div style={{ fontSize: 14, color: '#66788A', padding: '8px 0' }}>Checking your link…</div>
        ) : !valid ? (
          <div>
            <div style={{ fontSize: 14, color: '#C22F35', fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>{error}</div>
            <button type="button" onClick={() => { goHome(); window.location.reload(); }} style={primaryBtn(false)}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {name && <div style={{ fontSize: 13.5, color: '#66788A', marginBottom: 16 }}>Welcome{invite ? '' : ' back'}, <strong style={{ color: '#33475A' }}>{name}</strong>.</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={label}>New password</label>
              <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} onFocus={focus} onBlur={blur} placeholder="At least 8 characters" style={input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Confirm password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onFocus={focus} onBlur={blur} placeholder="Re-enter password" style={input} />
            </div>
            {error && <div style={{ fontSize: 13, fontWeight: 600, color: '#C22F35', marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Saving…' : invite ? 'Set password & sign in' : 'Update password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
