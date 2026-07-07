import { useStore } from './store';
import { makeTheme, type Theme } from './theme';
import type { Client, Job, Sale, WorkspaceConfig } from './types';

export interface WsView {
  wsId: string;
  wsCfg: WorkspaceConfig;
  theme: Theme;
  wsClients: Client[];
  wsJobs: Job[];
  wsSales: Sale[];
  wsTotal: number;
  wsRatio: number;
  inWs: (ws: string | undefined) => boolean;
}

export function useWs(): WsView {
  const { config, workspace, clients, jobs, sales } = useStore();
  const wsId = config.workspaceConfigs[workspace] ? workspace : 'schoolwebsites';
  const wsCfg = config.workspaceConfigs[wsId];
  const theme = makeTheme(wsCfg);
  const inWs = (ws: string | undefined) => wsId === 'combined' || (ws || 'schoolwebsites') === wsId;
  const match = <T extends { ws?: string }>(r: T) => inWs(r.ws);
  const wsJobs = jobs.filter(match);
  // Annual recurring revenue = sum of active jobs' annual hosting (live from data).
  const wsTotal = wsJobs.reduce((a, j) => a + (j.status !== 'Cancelled' ? (j.host || 0) : 0), 0);
  return {
    wsId,
    wsCfg,
    theme,
    wsClients: clients.filter(match),
    wsJobs,
    wsSales: sales.filter(match),
    wsTotal,
    // Scales the illustrative trend-line shape so it lands on the real total.
    wsRatio: wsTotal / 247658,
    inWs,
  };
}

// Derive an email address from a name + website domain, mirroring the prototype.
export function deriveEmail(name: string, website: string): string {
  const dom = (website || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').trim();
  if (name && name !== '—' && dom) return name.toLowerCase().split(' ')[0] + '@' + dom;
  return '—';
}
