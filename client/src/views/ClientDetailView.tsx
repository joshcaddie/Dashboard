import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { Icon } from '../components/Icon';
import { money, initials, avatarColors, clientTypeStyle, typeStyle, statusStyle } from '../lib';
import { deriveEmail } from '../derive';

export function ClientDetailView() {
  const store = useStore();
  const { theme } = useWs();
  const modals = useModals();
  const accent = theme.accent, soft = theme.soft;

  const dcl = store.clients.find((c) => c.id === store.selectedClientId);
  if (!dcl) return null;

  const cj = store.jobs.filter((j) => j.client === dcl.name);
  const totalDev = cj.reduce((a, b) => a + b.dev, 0);
  const totalHost = cj.reduce((a, b) => a + b.host, 0);

  const email = deriveEmail(dcl.contact, dcl.website);
  const lastContacted = dcl.lastContacted || 'Apr 16, 2026';

  interface Row {
    first: string;
    last: string;
    title: string;
    email: string;
    phone: string;
    canRemove: boolean;
    onRemove?: () => void;
  }

  const primaryContacts: Row[] =
    dcl.contact && dcl.contact !== '—'
      ? [{
          first: dcl.contact.split(' ')[0],
          last: dcl.contact.split(' ').slice(1).join(' '),
          title: 'Main contact',
          email,
          phone: '—',
          canRemove: false,
        }]
      : [];
  const extraContacts: Row[] = (dcl.contacts || []).map((ct) => ({
    first: ct.name.split(' ')[0] || ct.name,
    last: ct.name.split(' ').slice(1).join(' '),
    title: ct.title,
    email: ct.email,
    phone: ct.phone,
    canRemove: true,
    onRemove: () => store.removeContact(dcl.id, ct.id),
  }));
  const contacts: Row[] = [...primaryContacts, ...extraContacts];

  const av = avatarColors(dcl.name);

  const label = { fontSize: 11.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: '#9AA8B4' } as const;

  return (
    <div style={{ maxWidth: 1360, display: 'flex', flexDirection: 'column', gap: 15 }}>
      <button onClick={() => store.goBack()} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}><Icon name="arrow-left" size={16} />Back</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 56, height: 56, borderRadius: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, background: av[0], color: av[1] }}>{initials(dcl.name)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', color: '#12222F' }}>{dcl.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <span style={clientTypeStyle(dcl.type, accent, soft)}>{dcl.type}</span>
            <span style={{ fontSize: 13, color: '#6B7C8C' }}>{dcl.region} · {dcl.website || '—'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7C8C' }}>Total development revenue</div>
          <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 24, fontWeight: 700, color: '#0F2233', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{money(totalDev)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '14px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7C8C' }}>Annual hosting revenue</div>
          <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 24, fontWeight: 700, color: accent, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{money(totalHost)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 14, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, padding: '15px 18px', boxShadow: '0 1px 2px rgba(16,32,46,.04)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F', marginBottom: 16 }}>Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <div><div style={label}>Business type</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>School</div></div>
            <div><div style={label}>Sub-type</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>Primary</div></div>
            <div><div style={label}>School roll</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>{dcl.roll}</div></div>
            <div><div style={label}>Status</div><div style={{ marginTop: 6 }}><span style={clientTypeStyle(dcl.type, accent, soft)}>{dcl.type}</span></div></div>
            <div><div style={label}>Main contact</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>{dcl.contact || '—'}</div></div>
            <div><div style={label}>Phone</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>—</div></div>
            <div style={{ gridColumn: '1 / -1' }}><div style={label}>Email</div><div style={{ fontSize: 14, color: '#33475A', marginTop: 4 }}>{email}</div></div>
            <div style={{ gridColumn: '1 / -1' }}><div style={label}>Notes</div><div style={{ fontSize: 13.5, color: '#5A6B7A', marginTop: 4, lineHeight: 1.5 }}>No notes recorded yet.</div></div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Contacts</div><span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{contacts.length}</span></div>
            <button onClick={() => modals.openAddContact(dcl.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: accent, cursor: 'pointer' }}><Icon name="user-plus" size={15} />Add contact</button>
          </div>
          {contacts.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr .9fr 1fr 40px', padding: '11px 22px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}><span>Name</span><span>Email</span><span>Phone</span><span>Last contacted</span><span></span></div>
              {contacts.map((ct, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr .9fr 1fr 40px', alignItems: 'center', padding: '13px 22px', borderTop: '1px solid #F1F4F7' }}>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{ct.first} {ct.last}</div><div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{ct.title}</div></div>
                  <div style={{ fontSize: 13, color: '#4B5D6C', wordBreak: 'break-word' }}>{ct.email}</div>
                  <div style={{ fontSize: 13, color: '#4B5D6C' }}>{ct.phone}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4B5D6C' }}><Icon name="clock" size={13} style={{ color: '#B6C1CB' }} />{lastContacted}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {ct.canRemove && <button onClick={ct.onRemove} title="Remove contact" style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={14} /></button>}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ padding: 34, textAlign: 'center', color: '#9AA8B4' }}><Icon name="user-x" size={26} /><div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>No contacts yet</div></div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Client's jobs</div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8695A2' }}>{cj.length} jobs</span>
        </div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 820 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr .9fr .9fr .9fr 1fr', padding: '12px 24px', background: '#FAFCFD', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: '#93A1AD' }}>
            <span>Job type</span><span>Status</span><span style={{ textAlign: 'right' }}>Dev rev</span><span style={{ textAlign: 'right' }}>Monthly</span><span style={{ textAlign: 'right' }}>Hosting</span><span style={{ textAlign: 'right' }}>Total</span>
          </div>
          {cj.map((j) => (
            <div key={j.id} onClick={() => store.openJob(j.id)} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr .9fr .9fr .9fr 1fr', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid #F1F4F7', cursor: 'pointer' }}>
              <div><span style={typeStyle(j.jobType)}>{j.jobType}</span></div>
              <div><span style={statusStyle(j.status)}>{j.status}</span></div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.dev ? money(j.dev) : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(Math.round(j.host / 12)) : '—'}</div>
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{j.host ? money(j.host) : '—'}</div>
              <div style={{ textAlign: 'right', fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 14, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{money(j.dev + j.host)}</div>
            </div>
          ))}
        </div></div>
      </div>
    </div>
  );
}
