import { useEffect, useState, type CSSProperties } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { clientEmailContext, saleEmailContext } from '../emailCtx';
import { Icon } from '../components/Icon';
import { initials, avatarColors } from '../lib';

interface ComposedSrc {
  subject: string;
  body: string;
  day: string;
  time: string;
}

interface GmailMsg {
  id: string; threadId: string; from: string; to: string;
  subject: string; snippet: string; dateMs: number; isOut: boolean; unread: boolean;
}
interface GmailResp { connected: boolean; configured?: boolean; error?: string; addresses?: string[]; messages: GmailMsg[]; }

function parseAddr(v: string): { name: string; email: string } {
  const m = (v || '').match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: (v || '').trim() };
}
function fmtMs(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface Item {
  id: string | number;
  isOut: boolean;
  who: string;
  peer: string;
  dirLabel: string;
  dirRotate: string;
  dirBg: string;
  dirFg: string;
  subj: string;
  prev: string;
  dateStr: string;
  unread: boolean;
  rowBg: string;
  subjWeight: number;
}

export function ClientEmailsView() {
  const store = useStore();
  const { theme } = useWs();
  const modals = useModals();
  const accent = theme.accent, soft = theme.soft;

  const kind = store.emailArchiveKind;
  const sale = kind === 'sale' ? store.sales.find((s) => s.id === store.emailArchiveSaleId) : undefined;
  const client = kind === 'sale' ? undefined : store.clients.find((c) => c.id === store.selectedClientId);

  const arc =
    kind === 'sale'
      ? sale
        ? { id: sale.id, name: sale.name, contact: sale.principal, website: '', region: sale.region }
        : null
      : client
      ? { id: client.id, name: client.name, contact: client.contact, website: client.website, region: client.region }
      : null;

  const arcId = arc ? arc.id : null;
  const [composedSrc, setComposedSrc] = useState<ComposedSrc[]>([]);
  const [gmail, setGmail] = useState<GmailResp | null>(null);
  const [gmailLoading, setGmailLoading] = useState(false);

  useEffect(() => {
    if (arcId == null) { setComposedSrc([]); setGmail(null); return; }
    let alive = true;
    setGmailLoading(true);
    api.get('/sent-emails?kind=' + kind + '&refId=' + arcId).then((rows) => {
      if (alive) setComposedSrc(Array.isArray(rows) ? rows : []);
    }).catch(() => {});
    api.get(`/gmail/threads?kind=${kind}&refId=${arcId}`)
      .then((r) => { if (alive) setGmail(r); })
      .catch(() => { if (alive) setGmail({ connected: false, messages: [] }); })
      .finally(() => { if (alive) setGmailLoading(false); });
    return () => { alive = false; };
  }, [kind, arcId]);

  if (!arc) return null;

  const first = arc.contact && arc.contact !== '—' ? arc.contact.split(' ')[0] : 'Office';
  const dom = (arc.website || '').replace(/^www\./, '') || 'school.nz';
  const themEmail = (first.toLowerCase().replace(/[^a-z]/g, '') || 'office') + '@' + dom;
  const av = avatarColors(arc.name);
  const who = arc.contact && arc.contact !== '—' ? arc.contact : arc.name;
  const gmailConnected = !!gmail?.connected;

  const composed: Item[] = composedSrc.map((e, i) => ({
    id: 'c' + i,
    isOut: true,
    who: 'To ' + who,
    peer: themEmail,
    dirLabel: 'Sent',
    dirRotate: 'none',
    dirBg: soft,
    dirFg: accent,
    subj: e.subject || '(no subject)',
    prev: ((e.body || '').replace(/\s+/g, ' ').trim() || '(no message)').slice(0, 120) + '…',
    dateStr: e.day + ' · ' + e.time,
    unread: false,
    rowBg: '#fff',
    subjWeight: 600,
  }));

  const gmailItems: Item[] = (gmail?.messages || []).map((m) => {
    const other = m.isOut ? parseAddr(m.to) : parseAddr(m.from);
    return {
      id: m.id,
      isOut: m.isOut,
      who: m.isOut ? 'To ' + (other.name || other.email) : (other.name || other.email),
      peer: other.email,
      dirLabel: m.isOut ? 'Sent' : 'Received',
      dirRotate: m.isOut ? 'none' : 'rotate(180deg)',
      dirBg: m.isOut ? soft : '#EAF1F8',
      dirFg: m.isOut ? accent : '#2B6CB0',
      subj: m.subject || '(no subject)',
      prev: (m.snippet || '').trim() || '(no preview)',
      dateStr: fmtMs(m.dateMs),
      unread: m.unread,
      rowBg: m.unread ? '#F6FAF9' : '#fff',
      subjWeight: m.unread ? 700 : 600,
    };
  });

  // Gmail thread (already includes our sent mail) when connected; otherwise the
  // locally-recorded send archive.
  const items: Item[] = gmailConnected ? gmailItems : composed;

  const f = store.clientEmailFilter;
  const filtered = items.filter((it) => f === 'All' || (f === 'Sent' && it.isOut) || (f === 'Received' && !it.isOut));
  const received = items.filter((it) => !it.isOut).length;
  const sent = items.filter((it) => it.isOut).length;
  const unreadCount = items.filter((it) => it.unread).length;

  const onCompose = () => {
    if (sale) modals.openEmail(saleEmailContext(sale));
    else if (client) modals.openEmail(clientEmailContext(client));
  };

  const tabs: { label: string; key: string; count: number }[] = [
    { label: 'All', key: 'All', count: items.length },
    { label: 'Received', key: 'Received', count: received },
    { label: 'Sent', key: 'Sent', count: sent },
  ];

  return (
    <div style={{ maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button onClick={store.goBack} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>
        <Icon name="arrow-left" size={16} />Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, background: av[0], color: av[1] }}>{initials(arc.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#12222F' }}>{arc.name}</div>
          <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 2 }}>{themEmail}</div>
        </div>
        <button onClick={onCompose} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Icon name="send" size={15} />New email
        </button>
      </div>

      {gmailConnected ? (
        gmail?.error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FCEEEE', border: '1px solid #F1D3D5', borderRadius: 8, padding: '11px 14px' }}>
            <Icon name="triangle-alert" size={17} style={{ color: '#C22F35', flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: '#8A2C31', lineHeight: 1.45 }}>Couldn’t load Gmail history: {gmail.error}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#EFF7F1', border: '1px solid #CDE6D6', borderRadius: 8, padding: '10px 14px' }}>
            <Icon name="mail-check" size={16} style={{ color: '#1B7A45', flexShrink: 0 }} />
            <div style={{ fontSize: 12.5, color: '#2E6B45', lineHeight: 1.45 }}>Live Gmail history{gmail?.addresses?.length ? ` for ${gmail.addresses.join(', ')}` : ''}.</div>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FFF8EC', border: '1px solid #F5E4C3', borderRadius: 8, padding: '11px 14px' }}>
          <Icon name="plug-zap" size={17} style={{ color: '#B5791B', flexShrink: 0 }} />
          <div style={{ fontSize: 12.5, color: '#7A5B1E', lineHeight: 1.45 }}>
            {gmailLoading ? 'Checking Gmail…' : gmail?.configured === false
              ? 'Gmail isn’t set up yet. Add Google credentials, then connect it in Settings.'
              : 'Gmail isn’t connected for this workspace — showing locally sent email only. Connect it to sync full history.'}
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => store.goto('settings')} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E7D2A4', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#8A6417', cursor: 'pointer' }}>
            <Icon name="mail" size={14} />Connect Gmail
          </button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 16px', borderBottom: '1px solid #EEF2F5' }}>
          {tabs.map((t) => {
            const a = t.key === f;
            const tabStyle: CSSProperties = { padding: '7px 14px', borderRadius: 8, border: a ? '1px solid ' + accent : '1px solid #E1E8ED', background: a ? accent : '#fff', color: a ? '#fff' : '#5A6B7A', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
            return (
              <button key={t.key} onClick={() => store.setClientEmailFilter(t.key)} style={tabStyle}>{t.label} ({t.count})</button>
            );
          })}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#9AA8B4' }}>{unreadCount} unread</span>
        </div>

        {filtered.map((m) => (
          <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '38px 1fr auto', alignItems: 'start', gap: 13, padding: '14px 18px', borderTop: '1px solid #F1F4F7', background: m.rowBg, cursor: 'pointer' }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.dirBg, color: m.dirFg, transform: m.dirRotate }}>
              <Icon name="arrow-up-right" size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: m.subjWeight, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.subj}</span>
                {m.unread && <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: 999, background: accent }} />}
              </div>
              <div style={{ fontSize: 12, color: '#8695A2', marginTop: 2 }}>{m.who} · {m.peer}</div>
              <div style={{ fontSize: 12.5, color: '#5A6B7A', marginTop: 5, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{m.prev}</div>
            </div>
            <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: m.dirBg, color: m.dirFg }}>{m.dirLabel}</span>
              <div style={{ fontSize: 11.5, color: '#9AA8B4', marginTop: 6 }}>{m.dateStr}</div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#9AA8B4' }}>
            <Icon name="mail-x" size={26} />
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>No emails in this view</div>
          </div>
        )}
      </div>
    </div>
  );
}
