import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { clientEmailContext } from '../emailCtx';
import { Icon } from '../components/Icon';
import { initials, avatarColors } from '../lib';

export function ContactsView() {
  const store = useStore();
  const { theme, wsClients, wsId } = useWs();
  const modals = useModals();
  const accent = theme.accent;

  const [contactSearch, setContactSearch] = useState('');

  const contactsBizLabel = wsId === 'caddie' ? 'Business name' : 'School name';

  type Row = {
    key: string;
    name: string;
    title: string;
    email: string;
    phone: string;
    school: string;
    lastStr: string;
    avatar: [string, string];
    onOpen: () => void;
    onEmail: () => void;
  };

  let allContacts: Row[] = [];
  wsClients.forEach((c) => {
    // Only the real on-file email — never a derived guess.
    const primaryEmail = (c.email || '').trim() || '—';
    const last = c.lastContacted || 'Apr 16, 2026';
    const onOpen = () => store.openClient(c.id);
    const onEmail = () => modals.openEmail(clientEmailContext(c));
    if (c.contact && c.contact !== '—') {
      allContacts.push({ key: 'p' + c.id, name: c.contact, title: 'Main contact', email: primaryEmail, phone: '—', school: c.name, lastStr: last, avatar: avatarColors(c.contact), onOpen, onEmail });
    }
    (c.contacts || []).forEach((ct) => {
      allContacts.push({ key: 'x' + c.id + '-' + ct.id, name: ct.name, title: ct.title || 'Contact', email: ct.email || '—', phone: ct.phone || '—', school: c.name, lastStr: last, avatar: avatarColors(ct.name), onOpen, onEmail });
    });
  });
  allContacts.sort((a, b) => a.name.localeCompare(b.name));

  const q = contactSearch.trim().toLowerCase();
  if (q) allContacts = allContacts.filter((ct) => ct.name.toLowerCase().includes(q) || ct.school.toLowerCase().includes(q) || (ct.email || '').toLowerCase().includes(q) || (ct.title || '').toLowerCase().includes(q));

  const cols = '1.6fr 1.6fr 1.7fr .9fr 1fr 48px';

  return (
    <div style={{ maxWidth: 1360, background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: '1px solid #EEF2F5', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 12, color: '#98A6B3', pointerEvents: 'none' }} />
          <input value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} placeholder="Search contacts, schools…" style={{ width: 280, padding: '9px 12px 9px 35px', border: '1px solid #DEE5EB', borderRadius: 8, fontSize: 13.5, color: '#12222F', outline: 'none' }} />
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{allContacts.length} contacts</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 16px', padding: '14px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#93A1AD' }}>
        <span>Name</span><span>{contactsBizLabel}</span><span>Email</span><span>Phone</span><span>Last contacted</span><span></span>
      </div>

      {allContacts.map((ct) => {
        const av = ct.avatar;
        return (
          <div key={ct.key} style={{ display: 'grid', gridTemplateColumns: cols, gap: '0 16px', alignItems: 'center', padding: `${theme.rowPad} 24px`, borderTop: '1px solid #F1F4F7' }}>
            <div onClick={ct.onOpen} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, cursor: 'pointer' }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: av[0], color: av[1] }}>{initials(ct.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ct.name}</div>
                <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{ct.title}</div>
              </div>
            </div>
            <div onClick={ct.onOpen} style={{ fontSize: 13, color: '#33475A', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ct.school}</div>
            <div style={{ fontSize: 13, color: '#4B5D6C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ct.email}</div>
            <div style={{ fontSize: 13, color: '#4B5D6C' }}>{ct.phone}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4B5D6C' }}><Icon name="clock" size={13} style={{ color: '#B6C1CB' }} />{ct.lastStr}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={ct.onEmail} title="Send email" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#8695A2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="mail" size={15} /></button>
            </div>
          </div>
        );
      })}

      {allContacts.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center', color: '#9AA8B4' }}>
          <Icon name="contact-round" size={26} />
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>No contacts found</div>
        </div>
      )}
    </div>
  );
}
