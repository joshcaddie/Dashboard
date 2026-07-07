import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useWs } from '../derive';
import { Icon } from '../components/Icon';

type Files = { clients: File | null; contacts: File | null; jobs: File | null };

const readText = (f: File | null): Promise<string> =>
  f ? f.text() : Promise.resolve('');

export function ImportSection() {
  const { user } = useAuth();
  const { theme, wsId, wsCfg } = useWs();
  const accent = theme.accent;
  const [files, setFiles] = useState<Files>({ clients: null, contacts: null, jobs: null });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (user?.role !== 'super_admin') return null;

  // The importer targets the workspace you're currently viewing. "Combined" is
  // a read-only view of both, so there's nothing single to import into.
  const isCombined = wsId === 'combined';
  const wsName = wsCfg.name;
  const otherName = wsId === 'caddie' ? 'School Websites' : 'Caddie';

  const pick = (key: keyof Files) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles((f) => ({ ...f, [key]: e.target.files?.[0] || null }));
    setMsg(null);
  };

  const run = async () => {
    if (busy || isCombined) return;
    if (!files.clients && !files.jobs) {
      setMsg({ ok: false, text: 'Choose at least the Clients or Jobs CSV.' });
      return;
    }
    if (!confirm(`This will PERMANENTLY DELETE all current ${wsName} clients, contacts and jobs, then load the uploaded spreadsheets in their place. Continue?`)) return;
    setBusy(true); setMsg(null);
    try {
      const [clientsCsv, contactsCsv, jobsCsv] = await Promise.all([
        readText(files.clients), readText(files.contacts), readText(files.jobs),
      ]);
      const r = await api.post('/import', { workspace: wsId, clientsCsv, contactsCsv, jobsCsv });
      const skips = [
        r.contactsSkipped ? `${r.contactsSkipped} contacts had no matching client` : '',
        r.jobsSkipped ? `${r.jobsSkipped} jobs had no client name` : '',
      ].filter(Boolean).join('; ');
      setMsg({ ok: true, text: `Imported ${r.clients} clients, ${r.contactsInserted} contacts and ${r.jobs} jobs${skips ? ` (skipped: ${skips})` : ''}. Reloading…` });
      setTimeout(() => window.location.reload(), 1400);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Import failed.' });
      setBusy(false);
    }
  };

  const card = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)', overflow: 'hidden' } as const;
  const fileRow = { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: '1px solid #EEF2F5', borderRadius: 8, background: '#FAFCFD' } as const;

  const filePicker = (key: keyof Files, label: string, hint: string) => (
    <div style={fileRow}>
      <Icon name="file-spreadsheet" size={18} style={{ color: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1B2E3D' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#8695A2' }}>{files[key] ? files[key]!.name : hint}</div>
      </div>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid #DDE4EA', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#4B5D6C', cursor: 'pointer', flexShrink: 0 }}>
        {files[key] ? 'Change' : 'Choose'}
        <input type="file" accept=".csv,text/csv" onChange={pick(key)} style={{ display: 'none' }} />
      </label>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, marginTop: 16 }}>
      <div style={card}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid #EEF2F5' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Import data — {isCombined ? 'select a workspace' : wsName}</div>
          <div style={{ fontSize: 12.5, color: '#8695A2', marginTop: 2 }}>Upload CSV exports to replace all {isCombined ? 'clients, contacts & jobs in one workspace' : `${wsName} clients, contacts & jobs`}</div>
        </div>
        <div style={{ padding: '16px 22px' }}>
          {isCombined ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', borderRadius: 8, background: '#EEF3F7', border: '1px solid #DCE6EE', fontSize: 12.5, color: '#4B5D6C', lineHeight: 1.5 }}>
              <Icon name="info" size={16} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
              <div>You're viewing the <strong>Combined</strong> workspace. Switch to a specific workspace (top-left) to import into it.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', borderRadius: 8, background: '#FEF6E7', border: '1px solid #F5E3BE', marginBottom: 14 }}>
                <Icon name="triangle-alert" size={16} style={{ color: '#B7791F', flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: '#8A6516', lineHeight: 1.5 }}>
                  This <strong>deletes and replaces</strong> every current {wsName} record. The {otherName} workspace is not affected. Contacts are matched to clients by business name.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filePicker('clients', 'Clients CSV', 'Business Name, Region, School Roll, Website…')}
                {filePicker('contacts', 'Contacts CSV', 'First/Last Name, Email, Business Name… (optional)')}
                {filePicker('jobs', 'Jobs CSV', 'Client Name, Job Type, Revenue, Hosting…')}
              </div>
              {msg && (
                <div style={{ fontSize: 12.5, fontWeight: 600, color: msg.ok ? '#2E7D6B' : '#C22F35', margin: '12px 2px 0' }}>{msg.text}</div>
              )}
              <div style={{ marginTop: 14 }}>
                <button onClick={run} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 17px', border: 'none', borderRadius: 8, background: busy ? '#9AA8B4' : '#C22F35', color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>
                  <Icon name="database" size={16} />{busy ? 'Importing…' : `Replace ${wsName} data`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
