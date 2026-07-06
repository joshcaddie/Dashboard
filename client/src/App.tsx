import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardView } from './views/DashboardView';
import { ClientsView } from './views/ClientsView';
import { JobsView } from './views/JobsView';
import { ByMonthView } from './views/ByMonthView';
import { ProgressView } from './views/ProgressView';
import { SalesView } from './views/SalesView';
import { SalesTasksView } from './views/SalesTasksView';
import { GoalsView } from './views/GoalsView';
import { ContactsView } from './views/ContactsView';
import { SettingsView } from './views/SettingsView';
import { EmailTemplatesView } from './views/EmailTemplatesView';
import { ClientDetailView } from './views/ClientDetailView';
import { JobDetailView } from './views/JobDetailView';
import { ClientEmailsView } from './views/ClientEmailsView';

const TITLES: Record<string, [string, string]> = {
  dashboard: ['Dashboard', 'Agency performance at a glance'],
  clients: ['Clients', 'Manage your client & lead records'],
  sales: ['Sales', 'School prospecting pipeline'],
  salestasks: ['Sales tasks', 'Follow-ups & to-dos in date order'],
  emailtemplates: ['Email templates', 'Reusable outreach emails'],
  jobs: ['Jobs', 'Every website, newsletter & app sold'],
  bymonth: ['Jobs by month', 'Filter hosting renewals by month'],
  progress: ['Jobs in progress', 'Work currently moving through the pipeline'],
  goals: ['Goals', 'Set your annual targets'],
  settings: ['Settings', 'Manage sales channels & referral partners'],
  contacts: ['Client contacts', 'Key people across your accounts'],
  clientDetail: ['Client', 'Client detail'],
  jobDetail: ['Job', 'Job detail'],
  clientEmails: ['Emails', 'Gmail conversation history'],
};

export function App() {
  const store = useStore();
  const { view } = store;

  let [title, subtitle] = TITLES[view] || ['', ''];
  if (view === 'clientDetail') {
    const c = store.clients.find((x) => x.id === store.selectedClientId);
    if (c) { title = c.name; subtitle = 'Client detail'; }
  } else if (view === 'jobDetail') {
    const j = store.jobs.find((x) => x.id === store.selectedJobId);
    if (j) { title = j.client; subtitle = `${j.jobType} · Job detail`; }
  } else if (view === 'clientEmails') {
    if (store.emailArchiveKind === 'sale') {
      const s = store.sales.find((x) => x.id === store.emailArchiveSaleId);
      if (s) { title = s.name; subtitle = 'Email history'; }
    } else {
      const c = store.clients.find((x) => x.id === store.selectedClientId);
      if (c) { title = c.name; subtitle = 'Email history'; }
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar title={title} subtitle={subtitle} />
        <div style={{ padding: '20px 26px 52px', flex: 1 }}>
          {view === 'dashboard' && <DashboardView />}
          {view === 'clients' && <ClientsView />}
          {view === 'jobs' && <JobsView />}
          {view === 'bymonth' && <ByMonthView />}
          {view === 'progress' && <ProgressView />}
          {view === 'sales' && <SalesView />}
          {view === 'salestasks' && <SalesTasksView />}
          {view === 'goals' && <GoalsView />}
          {view === 'contacts' && <ContactsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'emailtemplates' && <EmailTemplatesView />}
          {view === 'clientDetail' && <ClientDetailView />}
          {view === 'jobDetail' && <JobDetailView />}
          {view === 'clientEmails' && <ClientEmailsView />}
        </div>
      </main>
    </div>
  );
}
