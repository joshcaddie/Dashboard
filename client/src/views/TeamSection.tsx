import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth, roleAtLeast, ROLE_LABEL, type AuthUser } from '../auth';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';

interface TeamUser extends AuthUser { createdAt?: string; }

const ROLE_OPTIONS = ['member', 'admin', 'super_admin'];

export function TeamSection() {
  const { user: me } = useAuth();
  const { theme } = useWs();
  const accent = theme.accent;
  const canManage = roleAtLeast(me?.role, 'admin');
  const iAmSuper = me?.role === 'super_admin';

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!canManage) return;
    api.get('/users')
      .then((u) => setUsers(u))
      .catch((e: any) => setLoadErr(e?.message || 'Could not load team.'))
      .finally(() => setLoaded(true));
  }, [canManage]);

  if (!canManage) return null;

  const invite = async () => {
    const n = name.trim(), em = email.trim();
    if (!n || !em || inviting) return;
    setInviting(true); setInviteMsg(null);
    try {
      const created = await api.post('/users', { name: n, email: em, role });
      setUsers((us) => [...us, created]);
      setName(''); setEmail(''); setRole('member');
      setInviteMsg(created.emailed === false
        ? { ok: false, text: `${n} was added, but the invite email couldn’t be sent — use “Resend invite”.` }
        : { ok: true, text: `Invite sent to ${em}.` });
    } catch (e: any) {
      setInviteMsg({ ok: false, text: e?.message || 'Could not send invite.' });
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (u: TeamUser, newRole: string) => {
    if (newRole === u.role) return;
    const prev = users;
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    try {
      const updated = await api.patch(`/users/${u.id}`, { role: newRole });
      setUsers((us) => us.map((x) => (x.id === u.id ? updated : x)));
    } catch (e: any) {
      setUsers(prev);
      setInviteMsg({ ok: false, text: e?.message || 'Could not change role.' });
    }
  };

  const remove = async (u: TeamUser) => {
    if (!confirm(`Remove ${u.name} from the team? They’ll lose access immediately.`)) return;
    const prev = users;
    setUsers((us) => us.filter((x) => x.id !== u.id));
    try {
      await api.del(`/users/${u.id}`);
    } catch (e: any) {
      setUsers(prev);
      setInviteMsg({ ok: false, text: e?.message || 'Could not remove user.' });
    }
  };

  const resend = async (u: TeamUser) => {
    setInviteMsg(null);
    try {
      await api.post(`/users/${u.id}/resend`);
      setInviteMsg({ ok: true, text: `Invite re-sent to ${u.email}.` });
    } catch (e: any) {
      setInviteMsg({ ok: false, text: e?.message || 'Could not resend invite.' });
    }
  };

  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;
  const input = { padding: '11px 13px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 13.5, outline: 'none', boxSizing: 'border-box' } as const;
  const selectStyle = { ...input, background: '#fff', cursor: 'pointer' } as const;
  const addBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 16px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: inviting ? 'default' : 'pointer', opacity: inviting ? 0.7 : 1, flexShrink: 0 } as const;

  const roleOptionsFor = (u: TeamUser) => ROLE_OPTIONS.filter((r) => {
    // Only a super admin can grant/see the super_admin option for others.
    if (r === 'super_admin' && !iAmSuper) return u.role === 'super_admin';
    return true;
  });

  return (
    <div style={{ maxWidth: 1000, marginTop: 16 }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Team members</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Invite people and manage who can access the dashboard</div>
        </div>

        <div style={{ padding: '16px 22px' }}>
          {/* Invite row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr auto auto', gap: 9, marginBottom: 8 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={input} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') invite(); }} placeholder="name@example.com" style={input} />
            <select value={role} onChange={(e) => setRole(e.target.value)} style={selectStyle}>
              <option value="member">Team member</option>
              <option value="admin">Admin</option>
              {iAmSuper && <option value="super_admin">Super admin</option>}
            </select>
            <button onClick={invite} style={addBtn}><Icon name="user-plus" size={16} />{inviting ? 'Inviting…' : 'Invite'}</button>
          </div>
          {inviteMsg && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: inviteMsg.ok ? '#2E7D6B' : '#C22F35', margin: '4px 2px 12px' }}>{inviteMsg.text}</div>
          )}

          {/* Member list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {!loaded && <div style={{ fontSize: 13, color: '#8695A2' }}>Loading team…</div>}
            {loadErr && <div style={{ fontSize: 13, color: '#C22F35' }}>{loadErr}</div>}
            {users.map((u) => {
              const isMe = u.id === me?.id;
              const lockRole = (u.role === 'super_admin' && !iAmSuper) || isMe;
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${accent},#2B6CB0)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                    {(u.name.trim()[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1B2E3D' }}>
                      {u.name} {isMe && <span style={{ fontSize: 11, fontWeight: 600, color: '#8695A2' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#8695A2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                  </div>
                  {u.status === 'invited' && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#B7791F', background: '#FEF6E7', border: '1px solid #F5E3BE', borderRadius: 999, padding: '3px 9px' }}>Invited</span>
                  )}
                  {lockRole ? (
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5A6B7A', padding: '0 6px' }}>{ROLE_LABEL[u.role] || u.role}</span>
                  ) : (
                    <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={{ ...selectStyle, padding: '7px 9px', fontSize: 12.5 }}>
                      {roleOptionsFor(u).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  )}
                  {u.status === 'invited' && (
                    <button onClick={() => resend(u)} title="Resend invite" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#7A8894', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="send" size={14} />
                    </button>
                  )}
                  {!isMe && !(u.role === 'super_admin' && !iAmSuper) && (
                    <button onClick={() => remove(u)} title="Remove" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="trash-2" size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
