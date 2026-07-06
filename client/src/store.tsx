import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from './api';
import type {
  Client, Job, Sale, EmailTemplate, NamedItem, SentEmail, DashboardConfig, Workspace,
} from './types';
import { nowStamp } from './lib';

export type View =
  | 'dashboard' | 'clients' | 'sales' | 'jobs' | 'bymonth' | 'progress' | 'goals'
  | 'contacts' | 'settings' | 'salestasks' | 'emailtemplates'
  | 'clientDetail' | 'jobDetail' | 'clientEmails';

interface Store {
  ready: boolean;
  loadError: string | null;
  // data
  clients: Client[];
  jobs: Job[];
  sales: Sale[];
  templates: EmailTemplate[];
  channels: NamedItem[];
  partners: NamedItem[];
  targets: Record<string, number>;
  config: DashboardConfig;
  // navigation
  view: View;
  backView: View;
  workspace: Workspace;
  setWorkspace: (w: Workspace) => void;
  goto: (v: View) => void;
  setBack: (v: View) => void;
  // searches (global search drives clients + jobs, per the prototype)
  clientSearch: string;
  jobSearch: string;
  setClientSearch: (v: string) => void;
  setJobSearch: (v: string) => void;
  onGlobalSearch: (v: string) => void;
  selectedClientId: number | null;
  selectedJobId: number | null;
  setSelectedClientId: (id: number | null) => void;
  setSelectedJobId: (id: number | null) => void;
  // email archive navigation
  emailArchiveKind: 'client' | 'sale';
  emailArchiveSaleId: number | null;
  clientEmailFilter: string;
  setClientEmailFilter: (f: string) => void;
  openClient: (id: number) => void;
  openJob: (id: number) => void;
  openClientEmails: (id: number) => void;
  openSaleEmails: (id: number) => void;
  goBack: () => void;
  // effective ws for writes
  writeWs: () => string;
  // actions
  addClient: (form: any) => Promise<void>;
  deleteClient: (id: number) => Promise<void>;
  addContact: (clientId: number, form: any) => Promise<void>;
  removeContact: (clientId: number, contactId: number) => Promise<void>;
  addJob: (form: any) => Promise<void>;
  deleteJob: (id: number) => Promise<void>;
  patchJob: (id: number, patch: Partial<Job>) => Promise<void>;
  addLead: (form: any) => Promise<void>;
  setSaleStage: (id: number, stage: string) => Promise<void>;
  convertSale: (id: number, form: any) => Promise<void>;
  addSaleNote: (saleId: number, text: string) => Promise<void>;
  addSaleTask: (saleId: number, text: string, due: string) => Promise<void>;
  toggleSaleTask: (saleId: number, taskId: number, done: boolean) => Promise<void>;
  deleteSaleTask: (saleId: number, taskId: number) => Promise<void>;
  saveTemplate: (id: number | null, form: { name: string; subject: string; body: string }) => Promise<number>;
  deleteTemplate: (id: number) => Promise<number | null>;
  addChannel: (name: string) => Promise<void>;
  deleteChannel: (id: number) => Promise<void>;
  addPartner: (name: string) => Promise<void>;
  deletePartner: (id: number) => Promise<void>;
  setTarget: (key: string, value: number) => Promise<void>;
  sendEmail: (opts: { kind: 'client' | 'sale'; refId: number; subject: string; body: string }) => Promise<void>;
}

const StoreCtx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('useStore outside provider');
  return s;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [channels, setChannels] = useState<NamedItem[]>([]);
  const [partners, setPartners] = useState<NamedItem[]>([]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [config, setConfig] = useState<DashboardConfig | null>(null);

  const [view, setView] = useState<View>('dashboard');
  const [backView, setBackView] = useState<View>('clients');
  const [workspace, setWorkspaceState] = useState<Workspace>('schoolwebsites');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [emailArchiveKind, setEmailArchiveKind] = useState<'client' | 'sale'>('client');
  const [emailArchiveSaleId, setEmailArchiveSaleId] = useState<number | null>(null);
  const [clientEmailFilter, setClientEmailFilter] = useState('All');
  const [clientSearch, setClientSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const onGlobalSearch = (v: string) => { setClientSearch(v); setJobSearch(v); };

  const DETAIL_VIEWS: View[] = ['clientDetail', 'jobDetail', 'clientEmails'];
  const rememberBack = () => { if (!DETAIL_VIEWS.includes(view)) setBackView(view); };
  const openClient = (id: number) => { rememberBack(); setSelectedClientId(id); setView('clientDetail'); };
  const openJob = (id: number) => { rememberBack(); setSelectedJobId(id); setView('jobDetail'); };
  const openClientEmails = (id: number) => {
    rememberBack(); setSelectedClientId(id);
    setEmailArchiveKind('client'); setEmailArchiveSaleId(null); setClientEmailFilter('All');
    setView('clientEmails');
  };
  const openSaleEmails = (id: number) => {
    rememberBack();
    setEmailArchiveKind('sale'); setEmailArchiveSaleId(id); setClientEmailFilter('All');
    setView('clientEmails');
  };
  const goBack = () => setView(backView || 'clients');

  const load = useCallback(async () => {
    try {
      const [cl, jb, sa, tp, ch, pa, tg, cfg] = await Promise.all([
        api.get('/clients'), api.get('/jobs'), api.get('/sales'), api.get('/templates'),
        api.get('/channels'), api.get('/partners'), api.get('/targets'), api.get('/config'),
      ]);
      setClients(cl); setJobs(jb); setSales(sa); setTemplates(tp);
      setChannels(ch); setPartners(pa); setTargets(tg); setConfig(cfg);
      setReady(true);
    } catch (e: any) {
      setLoadError(e?.message || 'Failed to load');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const writeWs = () => (workspace === 'combined' ? 'schoolwebsites' : workspace);

  const setWorkspace = (w: Workspace) => {
    setWorkspaceState(w);
    setView('dashboard');
  };
  const goto = (v: View) => setView(v);

  // ---- clients ----
  const addClient = async (form: any) => {
    const created: Client = await api.post('/clients', { ...form, ws: writeWs() });
    setClients((cs) => [{ ...created, contacts: created.contacts || [] }, ...cs]);
  };
  const deleteClient = async (id: number) => {
    await api.del('/clients/' + id);
    setClients((cs) => cs.filter((c) => c.id !== id));
  };
  const addContact = async (clientId: number, form: any) => {
    const c = await api.post(`/clients/${clientId}/contacts`, form);
    setClients((cs) => cs.map((x) => (x.id === clientId ? { ...x, contacts: [...x.contacts, c] } : x)));
  };
  const removeContact = async (clientId: number, contactId: number) => {
    await api.del('/contacts/' + contactId);
    setClients((cs) => cs.map((x) => (x.id === clientId ? { ...x, contacts: x.contacts.filter((c) => c.id !== contactId) } : x)));
  };

  // ---- jobs ----
  const addJob = async (form: any) => {
    const created: Job = await api.post('/jobs', { ...form, ws: writeWs() });
    setJobs((js) => [created, ...js]);
  };
  const deleteJob = async (id: number) => {
    await api.del('/jobs/' + id);
    setJobs((js) => js.filter((j) => j.id !== id));
  };
  const patchJob = async (id: number, patch: Partial<Job>) => {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch } : j))); // optimistic
    await api.patch('/jobs/' + id, patch);
  };

  // ---- sales ----
  const addLead = async (form: any) => {
    const created: Sale = await api.post('/sales', { ...form, ws: writeWs() });
    setSales((ss) => [{ ...created, notes: created.notes || [], tasks: created.tasks || [] }, ...ss]);
  };
  const setSaleStage = async (id: number, stage: string) => {
    setSales((ss) => ss.map((s) => (s.id === id ? { ...s, stage } : s)));
    await api.patch('/sales/' + id, { stage });
  };
  const convertSale = async (id: number, form: any) => {
    const { client, job, sale } = await api.post(`/sales/${id}/convert`, form);
    setClients((cs) => [{ ...client, contacts: client.contacts || [] }, ...cs]);
    setJobs((js) => [job, ...js]);
    setSales((ss) => ss.map((s) => (s.id === id ? { ...s, stage: sale.stage } : s)));
  };
  const addSaleNote = async (saleId: number, text: string) => {
    const note = await api.post(`/sales/${saleId}/notes`, { text, ts: nowStamp() });
    setSales((ss) => ss.map((s) => (s.id === saleId ? { ...s, notes: [note, ...s.notes] } : s)));
  };
  const addSaleTask = async (saleId: number, text: string, due: string) => {
    const task = await api.post(`/sales/${saleId}/tasks`, { text, due });
    setSales((ss) => ss.map((s) => (s.id === saleId ? { ...s, tasks: [...s.tasks, task] } : s)));
  };
  const toggleSaleTask = async (saleId: number, taskId: number, done: boolean) => {
    setSales((ss) => ss.map((s) => (s.id === saleId ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)) } : s)));
    await api.patch('/tasks/' + taskId, { done });
  };
  const deleteSaleTask = async (saleId: number, taskId: number) => {
    await api.del('/tasks/' + taskId);
    setSales((ss) => ss.map((s) => (s.id === saleId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s)));
  };

  // ---- templates ----
  const saveTemplate = async (id: number | null, form: { name: string; subject: string; body: string }) => {
    if (id) {
      const t = await api.patch('/templates/' + id, form);
      setTemplates((ts) => ts.map((x) => (x.id === id ? t : x)));
      return id;
    }
    const t = await api.post('/templates', form);
    setTemplates((ts) => [...ts, t]);
    return t.id;
  };
  const deleteTemplate = async (id: number) => {
    await api.del('/templates/' + id);
    const rest = templates.filter((t) => t.id !== id);
    setTemplates(rest);
    return rest[0]?.id ?? null;
  };

  // ---- settings ----
  const addChannel = async (name: string) => {
    const c = await api.post('/channels', { name });
    setChannels((cs) => (cs.some((x) => x.id === c.id) ? cs : [...cs, c]));
  };
  const deleteChannel = async (id: number) => {
    await api.del('/channels/' + id);
    setChannels((cs) => cs.filter((c) => c.id !== id));
  };
  const addPartner = async (name: string) => {
    const p = await api.post('/partners', { name });
    setPartners((ps) => (ps.some((x) => x.id === p.id) ? ps : [...ps, p]));
  };
  const deletePartner = async (id: number) => {
    await api.del('/partners/' + id);
    setPartners((ps) => ps.filter((p) => p.id !== id));
  };

  // ---- targets ----
  const setTarget = async (key: string, value: number) => {
    setTargets((t) => ({ ...t, [key]: value }));
    await api.put('/targets/' + key, { value });
  };

  // ---- email ----
  const sendEmail = async (opts: { kind: 'client' | 'sale'; refId: number; subject: string; body: string }) => {
    const d = new Date();
    const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    await api.post('/sent-emails', { kind: opts.kind, refId: opts.refId, subject: opts.subject || '(no subject)', body: opts.body, day, time });
    if (opts.kind === 'client') {
      const today = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      await api.patch('/clients/' + opts.refId, { lastContacted: today });
      setClients((cs) => cs.map((c) => (c.id === opts.refId ? { ...c, lastContacted: today } : c)));
    } else {
      // log a timestamped email note on the sale
      const note = await api.post(`/sales/${opts.refId}/notes`, { text: '✉ Emailed: ' + (opts.subject || '(no subject)'), ts: nowStamp() });
      setSales((ss) => ss.map((s) => (s.id === opts.refId ? { ...s, notes: [note, ...s.notes] } : s)));
    }
  };

  const value: Store = {
    ready, loadError,
    clients, jobs, sales, templates, channels, partners, targets, config: config!,
    view, backView, workspace, setWorkspace, goto, setBack: setBackView,
    clientSearch, jobSearch, setClientSearch, setJobSearch, onGlobalSearch,
    selectedClientId, selectedJobId, setSelectedClientId, setSelectedJobId,
    emailArchiveKind, emailArchiveSaleId, clientEmailFilter, setClientEmailFilter,
    openClient, openJob, openClientEmails, openSaleEmails, goBack,
    writeWs,
    addClient, deleteClient, addContact, removeContact,
    addJob, deleteJob, patchJob,
    addLead, setSaleStage, convertSale,
    addSaleNote, addSaleTask, toggleSaleTask, deleteSaleTask,
    saveTemplate, deleteTemplate,
    addChannel, deleteChannel, addPartner, deletePartner,
    setTarget, sendEmail,
  };

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7C8C', fontSize: 14 }}>
        {loadError ? `Failed to load: ${loadError}` : 'Loading Schoolhub…'}
      </div>
    );
  }

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
