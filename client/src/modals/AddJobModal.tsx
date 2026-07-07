import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Modal, labelStyle } from '../components/Modal';
import { Icon } from '../components/Icon';
import { money, num, JOB_TYPE_OPTIONS, STATUS_OPTIONS, MONTH_OPTIONS, REGION_OPTIONS } from '../lib';

export function AddJobModal({ onClose, initialClient }: { onClose: () => void; initialClient?: string }) {
  const store = useStore();
  const { theme, wsClients } = useWs();
  const accent = theme.accent, soft = theme.soft;
  const preClient = wsClients.find((c) => c.name === initialClient);
  const preRegion = preClient && REGION_OPTIONS.includes(preClient.region) ? preClient.region : 'Auckland';
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ client: initialClient || '', jobType: 'Website', salesDate: todayStr, status: 'Awaiting Brief', devRevenue: '', monthlyHosting: '', hostingMonth: 'August', region: preRegion, salesChannel: '', referralPartner: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const fieldFocus = (e: any) => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${soft}`; };
  const fieldBlur = (e: any) => { e.target.style.borderColor = '#DDE4EA'; e.target.style.boxShadow = 'none'; };
  const boxFocus = (e: any) => { const p = e.target.parentElement; p.style.borderColor = accent; p.style.boxShadow = `0 0 0 3px ${soft}`; };
  const boxBlur = (e: any) => { const p = e.target.parentElement; p.style.borderColor = '#DDE4EA'; p.style.boxShadow = 'none'; };

  const monthly = parseFloat(form.monthlyHosting) || 0;
  const dev = parseFloat(form.devRevenue) || 0;

  const saveJob = async () => {
    if (!form.client) return;
    const d = new Date(form.salesDate + 'T00:00:00');
    const disp = isNaN(d.getTime()) ? form.salesDate : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    const now = new Date();
    const thisMonth = !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    await store.addJob({ client: form.client, salesDate: disp, jobType: form.jobType, status: form.status, dev: parseFloat(form.devRevenue) || 0, host: (parseFloat(form.monthlyHosting) || 0) * 12, hostingMonth: form.hostingMonth, region: form.region, thisMonth, salesChannel: form.salesChannel, referralPartner: form.referralPartner });
    onClose();
  };

  const selectStyle = { width: '100%', padding: '12px 14px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff', color: '#33475A' } as const;

  return (
    <Modal
      title="Add new job"
      subtitle="Log a new sale or piece of work"
      onClose={onClose}
      maxWidth={600}
      footer={
        <>
          <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 13.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer' }}>Cancel</button>
          <button onClick={saveJob} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 17px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(15,30,44,.14)' }}><Icon name="check" size={16} />Save job</button>
        </>
      }
    >
      <div style={{ padding: '17px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '64vh', overflowY: 'auto' }}>
        <div>
          <label style={labelStyle}>Client</label>
          <select value={form.client} onChange={(e) => set('client', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
            <option value="">Select a client…</option>
            {wsClients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Job type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {JOB_TYPE_OPTIONS.map((t) => {
              const active = form.jobType === t;
              return (
                <button key={t} onClick={() => set('jobType', t)} style={{ padding: '9px 14px', borderRadius: 999, border: '1px solid ' + (active ? accent : '#DDE4EA'), cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: active ? soft : '#fff', color: active ? accent : '#5A6B7A' }}>{t}</button>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Sales date</label>
            <input type="date" value={form.salesDate} onChange={(e) => set('salesDate', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={{ width: '100%', padding: '11px 14px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 14, outline: 'none', color: '#33475A' }} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Development revenue</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #DDE4EA', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{ padding: '12px 12px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: 14 }}>$</span>
              <input value={form.devRevenue} onChange={(e) => set('devRevenue', e.target.value)} onFocus={boxFocus} onBlur={boxBlur} placeholder="0" inputMode="numeric" style={{ flex: 1, padding: '12px 14px', border: 'none', fontSize: 14, outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Monthly hosting</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #DDE4EA', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{ padding: '12px 12px', background: '#F4F7F9', color: '#7A8894', fontWeight: 700, fontSize: 14 }}>$</span>
              <input value={form.monthlyHosting} onChange={(e) => set('monthlyHosting', e.target.value)} onFocus={boxFocus} onBlur={boxBlur} placeholder="0" inputMode="numeric" style={{ flex: 1, padding: '12px 14px', border: 'none', fontSize: 14, outline: 'none', width: '100%' }} />
            </div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Annual hosting <span style={{ fontWeight: 500, color: '#94A2AE', textTransform: 'none' }}>(monthly × 12)</span></label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EEF2F5', borderRadius: 8, overflow: 'hidden', background: '#F4F7F9' }}>
            <span style={{ padding: '12px 12px', background: '#EBF0F3', color: '#7A8894', fontWeight: 700, fontSize: 14 }}>$</span>
            <div style={{ flex: 1, padding: '12px 14px', fontSize: 14, color: '#5A6B7A', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{num(monthly * 12)}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Hosting renews</label>
            <select value={form.hostingMonth} onChange={(e) => set('hostingMonth', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              {MONTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Region</label>
            <select value={form.region} onChange={(e) => set('region', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              {REGION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Sales channel</label>
            <select value={form.salesChannel} onChange={(e) => set('salesChannel', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
              <option value="">Select…</option>
              {store.channels.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {form.salesChannel === 'Referral Partner' && (
            <div>
              <label style={labelStyle}>Referral partner</label>
              <select value={form.referralPartner} onChange={(e) => set('referralPartner', e.target.value)} onFocus={fieldFocus} onBlur={fieldBlur} style={selectStyle}>
                <option value="">Select…</option>
                {store.partners.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#F8FAFB', borderRadius: 8 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#33475A' }}>Estimated total</div>
            <div style={{ fontSize: 11.5, color: '#8695A2' }}>Development + annual hosting</div>
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans',sans-serif", fontSize: 22, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{money(dev + monthly * 12)}</div>
        </div>
      </div>
    </Modal>
  );
}
