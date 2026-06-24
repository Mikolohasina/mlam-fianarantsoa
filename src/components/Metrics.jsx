/**
 * Metrics.jsx  —  src/components/Metrics.jsx
 * M'LAM Urban Monitoring System — Left sidebar
 * Premium Industrial / Corporate design
 */

import { Car, AlertOctagon, TrendingUp, Wind, Gauge, Activity } from 'lucide-react';

// ── Static seed (replaced by props from useCitySimulation) ───────────────────
const DEFAULT_KPIS = [
  { id: 'vehicles',   label: 'Vehicules actifs',  value: 42, Icon: Car,          theme: 'neutral' },
  { id: 'accidents',  label: 'Accidents detectes', value: 1,  Icon: AlertOctagon, theme: 'danger',  alertAt: 1 },
  { id: 'congestion', label: 'Embouteillages',     value: 3,  Icon: TrendingUp,   theme: 'warning', alertAt: 1 },
];

const DEFAULT_GAUGES = [
  { id: 'co2',  sector: 'Analakely',    metric: 'CO2',   value: 420, unit: 'ppm',   max: 1000, fill: 42, status: 'ok',       Icon: Wind  },
  { id: 'pm25', sector: 'Ankorondrano', metric: 'PM2.5', value: 35,  unit: 'ug/m3', max: 75,   fill: 75, status: 'elevated', Icon: Gauge },
];

// ── Tokens ───────────────────────────────────────────────────────────────────
const KPI_TOKENS = {
  neutral: { bg: 'bg-slate-100 dark:bg-slate-800',     icon: 'text-slate-500 dark:text-slate-400', value: 'text-slate-900 dark:text-slate-50' },
  danger:  { bg: 'bg-red-500/10 dark:bg-red-500/15',   icon: 'text-red-500 dark:text-red-400',     value: 'text-red-600 dark:text-red-400'    },
  warning: { bg: 'bg-amber-500/10 dark:bg-amber-500/15', icon: 'text-amber-500 dark:text-amber-400', value: 'text-amber-600 dark:text-amber-400' },
};

const GAUGE_TOKENS = {
  ok: {
    label: 'Normal', bar: 'bg-emerald-500 dark:bg-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    pct: 'text-emerald-500 dark:text-emerald-400',
  },
  elevated: {
    label: 'Eleve', bar: 'bg-amber-500 dark:bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    pct: 'text-amber-500 dark:text-amber-400',
  },
  critical: {
    label: 'Critique', bar: 'bg-red-500 dark:bg-red-400',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    pct: 'text-red-500 dark:text-red-400',
  },
};

// ── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ item }) {
  if (!item) return null;
  const isAlert = (item.alertAt != null) && ((item.value ?? 0) >= item.alertAt);
  const tokens  = isAlert ? (KPI_TOKENS[item.theme] ?? KPI_TOKENS.neutral) : KPI_TOKENS.neutral;
  const Icon    = item.Icon ?? Activity;

  return (
    <div className="group flex items-center gap-3 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
      <span className={'flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110 ' + tokens.bg}>
        <Icon size={16} strokeWidth={2} className={tokens.icon} />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-1.5">
          {item.label ?? 'N/A'}
        </span>
        <span className={'text-2xl font-bold tabular-nums tracking-tight leading-none ' + tokens.value}>
          {item.value ?? 0}
        </span>
      </div>
    </div>
  );
}

// ── GaugeCard ─────────────────────────────────────────────────────────────────
function GaugeCard({ item }) {
  if (!item) return null;
  const cfg  = GAUGE_TOKENS[item.status] ?? GAUGE_TOKENS.ok;
  const Icon = item.Icon ?? Activity;
  const fill = Math.min(100, Math.max(0, item.fill ?? 0));

  return (
    <div className="flex flex-col gap-2.5 rounded-xl px-4 py-3.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={13} strokeWidth={2} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 truncate">
            {item.sector ?? 'N/A'}
          </span>
        </div>
        <span className={'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold leading-none shrink-0 ' + cfg.badge}>
          {cfg.label}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 leading-none">
            {(item.value ?? 0).toLocaleString('fr-FR')}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{item.unit ?? ''}</span>
        </div>
        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">{item.metric ?? ''}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={'h-full rounded-full transition-all duration-700 ease-out ' + cfg.bar}
            style={{ width: fill + '%' }}
          />
        </div>
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-xs tabular-nums text-slate-300 dark:text-slate-700">0</span>
          <span className={'text-xs tabular-nums font-bold ' + cfg.pct}>{fill}%</span>
          <span className="text-xs tabular-nums text-slate-300 dark:text-slate-700">{item.max ?? 100} {item.unit ?? ''}</span>
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ color, label }) {
  return (
    <div className="flex items-center gap-2 px-1 mb-1">
      <span className={'block h-1 w-4 rounded-full ' + color} />
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">{label}</p>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function Metrics({ kpis, gauges }) {
  const safeKpis   = Array.isArray(kpis)   ? kpis   : DEFAULT_KPIS;
  const safeGauges = Array.isArray(gauges) ? gauges : DEFAULT_GAUGES;

  return (
    <div className="flex flex-col gap-5 p-3 overflow-y-auto h-full bg-slate-50 dark:bg-slate-950">
      <section className="flex flex-col gap-2">
        <SectionTitle color="bg-blue-500" label="Compteurs" />
        {safeKpis.map(item => item ? <KpiCard key={item.id ?? item.label} item={item} /> : null)}
      </section>

      <div className="h-px bg-slate-200 dark:bg-slate-800" />

      <section className="flex flex-col gap-2">
        <SectionTitle color="bg-emerald-500" label="Qualite de l'air" />
        {safeGauges.map(item => item ? <GaugeCard key={item.id ?? item.sector} item={item} /> : null)}
      </section>
    </div>
  );
}
