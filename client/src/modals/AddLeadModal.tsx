import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Modal, inputStyle, labelStyle } from '../components/Modal';
import { Icon } from '../components/Icon';
import { REGION_OPTIONS, SALE_STAGES, LEAD_CATEGORIES } from '../lib';

export function AddLeadModal({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent, soft = theme.soft;
  const [form, setForm] = useState({ name: '', town: '', category: 'Primary', region: 'Auckland', contact: '', email: '', stage: 'New' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const fieldFocus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const fieldBlur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };

  const saveLead = async () => {
    if (!form.name.trim()) return;
    await store.addLead(form);
    onClose();
  };

  const selectStyle = { ...inputStyle, backgroundColor: '#fff', color: '#33475A' } as const;

  return (
    <Modal
      title="Add new lead"
      subtitle="Add a prospect to your sales pipeline"
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Cancel</button>
          <button onClick={saveLead} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15,30,44,.14)' }}><Icon name="check" size={16} />Save lead</button>
        </>
      }
    >
      <div style={{ padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '64vh', overflowY: 'auto' }}>
        <div>
          <label style={labelStyle}>Name</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="e.g. Riverside School" style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Town</label>
            <input value={form.town} onChange={(e) => set('town', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Town / city" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              {LEAD_CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Region</label>
            <select value={form.region} onChange={(e) => set('region', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              {REGION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Stage</label>
            <select value={form.stage} onChange={(e) => set('stage', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              {SALE_STAGES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Contact</label>
            <input value={form.contact} onChange={(e) => set('contact', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="Contact name" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={form.email} onChange={(e) => set('email', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} placeholder="name@example.com" style={inputStyle} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
