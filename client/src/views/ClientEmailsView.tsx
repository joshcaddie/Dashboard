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
  const { theme, wsId } = useWs();
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

  useEffect(() => {
    if (arcId == null) {
      setComposedSrc([]);
      return;
    }
    let alive = true;
    api.get('/sent-emails?kind=' + kind + '&refId=' + arcId).then((rows) => {
      if (alive) setComposedSrc(Array.isArray(rows) ? rows : []);
    });
    return () => {
      alive = false;
    };
  }, [kind, arcId]);

  if (!arc) return null;

  const first = arc.contact && arc.contact !== '—' ? arc.contact.split(' ')[0] : 'Office';
  const dom = (arc.website || '').replace(/^www\./, '') || 'school.nz';
  const themEmail = (first.toLowerCase().replace(/[^a-z]/g, '') || 'office') + '@' + dom;
  const brand = wsId === 'caddie' ? 'Caddie Digital' : 'School Websites NZ';
  const av = avatarColors(arc.name);
  const who = arc.contact && arc.contact !== '—' ? arc.contact : arc.name;
  const seed = (arc.name || '').length + (arc.id || 0);

  const thread = [
    { dir: 'out', subj: 'Welcome to ' + brand + ' — next steps', prev: 'Kia ora ' + first + ', great to have you on board. Here is what happens next as we get your project underway…', day: 'Mar 3', time: '9:12 AM' },
    { dir: 'in', subj: 'Re: Welcome to ' + brand + ' — next steps', prev: 'Thanks Rachel — this all looks great. I have looped in our office manager as well…', day: 'Mar 3', time: '2:48 PM' },
    { dir: 'out', subj: 'Design proof ready for your review', prev: 'Hi ' + first + ', the first design proof for your new site is ready. Preview it and send through any changes…', day: 'Mar 18', time: '11:30 AM' },
    { dir: 'in', subj: 'Re: Design proof ready for your review', prev: 'Love it! Just a couple of small tweaks to the homepage banner and the colours on the news section…', day: 'Mar 19', time: '8:05 AM' },
    { dir: 'in', subj: 'Question about the newsletter module', prev: 'Hi Rachel, a few of our teachers are asking whether we can schedule newsletters in advance…', day: 'Apr 2', time: '4:22 PM', unread: true },
    { dir: 'out', subj: 'Re: Question about the newsletter module', prev: 'Great question — yes, scheduling is built in. I have attached a short guide for your team…', day: 'Apr 2', time: '5:01 PM' },
    { dir: 'out', subj: 'Invoice INV-' + (2000 + seed) + ' — annual hosting', prev: 'Please find attached your annual hosting invoice. Payment is due within 30 days. Ngā mihi…', day: 'Apr 15', time: '10:00 AM' },
    { dir: 'in', subj: 'Re: Invoice INV-' + (2000 + seed) + ' — annual hosting', prev: 'All paid, thanks. Could you also confirm our domain renewal date while we are at it?', day: 'Apr 16', time: '9:40 AM', unread: true },
  ];

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

  const items: Item[] = [
    ...composed,
    ...thread.map((t, i) => ({
      id: i,
      isOut: t.dir === 'out',
      who: t.dir === 'out' ? 'To ' + who : who,
      peer: themEmail,
      dirLabel: t.dir === 'out' ? 'Sent' : 'Received',
      dirRotate: t.dir === 'out' ? 'none' : 'rotate(180deg)',
      dirBg: t.dir === 'out' ? soft : '#EAF1F8',
      dirFg: t.dir === 'out' ? accent : '#2B6CB0',
      subj: t.subj,
      prev: t.prev,
      dateStr: t.day + ' · ' + t.time,
      unread: !!t.unread,
      rowBg: t.unread ? '#F6FAF9' : '#fff',
      subjWeight: t.unread ? 700 : 600,
    })),
  ];

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#FFF8EC', border: '1px solid #F5E4C3', borderRadius: 8, padding: '11px 14px' }}>
        <Icon name="plug-zap" size={17} style={{ color: '#B5791B', flexShrink: 0 }} />
        <div style={{ fontSize: 12.5, color: '#7A5B1E', lineHeight: 1.45 }}>Showing <strong>sample</strong> conversation history. Connect your Gmail account to sync real sent &amp; received email for this client.</div>
        <div style={{ flex: 1 }} />
        <button style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E7D2A4', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#8A6417', cursor: 'pointer' }}>
          <Icon name="mail" size={14} />Connect Gmail
        </button>
      </div>

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
