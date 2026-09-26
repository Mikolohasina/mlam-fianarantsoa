// src/components/Sidebar.jsx — M'LAM v1.0
// Responsive : boutons agrandis pour tap mobile, onglets scrollables horizontalement
import { useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, Radio, MapPin, Clock } from 'lucide-react';

const PRIORITE = {
  critical: { Icon: AlertOctagon,  label: 'Critique', couleur: 'text-red-500 dark:text-red-400',    bg: 'bg-red-500/8 dark:bg-red-500/10',    bordure: 'border-l-red-500'   },
  warning:  { Icon: AlertTriangle, label: 'Avert.',   couleur: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/8 dark:bg-amber-500/10', bordure: 'border-l-amber-500' },
  info:     { Icon: Info,          label: 'Info',     couleur: 'text-slate-400 dark:text-slate-500', bg: '',                                    bordure: 'border-l-slate-400' },
};

const ONGLETS = [
  { cle: 'tous',     label: 'Tous'     },
  { cle: 'critical', label: 'Critique' },
  { cle: 'warning',  label: 'Avert.'   },
  { cle: 'info',     label: 'Info'     },
];

function CarteAlerte({ alerte, onSelectAnomalie, onGenerateReport }) {
  const cfg  = PRIORITE[alerte.priority] ?? PRIORITE.info;
  const Icon = cfg.Icon;

  function handleClic() {
    onSelectAnomalie?.(alerte);
  }

  function handleRapport(e) {
    e.stopPropagation();
    onSelectAnomalie?.(alerte);
    onGenerateReport?.(alerte);
  }

  return (
    <article
      onClick={handleClic}
      className={[
        'flex flex-col gap-2 px-3.5 py-3 rounded-xl cursor-pointer',
        'border border-l-[3px] border-slate-200 dark:border-slate-800',
        cfg.bordure,
        'bg-white dark:bg-slate-900',
        'shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-150',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={[
          'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full',
          cfg.bg, cfg.couleur,
        ].join(' ')}>
          <Icon size={11} strokeWidth={2.5} />
          {cfg.label}
        </span>
        <span className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-400 dark:text-slate-600 shrink-0">
          <Clock size={10} strokeWidth={2} />
          {alerte.time ?? '--:--'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-600">
        <MapPin size={11} strokeWidth={2} className="shrink-0" />
        <span className="truncate">{alerte.zone ?? 'Zone inconnue'}</span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 sm:line-clamp-none">
        {alerte.description ?? 'Aucune description.'}
      </p>

      {/* Bouton avec zone de tap élargie — min 44px de hauteur recommandé mobile */}
      <button
        type="button"
        onClick={handleRapport}
        className={[
          'self-start mt-1 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono',
          'min-h-[38px] flex items-center justify-center',
          'border border-indigo-200 dark:border-indigo-800',
          'text-indigo-600 dark:text-indigo-400',
          'hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
          'active:scale-95',
          'transition-all duration-150',
        ].join(' ')}
      >
        Rapport IA
      </button>
    </article>
  );
}

export default function Sidebar({ alerts = [], onGenerateReport, onSelectAnomalie }) {
  const [filtre, setFiltre] = useState('tous');

  const compteurs = {
    tous:     alerts.length,
    critical: alerts.filter(a => a?.priority === 'critical').length,
    warning:  alerts.filter(a => a?.priority === 'warning').length,
    info:     alerts.filter(a => a?.priority === 'info').length,
  };

  const nbCritiques = compteurs.critical;

  const alertesFiltrees = filtre === 'tous'
    ? alerts
    : alerts.filter(a => a?.priority === filtre);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">

      {/* En-tête */}
      <div className="flex flex-col shrink-0 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="block h-1 w-4 rounded-full bg-indigo-500 shrink-0" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 truncate">
              Anomalies
            </h2>
            <span className="text-xs font-mono text-slate-300 dark:text-slate-700 shrink-0">
              ({compteurs.tous})
            </span>
          </div>
          {nbCritiques > 0 && (
            <span className="flex items-center gap-1.5 shrink-0">
              <Radio size={11} className="text-red-500 animate-pulse" />
              <span className="text-xs font-bold font-mono text-red-600 dark:text-red-400 tabular-nums">
                {nbCritiques}
              </span>
            </span>
          )}
        </div>

        {/* Onglets de filtre — scroll horizontal sur mobile, zone de tap élargie */}
        <div
          className="flex items-center gap-1.5 px-3 pb-3 overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {ONGLETS.map(({ cle, label }) => {
            const actif = filtre === cle;
            const nb    = compteurs[cle];
            return (
              <button
                key={cle}
                type="button"
                onClick={() => setFiltre(cle)}
                className={[
                  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full shrink-0',
                  'min-h-[36px]',
                  'text-xs font-semibold font-mono border transition-all duration-150',
                  'active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                  actif
                    ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500'
                    : 'bg-transparent text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {label}
                <span className={[
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold leading-none',
                  actif
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500',
                ].join(' ')}>
                  {nb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flux d'alertes scrollable */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}
      >
        <div className="flex flex-col gap-2.5 p-3">
          {alertesFiltrees.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center select-none">
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Info size={16} strokeWidth={1.75} className="text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-600">
                Aucune anomalie{filtre !== 'tous' ? ` "${filtre}"` : ''} active
              </p>
            </div>
          ) : (
            <>
              {alertesFiltrees.filter(Boolean).map((alerte, i) => (
                <CarteAlerte
                  key={alerte.id ?? i}
                  alerte={alerte}
                  onSelectAnomalie={onSelectAnomalie}
                  onGenerateReport={onGenerateReport}
                />
              ))}
              <div className="flex items-center gap-2 py-2">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="text-xs font-mono text-slate-300 dark:text-slate-700 tabular-nums shrink-0">
                  {alertesFiltrees.length} alerte{alertesFiltrees.length > 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
