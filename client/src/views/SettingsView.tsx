import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';
import { TeamSection } from './TeamSection';

export function SettingsView() {
  const store = useStore();
  const { theme } = useWs();
  const accent = theme.accent, soft = theme.soft;

  const [channelDraft, setChannelDraft] = useState('');
  const [partnerDraft, setPartnerDraft] = useState('');

  const addChannel = () => {
    const v = channelDraft.trim();
    if (!v) return;
    store.addChannel(v);
    setChannelDraft('');
  };
  const addPartner = () => {
    const v = partnerDraft.trim();
    if (!v) return;
    store.addPartner(v);
    setPartnerDraft('');
  };

  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;
  const input = { flex: 1, padding: '11px 13px', border: '1px solid #DDE4EA', borderRadius: 8, fontSize: 13.5, outline: 'none' } as const;
  const addBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 16px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 } as const;
  const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' } as const;
  const delBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', color: '#B6C1CB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

  return (
    <>
    <div style={{ maxWidth: 1000, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Sales channels</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Options shown when adding a job</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
            <input value={channelDraft} onChange={(e) => setChannelDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addChannel(); }} placeholder="Add a sales channel…" style={input} />
            <button onClick={addChannel} style={addBtn}><Icon name="plus" size={16} />Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {store.channels.map((c) => (
              <div key={c.id} style={rowStyle}>
                <Icon name="git-branch" size={16} style={{ color: accent }} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{c.name}</span>
                <button onClick={() => store.deleteChannel(c.id)} style={delBtn}><Icon name="trash-2" size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Referral partners</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Shown when the channel is “Referral Partner”</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
            <input value={partnerDraft} onChange={(e) => setPartnerDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addPartner(); }} placeholder="Add a referral partner…" style={input} />
            <button onClick={addPartner} style={addBtn}><Icon name="plus" size={16} />Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {store.partners.map((p) => (
              <div key={p.id} style={rowStyle}>
                <Icon name="handshake" size={16} style={{ color: accent }} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#1B2E3D' }}>{p.name}</span>
                <button onClick={() => store.deletePartner(p.id)} style={delBtn}><Icon name="trash-2" size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <TeamSection />
    </>
  );
}
