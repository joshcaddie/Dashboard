import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Modal, inputStyle, labelStyle } from '../components/Modal';
import { Icon } from '../components/Icon';

export function AddContactModal({ clientId, onClose }: { clientId: number; onClose: () => void }) {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent, soft = theme.soft;
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const fieldFocus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const fieldBlur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };

  const saveContact = async () => {
    if (!form.name.trim()) return;
    await store.addContact(clientId, form);
    onClose();
  };

  return (
    <Modal
      title="Add contact"
      subtitle="Add another person at this client"
      onClose={onClose}
      maxWidth={480}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Cancel</button>
          <button onClick={saveContact} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}><Icon name="user-plus" size={15} />Add contact</button>
        </>
      }
    >
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Full name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Sarah Mitchell" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Role / title</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Office Manager" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="name@school.nz" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Optional" style={inputStyle} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
