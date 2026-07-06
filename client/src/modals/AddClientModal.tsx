import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Modal, inputStyle, labelStyle } from '../components/Modal';
import { Icon } from '../components/Icon';
import { BUSINESS_TYPE_OPTIONS, REGION_OPTIONS, ROLL_OPTIONS } from '../lib';

export function AddClientModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent, soft = theme.soft;
  const [form, setForm] = useState({ name: '', type: 'Client', contact: '', businessType: 'Primary School', region: 'Auckland', roll: '151–300', website: '', notes: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return;
    await store.addClient(form);
    onClose();
  };

  const fieldFocus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const fieldBlur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };

  return (
    <Modal
      title="Add new client"
      subtitle="Create a new client record"
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15,30,44,.14)' }}><Icon name="check" size={16} />Save client</button>
        </>
      }
    >
      <div style={{ padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '64vh', overflowY: 'auto' }}>
        <div>
          <label style={labelStyle}>Client name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Riverside Primary School" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><label style={labelStyle}>Contact name</label><input value={form.contact} onChange={(e) => set('contact', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Primary contact" style={inputStyle} /></div>
          <div><label style={labelStyle}>Business type</label><select value={form.businessType} onChange={(e) => set('businessType', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, backgroundColor: '#fff', color: '#33475A' }}>{BUSINESS_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><label style={labelStyle}>Region</label><select value={form.region} onChange={(e) => set('region', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, backgroundColor: '#fff', color: '#33475A' }}>{REGION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          <div><label style={labelStyle}>School roll</label><select value={form.roll} onChange={(e) => set('roll', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={{ ...inputStyle, backgroundColor: '#fff', color: '#33475A' }}>{ROLL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        </div>
        <div><label style={labelStyle}>Website</label><input value={form.website} onChange={(e) => set('website', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="www.example.school.nz" style={inputStyle} /></div>
        <div><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Anything worth remembering…" rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} /></div>
      </div>
    </Modal>
  );
}
