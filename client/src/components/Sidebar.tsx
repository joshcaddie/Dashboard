import { useState } from 'react';
import { useStore, type View } from '../store';
import { useWs } from '../derive';
import { useAuth, ROLE_LABEL } from '../auth';
import { Icon } from './Icon';
import type { Workspace } from '../types';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

type NavItem = { id: View; label: string; icon: string; badge?: 'clients' | 'sales' | 'jobs' | 'progress'; ws?: string[] };
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'clients', label: 'Clients', icon: 'users', badge: 'clients' },
  { id: 'sales', label: 'Sales', icon: 'trending-up', badge: 'sales' },
  { id: 'jobs', label: 'Jobs', icon: 'briefcase', badge: 'jobs' },
  { id: 'bymonth', label: 'Jobs by month', icon: 'calendar-days' },
  { id: 'progress', label: 'Jobs in progress', icon: 'loader-circle', badge: 'progress' },
  // Google Ads management — Caddie-only.
  { id: 'googleAds', label: 'Google Ads', icon: 'megaphone', ws: ['caddie', 'combined'] },
  { id: 'goals', label: 'Goals', icon: 'target' },
  { id: 'contacts', label: 'Client contacts', icon: 'contact-round' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const IN_PROGRESS = ['Awaiting Brief', 'In Design', 'In Progress'];

export function Sidebar() {
  const store = useStore();
  const { theme, wsClients, wsJobs, wsSales, wsCfg, wsId } = useWs();
  const { config } = store;
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const progressCount = wsJobs.filter((j) => IN_PROGRESS.includes(j.status)).length;
  const openTasks = wsSales.reduce((a, s) => a + s.tasks.filter((t) => !t.done).length, 0);
  const badgeVal = (b?: string) =>
    b === 'clients' ? wsClients.length : b === 'sales' ? wsSales.length : b === 'jobs' ? wsJobs.length : b === 'progress' ? progressCount : null;

  const salesActive = store.view === 'sales' || store.view === 'salestasks' || store.view === 'emailtemplates';

  const wsList = ['schoolwebsites', 'caddie', 'combined'].map((id) => {
    const c = config.workspaceConfigs[id];
    return { ...c, active: id === wsId };
  });

  return (
    <aside
      style={{
        width: 230, flexShrink: 0, minHeight: '100vh', padding: '16px 13px', position: 'sticky', top: 0, height: '100vh',
        display: 'flex', flexDirection: 'column', gap: 6, background: theme.sidebarBg, color: theme.sidebarText,
        borderRight: `1px solid ${theme.sidebarBorder}`,
      }}
    >
      {/* workspace switcher */}
      <div style={{ position: 'relative', padding: '0 2px 16px' }}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '8px 10px', border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
        >
          {wsCfg.logo ? (
            <span
              style={{
                flex: 1, minWidth: 0, height: 44, backgroundColor: '#fff', borderRadius: 8, padding: '9px 12px',
                boxShadow: '0 1px 3px rgba(15,30,44,.14)', backgroundImage: `url(/assets/${wsCfg.logo})`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'left center', backgroundSize: 'auto 24px',
              }}
            />
          ) : (
            <>
              <span style={{ width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.accent, color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{wsCfg.mark}</span>
              <span style={{ lineHeight: 1.15, flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 15, letterSpacing: '-.02em', color: theme.sidebarTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wsCfg.name}</span>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: theme.sidebarMuted }}>{wsCfg.tagline}</span>
              </span>
            </>
          )}
          <Icon name="chevrons-up-down" size={16} style={{ color: theme.sidebarMuted, flexShrink: 0 }} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 2, right: 2, marginTop: 5, zIndex: 60, background: '#fff', border: '1px solid #E6ECF1', borderRadius: 14, boxShadow: '0 22px 44px -14px rgba(15,30,44,.45)', padding: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9AA8B4', padding: '8px 10px 6px' }}>Switch workspace</div>
            {wsList.map((w) => (
              <button
                key={w.id}
                onClick={() => { store.setWorkspace(w.id as Workspace); setMenuOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 12px', borderRadius: 11, border: 'none', cursor: 'pointer', textAlign: 'left', background: w.active ? theme.soft : 'transparent' }}
              >
                {w.logo ? (
                  <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, backgroundColor: '#fff', border: '1px solid #EAEFF3', backgroundImage: `url(/assets/${w.logo})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: '24px auto' }} />
                ) : (
                  <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, background: w.active ? theme.accent : '#E7ECF1', color: w.active ? '#fff' : '#5A6B7A' }}>{w.mark}</span>
                )}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#1B2E3D' }}>{w.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#8695A2' }}>{w.tagline}</span>
                </span>
                {w.active && <Icon name="check" size={16} style={{ color: theme.accent }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: theme.sidebarMuted, padding: '6px 12px 8px' }}>Workspace</div>

      {NAV.filter((n) => !n.ws || n.ws.includes(wsId)).map((n) => {
        const active = store.view === n.id;
        const bv = badgeVal(n.badge);
        const showSub = n.id === 'sales' && salesActive;
        return (
          <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              onClick={() => store.goto(n.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 600, textAlign: 'left', transition: 'all .15s',
                background: active ? theme.accent : 'transparent', color: active ? '#fff' : theme.sidebarText,
              }}
            >
              <Icon name={n.icon} size={18} />
              <span style={{ flex: 1, textAlign: 'left' }}>{n.label}</span>
              {bv != null && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: active ? 'rgba(255,255,255,.22)' : theme.dark ? '#1B3346' : '#EDF1F4', color: active ? '#fff' : theme.sidebarMuted }}>{bv}</span>
              )}
            </button>
            {showSub && (
              <>
                {[
                  { id: 'salestasks' as View, label: 'Sales tasks', icon: 'list-checks', count: openTasks > 0 ? String(openTasks) : '' },
                  { id: 'emailtemplates' as View, label: 'Email templates', icon: 'mail', count: '' },
                ].map((sd) => {
                  const a = store.view === sd.id;
                  return (
                    <button
                      key={sd.id}
                      onClick={() => store.goto(sd.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px 9px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: a ? 700 : 600, textAlign: 'left',
                        background: a ? (theme.dark ? 'rgba(255,255,255,.09)' : theme.soft) : 'transparent',
                        color: a ? (theme.dark ? '#fff' : theme.accent) : theme.sidebarText,
                      }}
                    >
                      <Icon name={sd.icon} size={16} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{sd.label}</span>
                      {sd.count && <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: theme.dark ? '#1B3346' : '#EDF1F4', color: theme.sidebarMuted }}>{sd.count}</span>}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 'auto', padding: 14, borderRadius: 15, background: theme.sidebarCard, display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${theme.accent},#2B6CB0)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{initials(user?.name || '')}</div>
        <div style={{ lineHeight: 1.25, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.sidebarTitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || '—'}</div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: theme.sidebarMuted }}>{ROLE_LABEL[user?.role || ''] || 'Team member'}</div>
        </div>
        <button
          onClick={() => logout()}
          title="Sign out"
          style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <Icon name="log-out" size={17} style={{ color: theme.sidebarMuted }} />
        </button>
      </div>
    </aside>
  );
}
