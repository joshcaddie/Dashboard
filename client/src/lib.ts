import type { CSSProperties } from 'react';

export function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function num(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function pill(bg: string, fg: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 11px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color: fg,
    whiteSpace: 'nowrap',
    lineHeight: 1.35,
  };
}

const TYPE_MAP: Record<string, [string, string]> = {
  Website: ['#E7EDF3', '#31465B'],
  Newsletter: ['#DEF3E7', '#1B7A45'],
  'Newsletter ads': ['#FBE3ED', '#B32C61'],
  'Custom App': ['#E2ECFB', '#245AC0'],
  'Year Book': ['#FAEED0', '#96660F'],
  'Chat Bot': ['#EAE4FA', '#5C40C0'],
  'Other job': ['#EAEEF1', '#48596A'],
  Alumni: ['#E5F1F0', '#0E7C6E'],
  'Google Ads': ['#FBE3ED', '#B32C61'],
  IUBenda: ['#EAE4FA', '#5C40C0'],
  Hyper: ['#FBEFD3', '#96660F'],
  SEO: ['#DEF3E7', '#1B7A45'],
  CleanTalk: ['#E5F1F0', '#0E7C6E'],
};
export function typeStyle(t: string): CSSProperties {
  const c = TYPE_MAP[t] || ['#EAEEF1', '#48596A'];
  return pill(c[0], c[1]);
}

const STATUS_MAP: Record<string, [string, string]> = {
  'Awaiting Brief': ['#FAEED0', '#96660F'],
  'In Design': ['#EAE4FA', '#5C40C0'],
  'In Progress': ['#E2ECFB', '#245AC0'],
  Complete: ['#DEF3E7', '#1B7A45'],
  Cancelled: ['#FBE0E1', '#C22F35'],
};
export function statusStyle(s: string): CSSProperties {
  const c = STATUS_MAP[s] || ['#EAEEF1', '#48596A'];
  return pill(c[0], c[1]);
}

export function clientTypeStyle(t: string, accent: string, soft: string): CSSProperties {
  const m: Record<string, [string, string]> = {
    Client: [soft, accent],
    Lead: ['#FAEED0', '#96660F'],
    Trial: ['#E2ECFB', '#245AC0'],
  };
  const c = m[t] || [soft, accent];
  return pill(c[0], c[1]);
}

export const CATEGORY_MAP: Record<string, [string, string]> = {
  Primary: ['#DEF3E7', '#1B7A45'],
  Intermediate: ['#E1ECF8', '#2B6CB0'],
  Secondary: ['#EAE4FA', '#5C40C0'],
  'Composite / Area': ['#E7E9FB', '#4B45C4'],
  'Specialist / Other': ['#EAEEF1', '#48596A'],
};
export function categoryStyle(c: string): CSSProperties {
  const x = CATEGORY_MAP[c] || ['#EAEEF1', '#48596A'];
  return pill(x[0], x[1]);
}

export const STAGE_MAP: Record<string, [string, string]> = {
  New: ['#EAEEF1', '#48596A'],
  Contacted: ['#E1ECF8', '#2B6CB0'],
  Interested: ['#E5F1F0', '#0E7C6E'],
  Proposal: ['#FAEED0', '#96660F'],
  Won: ['#DEF3E7', '#1B7A45'],
  Lost: ['#FBE0E1', '#C22F35'],
};
export function stageStyle(s: string): CSSProperties {
  const x = STAGE_MAP[s] || ['#EAEEF1', '#48596A'];
  return pill(x[0], x[1]);
}

export function initials(name: string): string {
  const w = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/);
  return (((w[0] || '')[0] || '') + ((w[1] || '')[0] || '')).toUpperCase() || '—';
}

const PALETTE: [string, string][] = [
  ['#DCF3EE', '#0E8F7B'],
  ['#E1ECF8', '#2B6CB0'],
  ['#FAEED0', '#96660F'],
  ['#EAE4FA', '#5C40C0'],
  ['#DEF3E7', '#1B7A45'],
  ['#FBE3ED', '#B32C61'],
];
export function avatarColors(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
}

export function rollBand(n: number): string {
  n = n || 0;
  if (n <= 50) return '1–50';
  if (n <= 150) return '51–150';
  if (n <= 300) return '151–300';
  if (n <= 600) return '301–600';
  return '600+';
}

// Today, fixed to match the design's reference date (the prototype used 2026-07-06).
export const TODAY = new Date('2026-07-06T00:00:00');

export function fmtDue(d: string): string {
  if (!d) return 'No date';
  const dt = new Date(d + 'T00:00:00');
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function nowStamp(): string {
  const d = new Date();
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

export function htmlToText(html: string): string {
  let t = (html || '').replace(/<\/(p|div)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n');
  const d = document.createElement('div');
  d.innerHTML = t;
  return (d.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

export const JOB_TYPE_OPTIONS = ['Website', 'Newsletter', 'Newsletter ads', 'Custom App', 'Year Book', 'Chat Bot', 'Alumni', 'Google Ads', 'IUBenda', 'Hyper', 'SEO', 'CleanTalk', 'Other job'];
export const STATUS_OPTIONS = ['Awaiting Brief', 'In Design', 'In Progress', 'Complete'];
export const MONTH_OPTIONS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const REGION_OPTIONS = ['Auckland', 'Waikato', 'Bay of Plenty', 'Hawkes Bay', 'Wellington', 'Wairarapa', 'Canterbury', 'Otago', 'Southland', 'Northland'];
export const ROLL_OPTIONS = ['1–50', '51–150', '151–300', '301–600', '600+'];
export const BUSINESS_TYPE_OPTIONS = ['Primary School', 'Intermediate', 'Secondary School', 'Area School', 'Kura Kaupapa', 'Preschool', 'Business'];
export const SALE_STAGES = ['New', 'Contacted', 'Interested', 'Proposal', 'Won', 'Lost'];
export const LEAD_CATEGORIES = ['Primary', 'Intermediate', 'Secondary', 'Composite / Area', 'Specialist / Other'];
