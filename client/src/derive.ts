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
  return {
    wsId,
    wsCfg,
    theme,
    wsClients: clients.filter(match),
    wsJobs: jobs.filter(match),
    wsSales: sales.filter(match),
    wsTotal: wsCfg.total,
    wsRatio: wsCfg.total / 247658,
    inWs,
  };
}

// Derive an email address from a name + website domain, mirroring the prototype.
export function deriveEmail(name: string, website: string): string {
  const dom = (website || '').replace(/^www\./, '');
  if (name && name !== '—' && dom) return name.toLowerCase().split(' ')[0] + '@' + dom;
  return '—';
}
