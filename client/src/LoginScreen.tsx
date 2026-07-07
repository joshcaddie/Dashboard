import { useState } from 'react';
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

export function LoginScreen() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const focus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = ACCENT; e.target.style.boxShadow = `0 0 0 3px ${ACCENT}22`; };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Could not sign in.');
      setBusy(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await api.post('/auth/forgot', { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
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
            <div style={{ fontSize: 12, color: '#8695A2', fontWeight: 600 }}>{mode === 'login' ? 'Sign in to your workspace' : 'Reset your password'}</div>
          </div>
        </div>

        {mode === 'login' ? (
          <form onSubmit={submitLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={label}>Email</label>
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onFocus={focus} onBlur={blur} placeholder="you@example.com" style={input} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={focus} onBlur={blur} placeholder="••••••••" style={input} />
            </div>
            {error && <div style={{ fontSize: 13, fontWeight: 600, color: '#C22F35', marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <button type="button" onClick={() => { setMode('forgot'); setError(''); setSent(false); }} style={linkBtn}>Forgot password?</button>
          </form>
        ) : sent ? (
          <div>
            <div style={{ fontSize: 14, color: '#33475A', lineHeight: 1.6, marginBottom: 18 }}>
              If an account exists for <strong>{email.trim()}</strong>, we’ve sent a link to reset your password. Check your inbox.
            </div>
            <button type="button" onClick={() => { setMode('login'); setSent(false); setError(''); }} style={primaryBtn(false)}>Back to sign in</button>
          </div>
        ) : (
          <form onSubmit={submitForgot}>
            <div style={{ fontSize: 13, color: '#66788A', lineHeight: 1.55, marginBottom: 14 }}>
              Enter your email and we’ll send you a link to set a new password.
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Email</label>
              <input type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} onFocus={focus} onBlur={blur} placeholder="you@example.com" style={input} />
            </div>
            {error && <div style={{ fontSize: 13, fontWeight: 600, color: '#C22F35', marginBottom: 12 }}>{error}</div>}
            <button type="submit" disabled={busy} style={primaryBtn(busy)}>{busy ? 'Sending…' : 'Send reset link'}</button>
            <button type="button" onClick={() => { setMode('login'); setError(''); }} style={linkBtn}>Back to sign in</button>
          </form>
        )}
      </div>
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  width: '100%', marginTop: 12, background: 'transparent', border: 'none', color: ACCENT,
  fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 4,
};
