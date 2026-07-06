import type { WorkspaceConfig } from './types';

export interface Theme {
  accent: string;
  soft: string;
  rowPad: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarTitle: string;
  sidebarText: string;
  sidebarMuted: string;
  sidebarCard: string;
  dark: boolean;
}

// Dark sidebar + comfortable density (the prototype's final defaults).
export function makeTheme(cfg: WorkspaceConfig | undefined): Theme {
  const accent = cfg?.accent || '#0FA88E';
  const soft = cfg?.soft || '#DCF3EE';
  const dark = true;
  return {
    accent,
    soft,
    rowPad: '12px',
    sidebarBg: dark ? '#0D1C2B' : '#FFFFFF',
    sidebarBorder: dark ? '#132738' : '#E6ECF1',
    sidebarTitle: dark ? '#F2F6F9' : '#12222F',
    sidebarText: dark ? '#9FB2C1' : '#4B5D6C',
    sidebarMuted: dark ? '#647C90' : '#94A2AE',
    sidebarCard: dark ? '#132738' : '#F5F8FA',
    dark,
  };
}
