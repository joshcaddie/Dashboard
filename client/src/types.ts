export type Workspace = 'schoolwebsites' | 'caddie' | 'combined';

export interface Contact {
  id: number;
  clientId: number;
  name: string;
  title: string;
  email: string;
  phone: string;
}

export interface Client {
  id: number;
  name: string;
  contact: string;
  type: string; // 'Client' | 'Lead'
  region: string;
  roll: string;
  website: string;
  ws: string;
  businessType: string;
  notes: string;
  phone: string;
  email: string;
  lastContacted: string | null;
  contacts: Contact[];
}

export interface Job {
  id: number;
  client: string;
  salesDate: string;
  jobType: string;
  status: string;
  dev: number;
  host: number; // annual
  hostingMonth: string;
  region: string;
  thisMonth: boolean;
  ws: string;
  salesChannel: string;
  referralPartner: string;
}

export interface SaleNote {
  id: number;
  saleId: number;
  text: string;
  ts: string;
}
export interface SaleTask {
  id: number;
  saleId: number;
  text: string;
  due: string;
  done: boolean;
}
export interface Sale {
  id: number;
  name: string;
  town: string;
  category: string;
  region: string;
  roll: number;
  principal: string;
  email: string;
  stage: string;
  ws: string;
  notes: SaleNote[];
  tasks: SaleTask[];
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

export interface NamedItem {
  id: number;
  name: string;
  order?: number;
}

export interface SentEmail {
  id: number;
  kind: string;
  refId: number;
  subject: string;
  body: string;
  day: string;
  time: string;
}

export interface KpiDef {
  key: string;
  label: string;
  raw: number;
}
export interface Stream {
  label: string;
  value: number;
  color: string;
}
export interface WorkspaceConfig {
  id: string;
  name: string;
  short: string;
  mark: string;
  tagline: string;
  icon: string;
  total: number;
  hasTargets: boolean;
  accent: string;
  soft: string;
  logo: string;
  revenueDefs: KpiDef[];
  countDefs: KpiDef[];
  streams: Stream[];
}
export interface DashboardConfig {
  workspaceConfigs: Record<string, WorkspaceConfig>;
  trendBase: number[];
  trendLabels: string[];
  monthlyBarsBase: [string, number][];
  seedRef: Record<number, string>;
}
