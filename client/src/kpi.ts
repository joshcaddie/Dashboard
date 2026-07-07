import type { KpiDef, Job } from './types';

// Maps a revenue-card key to the job type whose annual hosting it sums
// ('*' = all types), and a client-number key to the job type it counts.
const REV_TYPE: Record<string, string> = {
  totalHosting: '*', websiteHosting: 'Website', newslettersRev: 'Newsletter',
  chatBotsRev: 'Chat Bot', alumniRev: 'Alumni', yearbookRev: 'Year Book',
  cad_total: '*', cad_web: 'Website',
  cad_googleads: 'Google Ads', cad_iubenda: 'IUBenda', cad_hyper: 'Hyper',
  cad_seo: 'SEO', cad_cleantalk: 'CleanTalk',
};
const COUNT_TYPE: Record<string, string> = {
  websites: 'Website', newsletters: 'Newsletter', chatBots: 'Chat Bot',
  alumni: 'Alumni', yearbook: 'Year Book', cad_websites: 'Website', cmb_websites: 'Website',
};

// The real current value for a KPI, computed from the workspace's jobs.
// Falls back to the configured value for keys with no job-type mapping
// (e.g. Caddie add-ons that aren't derived from data).
export function kpiValue(d: KpiDef, wsJobs: Job[]): number {
  const rev = REV_TYPE[d.key];
  if (rev !== undefined) {
    return wsJobs.reduce((a, j) => a + (rev === '*' || j.jobType === rev ? (j.host || 0) : 0), 0);
  }
  const cnt = COUNT_TYPE[d.key];
  if (cnt !== undefined) {
    return wsJobs.reduce((a, j) => a + (j.jobType === cnt ? 1 : 0), 0);
  }
  return d.raw;
}
