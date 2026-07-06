// Static demo dashboard configuration, faithful to the design prototype.
// Dynamic records (clients/jobs/sales) live in the DB; these are the agency-level
// recurring-revenue figures and chart baselines that the dashboard renders.

export type KpiDef = { key: string; label: string; raw: number };
export type Stream = { label: string; value: number; color: string };

export type WorkspaceConfig = {
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
  logo: string; // '' means render initials tile instead
  revenueDefs: KpiDef[];
  countDefs: KpiDef[];
  streams: Stream[];
};

const SW_ACCENT = '#0FA88E';
const CAD_ACCENT = '#E4032E';
const CMB_ACCENT = '#2B6CB0';

const swRevenueDefs: KpiDef[] = [
  { key: 'totalHosting', label: 'Total hosting', raw: 247658 },
  { key: 'websiteHosting', label: 'Website hosting', raw: 196500 },
  { key: 'newslettersRev', label: 'Newsletters', raw: 28152 },
  { key: 'chatBotsRev', label: 'Chat bots', raw: 9540 },
  { key: 'alumniRev', label: 'Alumni', raw: 14280 },
  { key: 'yearbookRev', label: 'Yearbook', raw: 38600 },
];
const swCountDefs: KpiDef[] = [
  { key: 'websites', label: 'Websites', raw: 272 },
  { key: 'newsletters', label: 'Newsletters', raw: 111 },
  { key: 'chatBots', label: 'Chat bots', raw: 18 },
  { key: 'alumni', label: 'Alumni', raw: 24 },
  { key: 'yearbook', label: 'Yearbook', raw: 46 },
];

export const workspaceConfigs: Record<string, WorkspaceConfig> = {
  schoolwebsites: {
    id: 'schoolwebsites',
    name: 'School Websites NZ', short: 'School Websites', mark: 'S', tagline: 'Websites & newsletters',
    icon: 'graduation-cap', total: 247658, hasTargets: true, accent: SW_ACCENT, soft: '#DCF3EE', logo: 'swnz-full.png',
    revenueDefs: swRevenueDefs, countDefs: swCountDefs,
    streams: [
      { label: 'Website hosting', value: 196500, color: SW_ACCENT },
      { label: 'Yearbook', value: 38600, color: '#6C5CE7' },
      { label: 'Newsletters', value: 28152, color: '#22B07A' },
      { label: 'Alumni & bots', value: 23820, color: '#E85B9A' },
    ],
  },
  caddie: {
    id: 'caddie',
    name: 'Caddie Digital', short: 'Caddie Digital', mark: 'C', tagline: 'Mastering digital together',
    icon: 'flag-triangle-right', total: 292380, hasTargets: true, accent: CAD_ACCENT, soft: '#FCE3E6', logo: 'caddie.svg',
    revenueDefs: [
      { key: 'cad_total', label: 'Total hosting', raw: 292380 },
      { key: 'cad_web', label: 'Website hosting', raw: 212865 },
      { key: 'cad_googleads', label: 'Google Ads', raw: 58164 },
      { key: 'cad_iubenda', label: 'IUBenda', raw: 6910 },
      { key: 'cad_hyper', label: 'Hyper', raw: 6786 },
      { key: 'cad_seo', label: 'SEO', raw: 5100 },
      { key: 'cad_cleantalk', label: 'CleanTalk', raw: 2515 },
    ],
    countDefs: [{ key: 'cad_websites', label: 'Websites', raw: 310 }],
    streams: [
      { label: 'Website hosting', value: 212865, color: CAD_ACCENT },
      { label: 'Google Ads', value: 58164, color: '#2B6CB0' },
      { label: 'SEO', value: 5100, color: '#22B07A' },
      { label: 'Hyper · IUBenda · CleanTalk', value: 16211, color: '#E85B9A' },
    ],
  },
  combined: {
    id: 'combined',
    name: 'Combined view', short: 'Combined', mark: '∑', tagline: 'Both agencies together',
    icon: 'layers', total: 540038, hasTargets: false, accent: CMB_ACCENT, soft: '#E1ECF8', logo: '',
    revenueDefs: [
      { key: 'cmb_total', label: 'Total recurring', raw: 540038 },
      { key: 'cmb_sw', label: 'School Websites NZ', raw: 247658 },
      { key: 'cmb_caddie', label: 'Caddie Digital', raw: 292380 },
      { key: 'cmb_web', label: 'Website hosting', raw: 409365 },
      { key: 'cad_googleads', label: 'Google Ads', raw: 58164 },
      { key: 'yearbookRev', label: 'Yearbook', raw: 38600 },
    ],
    countDefs: [
      { key: 'cmb_websites', label: 'Websites', raw: 582 },
      { key: 'newsletters', label: 'Newsletters', raw: 111 },
      { key: 'yearbook', label: 'Yearbook', raw: 46 },
      { key: 'alumni', label: 'Alumni', raw: 24 },
    ],
    streams: [
      { label: 'School Websites NZ', value: 247658, color: CMB_ACCENT },
      { label: 'Caddie Digital', value: 292380, color: '#2B6CB0' },
    ],
  },
};

export const trendBase = [178000, 184500, 189200, 195800, 201400, 207900, 213600, 221000, 228400, 236100, 242000, 247658];
export const trendLabels = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
export const monthlyBarsBase: [string, number][] = [
  ['Jan', 12400], ['Feb', 9800], ['Mar', 15600], ['Apr', 18900], ['May', 24300], ['Jun', 21700],
  ['Jul', 28900], ['Aug', 31200], ['Sep', 19400], ['Oct', 22600], ['Nov', 16800], ['Dec', 14100],
];
// Demo referral-partner attribution by job id (until real channel data exists).
export const seedRef: Record<number, string> = {
  1: 'Many Hats', 2: 'BNI', 3: 'Hyper', 10: 'Many Hats', 11: 'Webfox', 13: 'BNI',
  15: 'Torri', 18: 'Coast & Co', 201: 'Hyper', 202: 'Coast & Co', 204: 'Torri',
};
