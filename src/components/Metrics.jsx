/**
 * Metrics.jsx  —  src/components/Metrics.jsx
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Valeurs de référence environnementales pour Fianarantsoa :
 *   CO2    : 390-420 ppm  (ville de 200k hab, altitude 1200m, moins polluée)
 *   PM2.5  : 8-15 µg/m3  (seuil OMS : 15 µg/m3 — air relativement propre)
 *   Trafic : variable sur la RN7, pic aux heures de marché
 */
import { useState, useEffect } from 'react';
import {
  Car, AlertOctagon, TrendingUp, TrendingDown,
  Wind, Gauge, Activity, Clock, Thermometer,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Données par défaut — Fianarantsoa (pas Antananarivo)
// ─────────────────────────────────────────────────────────────────────────────
const KPI_DEFAUT = [
  { id: 'vehicles',   label: 'Vehicules actifs',  value: 157, Icon: Car,          theme: 'neutral' },
  { id: 'accidents',  label: 'Accidents detectes', value: 0,   Icon: AlertOctagon, theme: 'danger',  alertAt: 1 },
  { id: 'congestion', label: 'Embouteillages',     value: 1,   Icon: TrendingUp,   theme: 'warning', alertAt: 1 },
];

const METRIQUES_DEFAUT = [
  {
    id: 'co2',
    label: "Qualite de l'air",
    sublabel: 'CO2',
    value: 405,
    unit: 'ppm',
    max: 800,
    fill: 51,
    status: 'ok',
    reference: 'Ref. ville : 390-420 ppm',
  },
  {
    id: 'pm25',
    label: 'Particules fines',
    sublabel: 'PM2.5',
    value: 11,
    unit: 'µg/m3',
    max: 75,
    fill: 15,
    status: 'ok',
    reference: 'Seuil OMS : 15 µg/m3',
  },
  {
    id: 'traffic',
    label: 'Densite trafic',
    sublabel: 'RN7',
    value: 52,
    unit: '%',
    max: 100,
    fill: 52,
    status: 'ok',
    reference: 'Axe principal Fianarantsoa',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Jetons de design — révisés Cyber-Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const THEME_KPI = {
  neutral: {
    iconBg:  'bg-slate-200/60 dark:bg-slate-800/80',
    icon:    'text-slate-500 dark:text-slate-400',
    value:   'text-slate-800 dark:text-slate-100',
    anneau:  '',
    glow:    '',
  },
  danger: {
    iconBg:  'bg-red-500/10 dark:bg-red-500/15',
    icon:    'text-red-500 dark:text-red-400',
    value:   'text-red-600 dark:text-red-400',
    anneau:  'ring-1 ring-inset ring-red-500/40 dark:ring-red-400/25',
    glow:    'shadow-[0_0_16px_-4px_rgba(239,68,68,0.25)]',
  },
  warning: {
    iconBg:  'bg-amber-500/10 dark:bg-amber-500/15',
    icon:    'text-amber-500 dark:text-amber-400',
    value:   'text-amber-600 dark:text-amber-400',
    anneau:  'ring-1 ring-inset ring-amber-500/40 dark:ring-amber-400/25',
    glow:    'shadow-[0_0_16px_-4px_rgba(245,158,11,0.2)]',
  },
};

const CONFIG_STATUT = {
  ok: {
    label:  'Normal',
    barre:  'bg-emerald-500 dark:bg-emerald-400',
    badge:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 dark:border-emerald-400/20',
    pct:    'text-emerald-600 dark:text-emerald-400',
    dot:    'bg-emerald-500',
    Trend:  TrendingDown,
  },
  elevated: {
    label:  'Eleve',
    barre:  'bg-amber-500 dark:bg-amber-400',
    badge:  'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 dark:border-amber-400/20',
    pct:    'text-amber-600 dark:text-amber-400',
    dot:    'bg-amber-500',
    Trend:  TrendingUp,
  },
  critical: {
    label:  'Critique',
    barre:  'bg-red-500 dark:bg-red-400',
    badge:  'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/25 dark:border-red-400/20',
    pct:    'text-red-600 dark:text-red-400',
    dot:    'bg-red-500',
    Trend:  TrendingUp,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Horloge locale — Fianarantsoa (UTC+3)
// ─────────────────────────────────────────────────────────────────────────────
function HorlogeFiana() {
  const formater = () =>
    new Date().toLocaleTimeString('fr-MG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Indian/Antananarivo',
    });

  const [heure, setHeure] = useState(formater);

  useEffect(() => {
    const id = setInterval(() => setHeure(formater()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={[
      'glass-widget',
      'flex items-center justify-between',
      'px-3.5 py-2.5 rounded-xl',
    ].join(' ')}>
      <div className="flex items-center gap-1.5">
        <Clock size={11} strokeWidth={2} className="text-sky-400 dark:text-sky-500 shrink-0" />
        <span className="text-xs font-semibold text-white/80 dark:text-slate-400 tracking-wide">
          Fianarantsoa
        </span>
      </div>
      <span className="text-xs font-mono font-bold text-white dark:text-slate-200 tabular-nums tracking-widest">
        {heure}
      </span>
      <span className="text-xs font-mono text-white/50 dark:text-slate-600">
        UTC+3
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CarteKPI — compteur avec icône et valeur
// ─────────────────────────────────────────────────────────────────────────────
function CarteKPI({ item }) {
  if (!item) return null;

  const actif  = (item.alertAt != null) && ((item.value ?? 0) >= item.alertAt);
  const tokens = actif ? (THEME_KPI[item.theme] ?? THEME_KPI.neutral) : THEME_KPI.neutral;
  const Icon   = item.Icon ?? Activity;

  return (
    <div className={[
      'glass-widget',
      'group relative flex items-center gap-3',
      'rounded-xl px-3.5 py-3',
      'transition-all duration-300 ease-out',
      'hover:-translate-y-0.5',
      actif ? [tokens.anneau, tokens.glow].join(' ') : '',
    ].join(' ')}>

      {/* Pastille d'alerte pulsante */}
      {actif && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-10">
          <span className={[
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-70',
            item.theme === 'danger' ? 'bg-red-400' : 'bg-amber-400',
          ].join(' ')} />
          <span className={[
            'relative inline-flex rounded-full h-2.5 w-2.5',
            item.theme === 'danger' ? 'bg-red-500' : 'bg-amber-500',
          ].join(' ')} />
        </span>
      )}

      {/* Icône */}
      <span className={[
        'flex items-center justify-center h-9 w-9 rounded-lg shrink-0',
        'transition-transform duration-200 group-hover:scale-110',
        tokens.iconBg,
      ].join(' ')}>
        <Icon size={15} strokeWidth={2} className={tokens.icon} />
      </span>

      {/* Texte */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/60 dark:text-slate-500 leading-none mb-1.5 truncate">
          {item.label ?? 'N/A'}
        </span>
        <span className={[
          'text-2xl font-bold tabular-nums tracking-tight leading-none font-mono',
          'transition-colors duration-300',
          tokens.value,
        ].join(' ')}>
          {item.value ?? 0}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CarteJauge — métrique environnementale avec barre de progression
// ─────────────────────────────────────────────────────────────────────────────
function CarteJauge({ item }) {
  if (!item) return null;

  const cfg   = CONFIG_STATUT[item.status] ?? CONFIG_STATUT.ok;
  const Trend = cfg.Trend;
  const fill  = Math.min(100, Math.max(0, item.fill ?? 0));

  const IconMetrique = item.id === 'co2'
    ? Wind
    : item.id === 'pm25'
      ? Gauge
      : item.id === 'temperature'
        ? Thermometer
        : TrendingUp;

  return (
    <div className={[
      'glass-widget',
      'group flex flex-col gap-2.5',
      'rounded-xl px-3.5 py-3.5',
      'transition-all duration-300 ease-out',
      'hover:-translate-y-0.5',
    ].join(' ')}>

      {/* En-tête */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <IconMetrique
            size={12}
            strokeWidth={2}
            className="text-white/50 dark:text-slate-500 shrink-0 transition-transform duration-200 group-hover:scale-110"
          />
          <span className="text-xs font-bold uppercase tracking-widest text-white/80 dark:text-slate-300 truncate">
            {item.label ?? 'N/A'}
          </span>
        </div>

        {/* Badge statut avec pastille colorée */}
        <span className={[
          'inline-flex items-center gap-1.5 shrink-0',
          'px-2 py-0.5 rounded-full text-xs font-bold leading-none',
          cfg.status === 'critical' ? 'animate-pulse' : '',
          cfg.badge,
        ].join(' ')}>
          <span className={['h-1.5 w-1.5 rounded-full shrink-0', cfg.dot].join(' ')} />
          <Trend size={8} strokeWidth={2.5} />
          {cfg.label}
        </span>
      </div>

      {/* Valeur principale */}
      <div className="flex items-end justify-between gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight font-mono text-white dark:text-slate-50 leading-none">
            {typeof item.value === 'number'
              ? item.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
              : (item.value ?? '—')}
          </span>
          <span className="text-xs font-medium text-white/50 dark:text-slate-500 mb-0.5">
            {item.unit ?? ''}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-white/40 dark:text-slate-500 shrink-0">
          {item.sublabel ?? ''}
        </span>
      </div>

      {/* Barre de progression */}
      <div
        role="progressbar"
        aria-valuenow={item.value ?? 0}
        aria-valuemin={0}
        aria-valuemax={item.max ?? 100}
        aria-label={`${item.label} : ${item.value} ${item.unit}`}
      >
        <div className="h-1.5 w-full rounded-full bg-white/10 dark:bg-slate-800 overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all duration-700 ease-out',
              cfg.barre,
            ].join(' ')}
            style={{ width: `${fill}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs tabular-nums text-white/30 dark:text-slate-600 font-mono">0</span>
          <span className={['text-xs tabular-nums font-bold font-mono', cfg.pct].join(' ')}>
            {fill}%
          </span>
          <span className="text-xs tabular-nums text-white/30 dark:text-slate-600 font-mono">
            {item.max}{item.unit}
          </span>
        </div>
      </div>

      {/* Note de référence */}
      {item.reference && (
        <p className={[
          'text-xs italic leading-snug',
          'border-t border-white/10 dark:border-slate-800 pt-2',
          'text-white/40 dark:text-slate-600',
        ].join(' ')}>
          {item.reference}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TitreSection — séparateur avec marqueur coloré
// ─────────────────────────────────────────────────────────────────────────────
function TitreSection({ couleur, texte, extra }) {
  return (
    <div className="flex items-center justify-between px-1 mb-1">
      <div className="flex items-center gap-2">
        <span className={['block h-1 w-4 rounded-full', couleur].join(' ')} />
        <p className="text-xs font-bold uppercase tracking-widest text-white/50 dark:text-slate-600">
          {texte}
        </p>
      </div>
      {extra && (
        <span className="text-xs font-mono text-white/30 dark:text-slate-700">{extra}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Diviseur de section
// ─────────────────────────────────────────────────────────────────────────────
function Diviseur() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-white/10 dark:via-slate-700/60 to-transparent mx-1" />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export principal — aucune logique JS modifiée
// ─────────────────────────────────────────────────────────────────────────────
export default function Metrics({ metrics, kpis }) {
  const kpisAffichage = [
    { ...KPI_DEFAUT[0], value: kpis?.vehicles   ?? KPI_DEFAUT[0].value },
    { ...KPI_DEFAUT[1], value: kpis?.accidents  ?? KPI_DEFAUT[1].value },
    { ...KPI_DEFAUT[2], value: kpis?.congestion ?? KPI_DEFAUT[2].value },
  ];

  const source = Array.isArray(metrics) && metrics.length > 0 ? metrics : METRIQUES_DEFAUT;
  const metriquesEnv = source
    .filter(Boolean)
    .map(m => ({
      ...m,
      reference: m.reference ?? (METRIQUES_DEFAUT.find(d => d.id === m.id)?.reference ?? null),
    }));

  const envPollution = metriquesEnv.filter(m => m?.id !== 'traffic');
  const envTrafic    = metriquesEnv.filter(m => m?.id === 'traffic');

  return (
    <div className={[
      'flex flex-col gap-4 p-3 overflow-y-auto h-full',
      // Fond de la colonne — transparent pour laisser le theme-cyber-dashboard respirer
      'bg-transparent',
      // Scrollbar discrète
      '[&::-webkit-scrollbar]:w-1',
      '[&::-webkit-scrollbar-track]:bg-transparent',
      '[&::-webkit-scrollbar-thumb]:rounded-full',
      '[&::-webkit-scrollbar-thumb]:bg-white/10 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700',
    ].join(' ')}>

      {/* Horloge locale */}
      <HorlogeFiana />

      {/* ── Section 1 — Compteurs KPI ────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <TitreSection couleur="bg-sky-400" texte="Compteurs" />
        {kpisAffichage.map(item => (
          <CarteKPI key={item.id} item={item} />
        ))}
      </section>

      <Diviseur />

      {/* ── Section 2 — Qualité de l'air ─────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <TitreSection
          couleur="bg-emerald-400"
          texte="Qualite de l'air"
          extra="Fianarantsoa"
        />
        {envPollution.map(item => (
          <CarteJauge key={item.id} item={item} />
        ))}
      </section>

      <Diviseur />

      {/* ── Section 3 — Trafic RN7 ───────────────────────────────────────── */}
      <section className="flex flex-col gap-2 pb-2">
        <TitreSection couleur="bg-amber-400" texte="Trafic — RN7" />
        {envTrafic.map(item => (
          <CarteJauge key={item.id} item={item} />
        ))}
      </section>

    </div>
  );
}