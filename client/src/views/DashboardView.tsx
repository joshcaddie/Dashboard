import { useState } from 'react';
import { useStore } from '../store';
import { useWs } from '../derive';
import { useModals } from '../modals/ModalProvider';
import { clientEmailContext } from '../emailCtx';
import { Icon } from '../components/Icon';
import { money, num, typeStyle, initials, avatarColors } from '../lib';
import type { KpiDef } from '../types';
import type { Theme as ThemeT } from '../theme';

interface KpiMeta { icon: string; iconBg: string; iconFg: string; }

function kpiMetaFor(key: string, theme: ThemeT): KpiMeta {
  const soft = theme.soft, accent = theme.accent;
  const M: Record<string, KpiMeta> = {
    totalHosting: { icon: 'repeat', iconBg: soft, iconFg: accent },
    websiteHosting: { icon: 'globe', iconBg: '#E1ECF8', iconFg: '#2B6CB0' },
    newslettersRev: { icon: 'mail', iconBg: '#DEF3E7', iconFg: '#1B7A45' },
    chatBotsRev: { icon: 'bot', iconBg: '#E5F1F0', iconFg: '#0E7C6E' },
    alumniRev: { icon: 'graduation-cap', iconBg: '#EAE4FA', iconFg: '#5C40C0' },
    yearbookRev: { icon: 'book-open', iconBg: '#FBE3ED', iconFg: '#B32C61' },
    websites: { icon: 'monitor', iconBg: '#E1ECF8', iconFg: '#2B6CB0' },
    newsletters: { icon: 'mail', iconBg: '#DEF3E7', iconFg: '#1B7A45' },
    chatBots: { icon: 'bot', iconBg: '#E5F1F0', iconFg: '#0E7C6E' },
    alumni: { icon: 'graduation-cap', iconBg: '#EAE4FA', iconFg: '#5C40C0' },
    yearbook: { icon: 'book-open', iconBg: '#FBE3ED', iconFg: '#B32C61' },
    cad_total: { icon: 'repeat', iconBg: soft, iconFg: accent },
    cad_web: { icon: 'globe', iconBg: '#E1ECF8', iconFg: '#2B6CB0' },
    cad_googleads: { icon: 'megaphone', iconBg: '#FBE3ED', iconFg: '#B32C61' },
    cad_iubenda: { icon: 'shield-check', iconBg: '#EAE4FA', iconFg: '#5C40C0' },
    cad_hyper: { icon: 'zap', iconBg: '#FBEFD3', iconFg: '#96660F' },
    cad_seo: { icon: 'search', iconBg: '#DEF3E7', iconFg: '#1B7A45' },
    cad_cleantalk: { icon: 'shield', iconBg: '#E5F1F0', iconFg: '#0E7C6E' },
    cad_websites: { icon: 'monitor', iconBg: '#E1ECF8', iconFg: '#2B6CB0' },
    cmb_total: { icon: 'repeat', iconBg: soft, iconFg: accent },
    cmb_sw: { icon: 'graduation-cap', iconBg: '#E1ECF8', iconFg: '#2B6CB0' },
    cmb_caddie: { icon: 'flag-triangle-right', iconBg: '#DEF3E7', iconFg: '#1B7A45' },
    cmb_web: { icon: 'globe', iconBg: '#EAE4FA', iconFg: '#5C40C0' },
    cmb_websites: { icon: 'monitor', iconBg: '#E1ECF8', iconFg: '#2B6CB0' },
  };
  return M[key] || { icon: 'circle-dollar-sign', iconBg: soft, iconFg: accent };
}

const CARD = { background: '#fff', border: '1px solid #E6ECF1', borderRadius: 8, boxShadow: '0 1px 2px rgba(16,32,46,.04)' } as const;

function KpiCard({ d, isMoney, hasTargets, target, theme }: { d: KpiDef; isMoney: boolean; hasTargets: boolean; target: number; theme: ThemeT }) {
  const meta = kpiMetaFor(d.key, theme);
  const t = hasTargets ? target : 0;
  const pct = t > 0 ? Math.min(100, Math.round((d.raw / t) * 100)) : 0;
  return (
    <div style={{ ...CARD, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 29, height: 29, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.iconBg, color: meta.iconFg }}><Icon name={meta.icon} size={15} /></span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#6B7C8C', lineHeight: 1.2 }}>{d.label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.02em', color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{isMoney ? money(d.raw) : num(d.raw)}</div>
        {t > 0 && (
          <>
            <div style={{ height: 5, borderRadius: 999, background: '#EEF2F5', overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: theme.accent, borderRadius: 999, transition: 'width .5s' }} /></div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94A2AE' }}>Target: {isMoney ? money(t) : num(t)}</div>
          </>
        )}
      </div>
    </div>
  );
}

export function DashboardView() {
  const store = useStore();
  const { theme, wsCfg, wsClients, wsJobs, wsRatio, wsTotal } = useWs();
  const { config, targets } = store;
  const modals = useModals();
  const accent = theme.accent, soft = theme.soft;
  const [hoverBar, setHoverBar] = useState<number | null>(null);
  // Clients skipped for this session — dropped from the prompt so the next
  // overdue client takes their place.
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  // Daily outreach prompt: clients not contacted in 60+ days (never-contacted
  // count as most overdue), oldest first, capped at 5.
  const now = Date.now();
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;
  const lastMs = (s: string | null) => (s ? Date.parse(s) : NaN);
  const toContact = wsClients
    .filter((c) => { if (skipped.has(c.id)) return false; const t = lastMs(c.lastContacted); return isNaN(t) || now - t > SIXTY_DAYS; })
    .sort((a, b) => (isNaN(lastMs(a.lastContacted)) ? 0 : lastMs(a.lastContacted)) - (isNaN(lastMs(b.lastContacted)) ? 0 : lastMs(b.lastContacted)))
    .slice(0, 5);
  const skip = (id: number) => setSkipped((s) => new Set(s).add(id));
  const ccCols = '2.2fr 1.3fr .9fr .55fr 1fr 118px';
  const ccIconBtn = { width: 32, height: 32, borderRadius: 8, border: '1px solid #EEF1F4', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

  // Recurring-revenue cards: the real annual-hosting total for each category,
  // computed from the jobs rather than static config numbers.
  const hostByType: Record<string, number> = {};
  let hostAll = 0;
  wsJobs.forEach((j) => { hostByType[j.jobType] = (hostByType[j.jobType] || 0) + (j.host || 0); hostAll += j.host || 0; });
  // Maps a revenue-card key to the job type whose hosting it sums ('*' = all types).
  const REV_TYPE: Record<string, string> = {
    totalHosting: '*', websiteHosting: 'Website', newslettersRev: 'Newsletter',
    chatBotsRev: 'Chat Bot', alumniRev: 'Alumni', yearbookRev: 'Year Book',
    cad_total: '*', cad_web: 'Website',
    cad_googleads: 'Google Ads', cad_iubenda: 'IUBenda', cad_hyper: 'Hyper',
    cad_seo: 'SEO', cad_cleantalk: 'CleanTalk',
  };
  const revValue = (d: KpiDef) => {
    const m = REV_TYPE[d.key];
    if (m === undefined) return d.raw; // no mapping (e.g. Caddie add-ons) → keep configured value
    return m === '*' ? hostAll : (hostByType[m] || 0);
  };

  // Client-number cards: real counts of jobs by type, again computed not static.
  const countByType: Record<string, number> = {};
  wsJobs.forEach((j) => { countByType[j.jobType] = (countByType[j.jobType] || 0) + 1; });
  const COUNT_TYPE: Record<string, string> = {
    websites: 'Website', newsletters: 'Newsletter', chatBots: 'Chat Bot',
    alumni: 'Alumni', yearbook: 'Year Book',
    cad_websites: 'Website', cmb_websites: 'Website',
  };
  const countValue = (d: KpiDef) => {
    const m = COUNT_TYPE[d.key];
    return m === undefined ? d.raw : (countByType[m] || 0);
  };

  // This month's sales
  const tmJobs = wsJobs.filter((j) => j.thisMonth);
  const tmDev = tmJobs.reduce((a, b) => a + b.dev, 0);
  const tmHost = tmJobs.reduce((a, b) => a + b.host, 0);

  // Trend
  const trendVals = config.trendBase.map((v) => Math.round(v * wsRatio));
  const minV = Math.round(170000 * wsRatio), maxV = Math.round(252000 * wsRatio), top = 24, bot = 250, x0 = 12, x1 = 988;
  const pts = trendVals.map((v, i) => {
    const x = x0 + (i * (x1 - x0)) / (trendVals.length - 1);
    const y = bot - ((v - minV) / (maxV - minV)) * (bot - top);
    return { x: +x.toFixed(1), y: +y.toFixed(1) };
  });
  const trendLine = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const trendArea = `${x0},${bot} ` + trendLine + ` ${x1},${bot}`;
  const trendLast = pts[pts.length - 1];

  // Hosting renewal bars
  const mh = config.monthlyBarsBase.map((m) => [m[0], Math.round(m[1] * wsRatio)] as [string, number]);
  const mhMax = Math.max(...mh.map((m) => m[1]));
  const peak = mh.reduce((a, b) => (b[1] > a[1] ? b : a));

  // Referral partner revenue
  const refMap: Record<string, number> = {};
  wsJobs.forEach((j) => {
    const rp = j.referralPartner || config.seedRef[j.id];
    if (rp) refMap[rp] = (refMap[rp] || 0) + (j.dev || 0) + (j.host || 0);
  });
  const refArr = Object.keys(refMap).map((k) => ({ name: k, value: refMap[k] })).sort((a, b) => b.value - a.value);
  const refMax = Math.max(1, ...refArr.map((r) => r.value));

  const stripLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#8695A2', paddingLeft: 2 };
  const smCols = '1.7fr .8fr .9fr .9fr .9fr';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1360 }}>
      {/* KPI strip: recurring revenue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={stripLabel}>Recurring revenue</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14 }}>
          {wsCfg.revenueDefs.map((d) => <KpiCard key={d.key} d={{ ...d, raw: revValue(d) }} isMoney hasTargets={wsCfg.hasTargets} target={targets[d.key] || 0} theme={theme} />)}
        </div>
      </div>

      {/* KPI strip: client numbers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={stripLabel}>Client numbers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
          {wsCfg.countDefs.map((d) => <KpiCard key={d.key} d={{ ...d, raw: countValue(d) }} isMoney={false} hasTargets={wsCfg.hasTargets} target={targets[d.key] || 0} theme={theme} />)}
        </div>
      </div>

      {/* Daily outreach: clients to reconnect with */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Clients to reconnect</div>
            <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 3 }}>Not contacted in 60+ days · reach out to 5 today to grow existing accounts</div>
          </div>
          <button onClick={() => store.goto('clients')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#3B4E60', cursor: 'pointer' }}>All clients<Icon name="arrow-right" size={15} /></button>
        </div>
        {toContact.length === 0 ? (
          <div style={{ padding: '34px 24px 40px', textAlign: 'center', color: '#7A8894' }}>
            <Icon name="party-popper" size={24} style={{ color: '#1B9E6E' }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 10 }}>All caught up — every client contacted within 60 days.</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: ccCols, gap: '0 16px', padding: '10px 24px', background: '#FAFCFD', borderTop: '1px solid #F0F3F6', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#93A1AD' }}>
              <span>Client</span><span>Contact</span><span>Region</span><span style={{ textAlign: 'right' }}>Roll</span><span>Last contacted</span><span></span>
            </div>
            {toContact.map((c) => {
              const av = avatarColors(c.name);
              return (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: ccCols, gap: '0 16px', alignItems: 'center', padding: '10px 24px', borderTop: '1px solid #F1F4F7' }}>
                  <div onClick={() => store.openClient(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, cursor: 'pointer' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: av[0], color: av[1] }}>{initials(c.name)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontSize: 11.5, color: '#9AA8B4' }}>{c.website || '—'}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#4B5D6C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contact || '—'}</div>
                  <div style={{ fontSize: 13, color: '#4B5D6C' }}>{c.region || '—'}</div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{c.roll}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: c.lastContacted ? '#4B5D6C' : '#B08A2E' }}><Icon name="clock" size={13} style={{ color: c.lastContacted ? '#B6C1CB' : '#D6A648' }} />{c.lastContacted || 'Never'}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button title="Skip — show the next client instead" onClick={() => skip(c.id)} style={{ ...ccIconBtn, color: '#8695A2' }}><Icon name="chevrons-right" size={15} /></button>
                    <button title="Email history" onClick={() => store.openClientEmails(c.id)} style={{ ...ccIconBtn, color: '#8695A2' }}><Icon name="list" size={15} /></button>
                    <button title="Send email" onClick={() => modals.openEmail(clientEmailContext(c))} style={{ ...ccIconBtn, color: accent, borderColor: soft, background: soft }}><Icon name="mail" size={15} /></button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* This month's sales */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 11px' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>This month's sales</div>
            <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 3 }}>{tmJobs.length} jobs sold · {money(tmDev + tmHost)} total</div>
          </div>
          <button onClick={() => store.goto('jobs')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E1E8ED', borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#3B4E60', cursor: 'pointer' }}>View all<Icon name="arrow-right" size={15} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: smCols, padding: '0 24px 8px', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9AA8B4' }}>
          <span>Client</span><span>Type</span><span style={{ textAlign: 'right' }}>Dev revenue</span><span style={{ textAlign: 'right' }}>Hosting</span><span style={{ textAlign: 'right' }}>Total</span>
        </div>
        {tmJobs.map((j) => (
          <div key={j.id} style={{ display: 'grid', gridTemplateColumns: smCols, alignItems: 'center', padding: '13px 24px', borderTop: '1px solid #F0F3F6' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B2E3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.client}</div>
              <div style={{ fontSize: 11.5, color: '#94A2AE' }}>{j.salesDate} · {j.region || '—'}</div>
            </div>
            <div><span style={typeStyle(j.jobType)}>{j.jobType}</span></div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{money(j.dev)}</div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#5A6B7A', fontVariantNumeric: 'tabular-nums' }}>{money(j.host)}</div>
            <div style={{ textAlign: 'right', fontSize: 14.5, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{money(j.dev + j.host)}</div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: smCols, alignItems: 'center', padding: '15px 24px', borderTop: '2px solid #E6ECF1', background: '#FAFCFD' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#33475A' }}>Total · {tmJobs.length} jobs</div>
          <div />
          <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#33475A', fontVariantNumeric: 'tabular-nums' }}>{money(tmDev)}</div>
          <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#33475A', fontVariantNumeric: 'tabular-nums' }}>{money(tmHost)}</div>
          <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{money(tmDev + tmHost)}</div>
        </div>
      </div>

      {/* Trend */}
      <div style={{ ...CARD, padding: '15px 18px 11px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Recurring revenue trend</div>
            <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 3 }}>Monthly recurring · last 12 months</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{money(wsTotal)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1B9E6E' }}>▲ 8.6% YoY</div>
          </div>
        </div>
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none" style={{ width: '100%', height: 250, display: 'block' }}>
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.26" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="12" y1="70" x2="988" y2="70" stroke="#EDF1F4" strokeWidth="1" />
          <line x1="12" y1="140" x2="988" y2="140" stroke="#EDF1F4" strokeWidth="1" />
          <line x1="12" y1="210" x2="988" y2="210" stroke="#EDF1F4" strokeWidth="1" />
          <polygon points={trendArea} fill="url(#areaFill)" />
          <polyline points={trendLine} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={trendLast.x} cy={trendLast.y} r="6" fill="#fff" stroke={accent} strokeWidth="3.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px 4px', fontSize: 11, fontWeight: 600, color: '#9AA8B4' }}>
          {config.trendLabels.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </div>

      {/* Hosting renewals */}
      <div style={{ ...CARD, padding: '15px 18px 12px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Hosting renewals</div>
        <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 3, marginBottom: 20 }}>Annual hosting due, by month</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 180 }}>
          {mh.map((m, i) => {
            const hov = i === hoverBar;
            const heightPct = +((m[1] / mhMax) * 100).toFixed(1);
            return (
              <div key={i} onMouseEnter={() => setHoverBar(i)} onMouseLeave={() => setHoverBar(null)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', cursor: 'default' }}>
                <div style={{ position: 'relative', flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', bottom: `${heightPct}%`, left: '50%', transform: 'translateX(-50%)', marginBottom: 8, background: '#0F2233', color: '#fff', padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 6, boxShadow: '0 6px 16px -5px rgba(15,34,51,.45)', fontVariantNumeric: 'tabular-nums', opacity: hov ? 1 : 0, pointerEvents: 'none', transition: 'opacity .15s' }}>
                    {money(m[1])}
                    <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', border: '5px solid transparent', borderTopColor: '#0F2233' }} />
                  </div>
                  <div style={{ width: '100%', maxWidth: 22, borderRadius: '6px 6px 3px 3px', background: m[1] === mhMax || hov ? accent : theme.soft, height: `${heightPct}%`, minHeight: 6, transition: 'background .18s, height .5s cubic-bezier(.4,0,.2,1)' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: hov ? '#33475A' : '#9AA8B4' }}>{m[0]}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F0F3F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: '#6B7C8C' }}>Peak month</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F2233' }}>{peak[0]} · {money(peak[1])}</span>
        </div>
      </div>

      {/* Revenue by referral partner */}
      <div style={{ ...CARD, padding: '15px 18px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#12222F' }}>Revenue by referral partner</div>
        <div style={{ fontSize: 12.5, color: '#6B7C8C', marginTop: 3, marginBottom: 18 }}>Total job revenue from referral-partner leads</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {refArr.map((b) => (
            <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '7px 0' }}>
              <div style={{ width: 150, flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#33475A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
              <div style={{ flex: 1, height: 14, borderRadius: 999, background: '#EEF2F5', overflow: 'hidden' }}><div style={{ height: '100%', width: `${+((b.value / refMax) * 100).toFixed(1)}%`, background: accent, borderRadius: 999, transition: 'width .5s' }} /></div>
              <div style={{ width: 84, flexShrink: 0, textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: '#0F2233', fontVariantNumeric: 'tabular-nums' }}>{money(b.value)}</div>
            </div>
          ))}
          {refArr.length === 0 && <div style={{ padding: 30, textAlign: 'center', color: '#9AA8B4', fontSize: 13.5, fontWeight: 600 }}>No referral-partner revenue yet</div>}
        </div>
      </div>
    </div>
  );
}
