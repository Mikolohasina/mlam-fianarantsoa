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
  { id: 'vehicles',   label: 'Vehicules actifs',   value: 157, Icon: Car,         theme: 'neutral' },
  { id: 'accidents',  label: 'Accidents detectes',  value: 0,   Icon: AlertOctagon, theme: 'danger',  alertAt: 1 },
  { id: 'congestion', label: 'Embouteillages',      value: 1,   Icon: TrendingUp,   theme: 'warning', alertAt: 1 },
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
// Jetons de design
// ─────────────────────────────────────────────────────────────────────────────
const THEME_KPI = {
  neutral: {
    bg:    'bg-slate-100 dark:bg-slate-800',
    icon:  'text-slate-500 dark:text-slate-400',
    value: 'text-slate-900 dark:text-slate-50',
    anneau: '',
  },
  danger: {
    bg:    'bg-red-500/10 dark:bg-red-500/15',
    icon:  'text-red-500 dark:text-red-400',
    value: 'text-red-600 dark:text-red-400',
    anneau: 'ring-1 ring-inset ring-red-500/30 dark:ring-red-400/20',
  },
  warning: {
    bg:    'bg-amber-500/10 dark:bg-amber-500/15',
    icon:  'text-amber-500 dark:text-amber-400',
    value: 'text-amber-600 dark:text-amber-400',
    anneau: 'ring-1 ring-inset ring-amber-500/30 dark:ring-amber-400/20',
  },
};
const CONFIG_STATUT = {
  ok: {
    label:  'Normal',
    barre:  'bg-emerald-500 dark:bg-emerald-400',
    badge:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    pct:    'text-emerald-600 dark:text-emerald-400',
    Trend:  TrendingDown,
  },
  elevated: {
    label:  'Eleve',
    barre:  'bg-amber-500 dark:bg-amber-400',
    badge:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    pct:    'text-amber-600 dark:text-amber-400',
    Trend:  TrendingUp,
  },
  critical: {
    label:  'Critique',
    barre:  'bg-red-500 dark:bg-red-400',
    badge:  'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    pct:    'text-red-600 dark:text-red-400',
    Trend:  TrendingUp,
  },
};
// ─────────────────────────────────────────────────────────────────────────────
// Horloge locale — Fianarantsoa (UTC+3, même fuseau qu'Antananarivo)
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
      'flex items-center justify-between',
      'px-3.5 py-2 rounded-xl',
      'border border-slate-200 dark:border-slate-800',
      'bg-white dark:bg-slate-900',
      'transition-colors duration-200',
      'hover:border-slate-300 dark:hover:border-slate-700',
    ].join(' ')}>
      <div className="flex items-center gap-1.5">
        <Clock size={11} strokeWidth={2} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Fianarantsoa
        </span>
      </div>
      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
        {heure}
      </span>
      <span className="text-xs text-slate-300 dark:text-slate-500 font-mono">
        UTC+3
      </span>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// CarteKPI — compteur avec icône et valeur
// ─────────────────────────────────────────────────────────────────────────────
// Remplacer la signature de CarteKPI
function CarteKPI({ item, filtreActif, onFiltreChange }) {
  if (!item) return null;

  // Déclaration locale sécurisée pour éviter toute erreur de portée (ReferenceError)
  const FILTRE_PAR_KPI = {
    accidents:  'accident',
    congestion: 'embouteillage',
    vehicles:   'tous',
  };

  const actif   = (item.alertAt != null) && ((item.value ?? 0) >= item.alertAt);
  const tokens  = actif ? (THEME_KPI[item.theme] ?? THEME_KPI.neutral) : THEME_KPI.neutral;
  const Icon    = item.Icon ?? Activity;

  const typeFiltreAssocie = FILTRE_PAR_KPI[item.id] ?? null;
  const estSelectionne     = filtreActif === typeFiltreAssocie && typeFiltreAssocie !== 'tous';
  const estCliquable        = typeFiltreAssocie && typeFiltreAssocie !== 'tous';

  return (
    <div
      onClick={() => estCliquable && onFiltreChange?.(typeFiltreAssocie)}
      className={[
        'group flex items-center gap-3 rounded-xl px-3.5 py-3',
        'border transition-all duration-200 ease-out',
        // Alternance dynamique de bordure selon l'état sélectionné
        estSelectionne
          ? 'border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/30 bg-indigo-50/10 dark:bg-indigo-950/20'
          : 'border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/80 shadow-sm',
        'hover:shadow-lg hover:-translate-y-px',
        estCliquable ? 'cursor-pointer select-none' : 'cursor-default',
        actif ? tokens.anneau : '',
      ].join(' ')}
    >
      <span className={[
        'flex items-center justify-center h-9 w-9 rounded-lg shrink-0',
        'transition-transform duration-200 group-hover:scale-110',
        // Changement visuel du fond de l'icône si sélectionné
        estSelectionne ? 'bg-indigo-500/15 dark:bg-indigo-500/20' : tokens.bg,
      ].join(' ')}>
        <Icon
          size={15}
          strokeWidth={2}
          className={[
            estSelectionne ? 'text-indigo-500 dark:text-indigo-400' : tokens.icon,
            tokens.pulse ? 'animate-pulse' : '',
          ].join(' ')}
        />
      </span>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-1.5 truncate">
          {item.label ?? 'N/A'}
        </span>
        <span className={[
          'text-2xl font-bold tabular-nums tracking-tight leading-none transition-colors duration-300',
          estSelectionne ? 'text-indigo-600 dark:text-indigo-300' : tokens.value,
        ].join(' ')}>
          {item.value ?? 0}
        </span>
      </div>

      {/* Indicateur visuel "filtre actif" à droite de la ligne */}
      {estSelectionne && (
        <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
      )}
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
      'group flex flex-col gap-2.5 rounded-xl px-3.5 py-3.5',
      'border border-slate-200 dark:border-slate-800',
      'bg-white dark:bg-slate-900 shadow-sm',
      'transition-all duration-300 ease-out',
      'hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700',
    ].join(' ')}>
      {/* En-tête */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <IconMetrique size={12} strokeWidth={2} className="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 truncate">
            {item.label ?? 'N/A'}
          </span>
        </div>
        <span className={[
          'inline-flex items-center gap-1 shrink-0',
          'px-2 py-0.5 rounded-full text-xs font-bold leading-none',
          'transition-transform duration-200',
          cfg.status === 'critical' ? 'animate-pulse' : '',
          cfg.badge,
        ].join(' ')}>
          <Trend size={8} strokeWidth={2.5} />
          {cfg.label}
        </span>
      </div>
      {/* Valeur principale */}
      <div className="flex items-end justify-between gap-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 leading-none">
            {typeof item.value === 'number'
              ? item.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
              : (item.value ?? '—')}
          </span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-0.5">
            {item.unit ?? ''}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 shrink-0">
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
        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={['h-full rounded-full transition-all duration-700 ease-out', cfg.barre].join(' ')}
            style={{ width: `${fill}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs tabular-nums text-slate-300 dark:text-slate-500">0</span>
          <span className={['text-xs tabular-nums font-bold', cfg.pct].join(' ')}>
            {fill}%
          </span>
          <span className="text-xs tabular-nums text-slate-300 dark:text-slate-500">
            {item.max}{item.unit}
          </span>
        </div>
      </div>
      {/* Note de référence */}
      {item.reference && (
        <p className="text-xs text-slate-300 dark:text-slate-500 italic leading-snug border-t border-slate-100 dark:border-slate-800 pt-2">
          {item.reference}
        </p>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// TitreSection — séparateur de section avec marqueur coloré
// ─────────────────────────────────────────────────────────────────────────────
function TitreSection({ couleur, texte, extra }) {
  return (
    <div className="flex items-center justify-between px-1 mb-1">
      <div className="flex items-center gap-2">
        <span className={`block h-1 w-4 rounded-full ${couleur}`} />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          {texte}
        </p>
      </div>
      {extra && (
        <span className="text-xs text-slate-300 dark:text-slate-700 font-mono">{extra}</span>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Export principal
// ─────────────────────────────────────────────────────────────────────────────
// Modifier la signature de export default
export default function Metrics({ metrics, kpis, filtreActif = 'tous', onFiltreChange }) {

  // ... données kpisAffichage inchangées ...
  const kpisAffichage = [
    { ...KPI_DEFAUT[0], value: kpis?.vehicles   ?? KPI_DEFAUT[0].value },
    { ...KPI_DEFAUT[1], value: kpis?.accidents  ?? KPI_DEFAUT[1].value },
    { ...KPI_DEFAUT[2], value: kpis?.congestion ?? KPI_DEFAUT[2].value },
  ];
  // Juste avant le return, après kpisAffichage
const FILTRE_PAR_KPI = {
  accidents:  'accident',
  congestion: 'embouteillage',
  vehicles:   'tous',   // les véhicules n'ont pas de filtre dédié
};
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
    <div className="flex flex-col gap-4 p-3 overflow-y-auto h-full bg-slate-50 dark:bg-slate-950">
      {/* Horloge locale */}
      <HorlogeFiana />
      {/* Section 1 — KPI */}
      <section className="flex flex-col gap-2">
        <TitreSection couleur="bg-blue-500" texte="Compteurs" />
        
        {kpisAffichage.map(item => (
          <CarteKPI 
            key={item.id} 
            item={item} 
            filtreActif={filtreActif} 
            onFiltreChange={onFiltreChange} 
          />
        ))}

        {/* Bouton reset — Injecté proprement ici */}
        {filtreActif !== 'tous' && (
          <button
            type="button"
            onClick={() => onFiltreChange?.('tous')}
            className={[
              'flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg mt-1',
              'text-xs font-mono font-semibold text-indigo-500 dark:text-indigo-400',
              'border border-indigo-200 dark:border-indigo-800/60',
              'hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
              'transition-colors duration-150',
            ].join(' ')}
          >
            ✕ Réinitialiser le filtre
          </button>
        )}
      </section>

      <div className="h-px bg-slate-200 dark:bg-slate-800" />{/* Section 2 — Qualité de l'air */}
      <section className="flex flex-col gap-2">
        <TitreSection
          couleur="bg-emerald-500"
          texte="Qualite de l'air"
          extra="Fianarantsoa"
        />
        {envPollution.map(item => (
          <CarteJauge key={item.id} item={item} />
        ))}
      </section>

        

      <div className="h-px bg-slate-200 dark:bg-slate-800" />
      {/* Section 3 — Trafic RN7 */}
      <section className="flex flex-col gap-2">
        <TitreSection couleur="bg-amber-500" texte="Trafic — RN7" />
        {envTrafic.map(item => (
          <CarteJauge key={item.id} item={item} />
        ))}
      </section>
    </div>
  );
}
