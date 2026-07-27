// src/App.jsx
// M'LAM Urban Monitoring System — Fianarantsoa, Madagascar

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard, Radio, Map, ShieldAlert, Settings,
  Car, Zap, Wind, RotateCcw, AlertTriangle,
  SlidersHorizontal, Palette, Lock, FileArchive, HelpCircle,
  Sun, Moon, Layers, Mountain, Satellite,
  Eye, EyeOff, ShieldCheck, UserCog, KeyRound,
  Download, FileText, Clock, BookOpen, ChevronRight,
} from 'lucide-react';

import { ThemeProvider }       from './context/ThemeContext';
import { useTheme }            from './context/ThemeContext';
import ThemeToggle             from './components/ThemeToggle';
import Metrics                 from './components/Metrics';
import Sidebar                 from './components/Sidebar';
import CityMap                 from './map/CityMap';
import { ZoneIntervention }    from './components/ZoneIntervention';
import useCitySimulation       from './hooks/useCitySimulation';
import { generateUrbanReport } from './services/aiService';

// SIGNATURE DE SÉCURITÉ
(function mainAuthorSignature() {
  const style = 'background: #0f172a; color: #94a3b8; font-family: monospace; font-size: 12px; padding: 6px 12px; border-radius: 4px; border: 1px solid #1e293b;';
  console.log('%c M\'LAM: Mikolo\'s Learned App Monitoring — Conçu et Développé par Mikolohasina (Juillet 2026) ', style);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de navigation
// ─────────────────────────────────────────────────────────────────────────────

const VUES_APP = [
  { id: 'dashboard',  label: 'Dashboard',       Icon: LayoutDashboard },
  { id: 'carte_pure', label: 'Carte',            Icon: Map             },
  { id: 'alertes',    label: "Centre d'Alertes", Icon: ShieldAlert     },
  { id: 'parametres', label: 'Paramètres',       Icon: Settings        },
];

// ─────────────────────────────────────────────────────────────────────────────
// NavLaterale — FIXED: positionnée hors du flux, n'induit AUCUN décalage
// ─────────────────────────────────────────────────────────────────────────────

function NavLaterale({ vueApp, onChangeVue }) {
  return (
    <nav
      className={[
        'group/nav',
        'fixed top-0 left-0 z-50',
        'flex flex-col h-screen overflow-hidden',
        'w-16 hover:w-64',
        'transition-all duration-300 ease-in-out',
        'bg-slate-950/95 backdrop-blur-md',
        'border-r border-slate-800/80',
      ].join(' ')}
    >
      {/* En-tête logo */}
      <div className="flex items-center gap-3 h-12 px-4 shrink-0 border-b border-slate-800/80 overflow-hidden">
        <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800/60 border border-slate-700 shrink-0">
          <LayoutDashboard size={14} strokeWidth={2} className="text-slate-400" />
        </span>
        <span className={[
          'text-xs font-bold tracking-widest uppercase text-slate-300 whitespace-nowrap',
          'opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100',
        ].join(' ')}>
          M&apos;LAM
        </span>
      </div>

      {/* Items de navigation */}
      <div className="flex flex-col gap-1 px-2 py-3 flex-1">
        {VUES_APP.map(({ id, label, Icon }) => {
          const estActif = vueApp === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeVue(id)}
              aria-current={estActif ? 'page' : undefined}
              className={[
                'flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 w-full',
                'font-mono text-xs font-semibold uppercase tracking-wider',
                'transition-all duration-200 ease-out',
                'hover:scale-[1.01] active:scale-95',
                estActif
                  ? 'bg-slate-800/70 border border-slate-700 text-slate-200'
                  : 'border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={2} className="shrink-0" />
              <span className={[
                'whitespace-nowrap',
                'opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100',
              ].join(' ')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pied — indicateur live */}
      <div className="flex items-center gap-3 h-11 px-4 shrink-0 border-t border-slate-800/80 overflow-hidden">
        <span className="relative flex items-center justify-center h-2 w-2 shrink-0">
          <span className="absolute inset-0 rounded-full bg-emerald-500/50 animate-ping" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className={[
          'text-xs font-mono text-emerald-500 uppercase tracking-widest whitespace-nowrap',
          'opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100',
        ].join(' ')}>
          Live
        </span>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarreEtat
// ─────────────────────────────────────────────────────────────────────────────

function BarreEtat({ simulationRef, anomalies }) {
  const nbVehicules = simulationRef?.current?.vehicles?.length ?? 0;
  const nbCritiques = (Array.isArray(anomalies) ? anomalies : [])
    .filter(a => a?.priority === 'critical').length;

  return (
    <footer className={[
      'flex items-center justify-between px-5 h-6 shrink-0',
      'border-t border-slate-200 dark:border-slate-800/80',
      'bg-white/80 dark:bg-slate-900/60 backdrop-blur-md',
      'transition-colors duration-200',
    ].join(' ')}>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {nbVehicules} véhicule{nbVehicules > 1 ? 's' : ''} actif{nbVehicules > 1 ? 's' : ''}
          </span>
        </span>
        {nbCritiques > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 dark:text-red-400 font-medium tabular-nums">
              {nbCritiques} alerte{nbCritiques > 1 ? 's' : ''} critique{nbCritiques > 1 ? 's' : ''}
            </span>
          </span>
        )}
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-600 tracking-wide">
        M&apos;LAM v1.0 — Fianarantsoa
      </span>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarreHaut
// ─────────────────────────────────────────────────────────────────────────────

function SelecteurVue({ vueActive, onChangeVue }) {
  const OPTIONS = [
    {
      id: 'trafic',
      label: 'SUPERVISION TRAFIC',
      emoji: '📡',
      actif: {
        bg: 'bg-slate-800/70', bordure: 'border-slate-600',
        texte: 'text-slate-200',
      },
    },
    {
      id: 'pollution',
      label: "QUALITÉ DE L'AIR",
      emoji: '🍃',
      actif: {
        bg: 'bg-slate-800/70', bordure: 'border-slate-600',
        texte: 'text-slate-200',
      },
    },
  ];

  return (
    <div className={[
      'flex items-center gap-1 p-1 rounded-lg',
      'bg-slate-100 dark:bg-slate-900/60',
      'border border-slate-200 dark:border-slate-800/80',
    ].join(' ')}>
      {OPTIONS.map(opt => {
        const estActif = vueActive === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChangeVue?.(opt.id)}
            aria-pressed={estActif}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'font-mono text-xs font-bold uppercase tracking-widest',
              'border transition-all duration-200 ease-out',
              'hover:scale-[1.02] active:scale-95',
              estActif
                ? [opt.actif.bg, opt.actif.bordure, opt.actif.texte].join(' ')
                : 'bg-transparent border-transparent text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/50',
            ].join(' ')}
          >
            <span className="text-sm leading-none">{opt.emoji}</span>
            <span className="hidden md:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BarreHaut({ vueActive, onChangeVue, onRetour, afficherSelecteurVue = true }) {
  return (
    <header className={[
      'flex items-center justify-between h-12 px-5 shrink-0',
      'bg-white/80 dark:bg-slate-900/60 backdrop-blur-md',
      'border-b border-slate-200 dark:border-slate-800/80',
      'transition-colors duration-200',
    ].join(' ')}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase hidden sm:block">
          Learned App Monitoring — Fianarantsoa
        </span>
        <span className="flex items-center gap-1.5 ml-1">
          <Radio size={11} className="text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {vueActive !== null && (
          <button
            type="button"
            onClick={onRetour}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'font-mono text-xs font-bold uppercase tracking-widest',
              'border border-slate-300 dark:border-slate-700',
              'text-slate-500 dark:text-slate-400',
              'hover:bg-slate-100 dark:hover:bg-slate-800/50',
              'hover:text-slate-700 dark:hover:text-slate-200',
              'transition-all duration-200',
            ].join(' ')}
          >
            ← Retour
          </button>
        )}

        {afficherSelecteurVue && (
          <SelecteurVue vueActive={vueActive} onChangeVue={onChangeVue} />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalRapport
// ─────────────────────────────────────────────────────────────────────────────

const ETAPES_PROGRESSION = [
  { label: 'Connexion aux capteurs IoT...',         duree: 900      },
  { label: 'Analyse des flux vidéo en cours...',    duree: 1400     },
  { label: 'Traitement des données trafic...',      duree: 1200     },
  { label: 'Corrélation des anomalies actives...',  duree: 1100     },
  { label: 'Rédaction du rapport administratif...', duree: Infinity },
];

function BarreProgressionIA() {
  const [etapeIdx, setEtapeIdx] = useState(0);
  const [pct,      setPct]      = useState(0);

  useEffect(() => {
    let idx = 0;
    const timers = [];

    function avancer() {
      const etape = ETAPES_PROGRESSION[idx];
      if (!etape || etape.duree === Infinity) return;
      timers.push(setTimeout(() => { idx++; setEtapeIdx(idx); avancer(); }, etape.duree));
    }
    avancer();

    const debut    = performance.now();
    const durTotal = ETAPES_PROGRESSION.slice(0, -1).reduce((s, e) => s + e.duree, 0);
    let rafId;

    function animer(now) {
      const ratio  = Math.min((now - debut) / durTotal, 1);
      const valeur = Math.round(92 * (1 - Math.pow(1 - ratio, 2.5)));
      setPct(valeur);
      if (valeur < 92) rafId = requestAnimationFrame(animer);
    }
    rafId = requestAnimationFrame(animer);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const label = ETAPES_PROGRESSION[Math.min(etapeIdx, ETAPES_PROGRESSION.length - 1)]?.label ?? '';

  return (
    <div className="flex flex-col gap-3 py-6 px-1">
      <div className="flex items-center justify-center gap-3">
        <div className="relative flex items-center justify-center h-10 w-10">
          <span className="absolute inset-0 rounded-full border-2 border-slate-600/50 animate-ping" />
          <span className="relative h-5 w-5 rounded-full bg-slate-700/40 border border-slate-500 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
          </span>
        </div>
        <span className="text-xs font-mono text-slate-300 tracking-wider animate-pulse uppercase">
          Analyse en cours
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-500 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">{label}</span>
          <span className="text-xs font-mono text-slate-300 tabular-nums">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function ModalRapport({ ouvert, chargement, anomalie, rapport, source, erreur, onFermer }) {
  if (!ouvert) return null;
  const aRapport     = Boolean(rapport?.trim());
  const aErreurSeule = !aRapport && Boolean(erreur);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onFermer(); }}
    >
      <div
        className={[
          'relative flex flex-col w-full max-w-2xl max-h-[88vh]',
          'rounded-lg border shadow-xl',
          'bg-slate-950 border-slate-800/80',
        ].join(' ')}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-px bg-slate-800/60 rounded-t-lg" />

        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800/80 shrink-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-500">
                Rapport IA — M&apos;LAM Fianarantsoa
              </span>
              {!chargement && (
                <span className={[
                  'text-xs px-2 py-0.5 rounded-full font-mono font-semibold',
                  source === 'gemini'
                    ? 'bg-slate-800/70 text-slate-300 border border-slate-700'
                    : 'bg-slate-800 text-slate-500 border border-slate-700',
                ].join(' ')}>
                  {source === 'gemini' ? 'GEMINI 2.0' : 'Mode Simulation (Hors-ligne)'}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold font-mono text-slate-100 truncate">
              {anomalie?.id ?? '—'} — {anomalie?.zone ?? '—'}
            </h2>
            <p className="text-xs font-mono text-slate-500">
              {anomalie?.sensor ?? '—'} · {anomalie?.time ?? '--:--'}
            </p>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all duration-150"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {chargement && <BarreProgressionIA />}
          {!chargement && aErreurSeule && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-xs font-mono text-red-300/80 leading-relaxed">{erreur}</p>
            </div>
          )}
          {!chargement && aRapport && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border px-5 py-4 bg-slate-900/60 border-slate-800/80 shadow-inner">
                <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {rapport}
                </pre>
              </div>
            </div>
          )}
        </div>

        {!chargement && (
          <div className="flex items-center justify-end gap-2 px-6 py-3 shrink-0 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onFermer}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border border-slate-700 text-slate-400 hover:bg-slate-900 hover:text-slate-100 hover:border-slate-500 transition-all duration-200"
            >
              Fermer
            </button>
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 h-px bg-slate-800/60 rounded-b-lg" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GrilleMetriques — export nommé
// ─────────────────────────────────────────────────────────────────────────────

const SEUILS_KPI = {
  trafic:      { warn: 65, crit: 85 },
  infractions: { warn: 3,  crit: 8  },
  secours:     { warn: 1,  crit: 3  },
};

function calcNiveau(id, valeur) {
  const s = SEUILS_KPI[id];
  if (!s) return 'ok';
  if (valeur >= s.crit) return 'crit';
  if (valeur >= s.warn) return 'warn';
  return 'ok';
}

const NIVEAU_STYLES_KPI = {
  ok:   { chiffre: 'text-slate-800 dark:text-slate-100', pastille: 'bg-emerald-500', label: 'Normal'   },
  warn: { chiffre: 'text-amber-700 dark:text-amber-400',  pastille: 'bg-amber-500',   label: 'Élevé'    },
  crit: { chiffre: 'text-red-600   dark:text-red-400',    pastille: 'bg-red-600',     label: 'Critique' },
};

const METRIQUES_KPI = [
  {
    id: 'trafic', label: 'Trafic global', valeur: 72, unite: '%', detail: 'Densité réseau RN7',
    Icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l4-8 4 4 4-6 4 10"/>
      </svg>
    ),
  },
  {
    id: 'infractions', label: 'Infractions', valeur: 11, unite: '', detail: 'Véhicules sanctionnés',
    Icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    id: 'secours', label: 'Secours actifs', valeur: 2, unite: '', detail: 'Interventions en cours',
    Icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
];

export function GrilleMetriques() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {METRIQUES_KPI.map(({ id, label, valeur, unite, detail, Icon }) => {
        const niveau = calcNiveau(id, valeur);
        const styles = NIVEAU_STYLES_KPI[niveau];
        return (
          <div key={id} className="relative flex flex-col gap-3 rounded-lg px-4 py-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-none hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 shrink-0">
                  <Icon />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 truncate">
                  {label}
                </span>
              </div>
              <span className={['h-2 w-2 rounded-full shrink-0', styles.pastille, niveau === 'crit' ? 'animate-pulse' : ''].join(' ')} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={['text-3xl font-bold font-mono tabular-nums tracking-tight leading-none', styles.chiffre].join(' ')}>
                {valeur}
              </span>
              {unite && <span className="text-sm font-mono text-slate-400 dark:text-slate-600 mb-0.5">{unite}</span>}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-600 leading-none">{detail}</p>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-600">Statut</span>
              <span className={['text-xs font-mono font-semibold', niveau === 'ok' ? 'text-slate-400 dark:text-slate-600' : styles.chiffre].join(' ')}>
                {styles.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// PanneauIndicateurs — colonne gauche de la vue supervision, filtrée selon vueActive
// ─────────────────────────────────────────────────────────────────────────────

function CarteIndicateur({ label, valeur, unite, Icon, sousTexte }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg px-4 py-3.5 bg-slate-900/60 border border-slate-800/80">
      <div className="flex items-center gap-1.5">
        <Icon size={12} strokeWidth={2} className="shrink-0 text-slate-500" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono tabular-nums leading-none text-slate-200">
          {valeur}
        </span>
        {unite && <span className="text-xs font-mono text-slate-500">{unite}</span>}
      </div>
      {sousTexte && <span className="text-xs text-slate-600">{sousTexte}</span>}
    </div>
  );
}

function PanneauIndicateurs({ vueActive, kpis, metrics }) {
  const co2  = metrics?.find(m => m.id === 'co2');
  const pm25 = metrics?.find(m => m.id === 'pm25');

  return (
    <div className="flex flex-col gap-3">

      {vueActive === 'trafic' && (
        <>
          <CarteIndicateur
            label="Véhicules actifs" valeur={kpis?.vehicles ?? 0} unite=""
            Icon={Car} sousTexte="Flotte simulée en circulation"
          />
          <CarteIndicateur
            label="Accidents détectés" valeur={kpis?.accidents ?? 0} unite=""
            Icon={AlertTriangle} sousTexte="Incidents critiques actifs"
          />
          <CarteIndicateur
            label="Embouteillages" valeur={kpis?.congestion ?? 0} unite=""
            Icon={ShieldAlert} sousTexte="Zones de congestion signalées"
          />
        </>
      )}

      {vueActive === 'pollution' && (
        <>
          <CarteIndicateur
            label="CO2 — Dioxyde de carbone"
            valeur={co2?.value ?? '—'} unite={co2?.unit ?? 'ppm'}
            Icon={Wind}
            sousTexte={`Statut : ${co2?.status === 'critical' ? 'Critique' : co2?.status === 'elevated' ? 'Élevé' : 'Normal'}`}
          />
          <CarteIndicateur
            label="PM2.5 — Particules fines"
            valeur={pm25?.value ?? '—'} unite={pm25?.unit ?? 'µg/m³'}
            Icon={Wind}
            sousTexte={`Statut : ${pm25?.status === 'critical' ? 'Critique' : pm25?.status === 'elevated' ? 'Élevé' : 'Normal'}`}
          />
        </>
      )}

    </div>
  );
}


const DEVISE_MLAM    = "Ho an'ny tanàna milamina sy mandroso";
const DEVISE_MLAM_FR = 'Pour une ville harmonieuse et prospère';

// ─────────────────────────────────────────────────────────────────────────────
// InterrupteurBascule — toggle réutilisable
// ─────────────────────────────────────────────────────────────────────────────

function InterrupteurBascule({ label, description, actif, onToggle, Icon }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-4 py-3.5 bg-slate-900/60 border border-slate-800/80">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800/60 border border-slate-700 shrink-0 mt-0.5">
            <Icon size={14} strokeWidth={2} className="text-slate-400" />
          </span>
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-200 leading-snug">
            {label}
          </span>
          {description && (
            <span className="text-xs text-slate-500 leading-snug">
              {description}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={actif}
        onClick={onToggle}
        className={[
          'relative shrink-0 w-11 h-6 rounded-full border transition-colors duration-200',
          actif ? 'bg-emerald-600/70 border-emerald-500/60' : 'bg-slate-800 border-slate-700',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            actif ? 'translate-x-[22px]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SliderParam — curseur réutilisable
// ─────────────────────────────────────────────────────────────────────────────

function SliderParam({ label, valeur, min, max, pas = 1, unite = '', onChange, accentHex = '#94a3b8', description }) {
  const pct        = Math.round(((valeur - min) / (max - min)) * 100);
  const displayVal = typeof valeur === 'number' && valeur % 1 !== 0 ? valeur.toFixed(1) : valeur;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200 leading-none">
            {label}
          </span>
          {description && (
            <span className="text-xs text-slate-400 dark:text-slate-600 leading-snug mt-0.5">
              {description}
            </span>
          )}
        </div>
        <span
          className="shrink-0 min-w-[4.5rem] text-center px-2.5 py-1 rounded-lg text-sm font-mono font-bold bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 tabular-nums"
          style={{ color: accentHex }}
        >
          {displayVal}{unite}
        </span>
      </div>

      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden pointer-events-none">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${pct}%`, backgroundColor: accentHex }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={pas}
          value={valeur}
          onChange={e => onChange(Number(e.target.value))}
          className={[
            'absolute inset-0 w-full cursor-pointer outline-none appearance-none bg-transparent',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-white',
            '[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,0,0,0.35)]',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
            '[&::-webkit-slider-thumb]:hover:scale-125',
            '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer',
            '[&::-moz-range-track]:bg-transparent',
          ].join(' ')}
        />
      </div>

      <div className="flex justify-between text-xs font-mono text-slate-400 dark:text-slate-700 tabular-nums">
        <span>{min}{unite}</span>
        <span>{max}{unite}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelecteurBoutons — liste d'options radio-style avec icône lucide dédiée
// ─────────────────────────────────────────────────────────────────────────────

function SelecteurBoutons({ label, description, Icon, options, valeur, onChange }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} strokeWidth={2} className="text-slate-400 shrink-0" />}
        <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{label}</span>
      </div>
      {description && <p className="text-xs text-slate-500 leading-snug">{description}</p>}
      <div className="flex flex-col gap-2">
        {options.map(opt => {
          const estActif = valeur === opt.id;
          const OptIcon  = opt.Icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={[
                'flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all duration-200',
                estActif
                  ? 'bg-slate-800/70 border border-slate-600'
                  : 'bg-slate-950/40 border border-slate-800/60 hover:border-slate-700',
              ].join(' ')}
            >
              {OptIcon && (
                <span className={[
                  'flex items-center justify-center h-8 w-8 rounded-lg border shrink-0',
                  estActif ? 'bg-slate-700/60 border-slate-600' : 'bg-slate-800/60 border-slate-700',
                ].join(' ')}>
                  <OptIcon size={14} strokeWidth={2} className={estActif ? 'text-slate-200' : 'text-slate-500'} />
                </span>
              )}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className={['text-xs font-bold uppercase tracking-widest', estActif ? 'text-slate-100' : 'text-slate-400'].join(' ')}>
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="text-xs text-slate-500 leading-snug">{opt.description}</span>
                )}
              </div>
              {estActif && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Système & Moteur de Simulation
// ─────────────────────────────────────────────────────────────────────────────

function SectionSysteme({ simSettings, onSettingsChange, onReset, simulationRef, anomalies }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const timerRef = useRef(null);

  const nbVehiculesCourant = simulationRef?.current?.vehicles?.length ?? 0;
  const nbAnomalies        = Array.isArray(anomalies) ? anomalies.length : 0;
  const nbCritiques        = Array.isArray(anomalies)
    ? anomalies.filter(a => a?.priority === 'critical').length
    : 0;

  function handleClickReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      timerRef.current = setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    clearTimeout(timerRef.current);
    onReset();
    setConfirmReset(false);
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const STATS_HAUT = [
    { label: 'Véhicules actifs',  value: nbVehiculesCourant, hex: '#94a3b8', Icon: Car          },
    { label: 'Anomalies totales', value: nbAnomalies,        hex: '#f59e0b', Icon: AlertTriangle },
    { label: 'Alertes critiques', value: nbCritiques,        hex: '#ef4444', Icon: ShieldAlert   },
  ];

  const VITESSES_RAPIDES = [1, 2, 5];

  return (
    <div className="flex flex-col gap-5">

      <div className="grid grid-cols-3 gap-3">
        {STATS_HAUT.map(({ label, value, hex, Icon }) => (
          <div key={label} className="rounded-lg px-4 py-3 flex flex-col gap-2 bg-slate-900/60 border border-slate-800/80 transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center gap-1.5">
              <Icon size={11} strokeWidth={2} style={{ color: hex }} className="shrink-0 opacity-70" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 leading-none truncate">
                {label}
              </span>
            </div>
            <span className="text-2xl font-bold font-mono tabular-nums leading-none" style={{ color: hex }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <section className="rounded-lg p-5 flex flex-col gap-6 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Car size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Contrôle du Trafic
          </h3>
        </div>

        <SliderParam
          label="Véhicules simulés"
          description="Nombre total de véhicules injectés dans la simulation RN7 et axes secondaires"
          valeur={simSettings.nbVehicules}
          min={10} max={500} pas={5} unite=" veh."
          onChange={v => onSettingsChange(prev => ({ ...prev, nbVehicules: v }))}
          accentHex="#94a3b8"
        />

        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
                Vitesse de rafraîchissement
              </span>
              <span className="text-xs text-slate-500">
                Multiplicateur du cycle de tick — accès rapide ou réglage fin
              </span>
            </div>
            <span className="shrink-0 min-w-[3.5rem] text-center px-2.5 py-1 rounded-lg text-sm font-mono font-bold bg-slate-900/60 border border-slate-700/60 tabular-nums text-slate-300">
              {simSettings.vitesseMulti}×
            </span>
          </div>
          <div className="flex gap-2">
            {VITESSES_RAPIDES.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => onSettingsChange(prev => ({ ...prev, vitesseMulti: v }))}
                className={[
                  'flex-1 py-2 rounded-lg text-xs font-mono font-bold border transition-all duration-200',
                  simSettings.vitesseMulti === v
                    ? 'bg-slate-800/70 border-slate-600 text-slate-100'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                {v}×
              </button>
            ))}
          </div>
          <SliderParam
            label="Réglage fin"
            valeur={simSettings.vitesseMulti}
            min={0.5} max={5.0} pas={0.5} unite="×"
            onChange={v => onSettingsChange(prev => ({ ...prev, vitesseMulti: v }))}
            accentHex="#64748b"
          />
        </div>
      </section>

      <section className="rounded-lg p-5 flex flex-col gap-6 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Wind size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Seuils d&apos;Alerte Environnementale
          </h3>
        </div>

        <SliderParam
          label="Seuil CO2 Critique"
          description="Niveau de CO2 déclenchant l'alerte critique — Ref. Fianarantsoa : 390–420 ppm"
          valeur={simSettings.seuilCO2}
          min={450} max={1000} pas={10} unite=" ppm"
          onChange={v => onSettingsChange(prev => ({ ...prev, seuilCO2: v }))}
          accentHex="#94a3b8"
        />

        <SliderParam
          label="Seuil Particules Fines PM2.5"
          description="Niveau de PM2.5 déclenchant l'alerte critique — Seuil OMS : 15 µg/m³"
          valeur={simSettings.seuilPM25}
          min={15} max={150} pas={1} unite=" µg/m³"
          onChange={v => onSettingsChange(prev => ({ ...prev, seuilPM25: v }))}
          accentHex="#f59e0b"
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Zap size={12} strokeWidth={2} className="text-slate-400 dark:text-slate-600 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Actions Système
          </h3>
        </div>

        <button
          type="button"
          onClick={handleClickReset}
          className={[
            'relative w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-lg',
            'font-mono text-xs font-bold uppercase tracking-widest transition-all duration-200 ease-out active:scale-[0.98]',
            confirmReset
              ? 'border border-red-500/80 bg-red-500/20 text-red-300'
              : 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/18 hover:border-red-500/60 hover:text-red-300',
          ].join(' ')}
        >
          <RotateCcw size={14} strokeWidth={2} className={confirmReset ? 'animate-spin' : ''} />
          {confirmReset ? 'CLIQUER À NOUVEAU POUR CONFIRMER' : 'RÉINITIALISER LA SIMULATION'}
        </button>

        <p className="text-xs font-mono text-slate-500 text-center leading-snug px-4">
          Réinitialise les anomalies, compteurs et restaure les paramètres par défaut.
          {confirmReset && (
            <span className="block mt-1 text-red-400 font-semibold animate-pulse">
              Action irréversible — confirmer dans les 3 secondes
            </span>
          )}
        </p>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Affichage & Cartographie
// ─────────────────────────────────────────────────────────────────────────────

const STYLES_FOND_CARTE = [
  { id: 'technique',     label: 'Plan Urbain Technique',        description: 'Fianarantsoa Dark/Light — tuiles OSM filtrées, contraste élevé', Icon: Map       },
  { id: 'satellite',     label: 'Vue Imagerie Satellite',        description: 'Imagerie aérienne haute résolution — repérage terrain',           Icon: Satellite },
  { id: 'topographique', label: 'Carte Topographique & Reliefs', description: "Courbes de niveau et zonage — analyse d'urbanisme",                Icon: Mountain  },
];

function SectionAffichage({
  isDark, toggleTheme, styleCarteFond, onChangeStyleCarteFond,
  afficherPollution, onToggleAfficherPollution,
  afficherLignesBus, onToggleAfficherLignesBus,
  afficherNomsQuartiers, onToggleAfficherNomsQuartiers,
}) {
  return (
    <div className="flex flex-col gap-5">

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Palette size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Thème Global
          </h3>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg px-4 py-3.5 bg-slate-950/40 border border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800/60 border border-slate-700 shrink-0">
              {isDark ? <Moon size={14} strokeWidth={2} className="text-slate-400" /> : <Sun size={14} strokeWidth={2} className="text-slate-400" />}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
                {isDark ? 'Mode Sombre — Slate/Carbon' : 'Mode Clair — Papier technique/Sable mat'}
              </span>
              <span className="text-xs text-slate-500">
                Bascule complète de l&apos;interface
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest border border-slate-700 text-slate-300 hover:bg-slate-800/60 transition-all duration-200"
          >
            Changer <ChevronRight size={12} strokeWidth={2.5} />
          </button>
        </div>
      </section>

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <SelecteurBoutons
          label="Style du Fond de Carte"
          description="S'applique aux vues Dashboard, Carte et Supervision"
          Icon={Layers}
          options={STYLES_FOND_CARTE}
          valeur={styleCarteFond}
          onChange={onChangeStyleCarteFond}
        />
      </section>

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Eye size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Filtres de Rendu Visuel
          </h3>
        </div>

        <InterrupteurBascule
          label="Canvas de pollution"
          description="Afficher les zones de chaleur de pollution par quartier sur la carte"
          actif={afficherPollution}
          onToggle={onToggleAfficherPollution}
          Icon={afficherPollution ? Eye : EyeOff}
        />
        <InterrupteurBascule
          label="Lignes Bus / Taxibes"
          description="Afficher le tracé des lignes de transport en commun"
          actif={afficherLignesBus}
          onToggle={onToggleAfficherLignesBus}
          Icon={afficherLignesBus ? Eye : EyeOff}
        />
        <InterrupteurBascule
          label="Noms des quartiers"
          description="Afficher les libellés des quartiers de Fianarantsoa sur la carte"
          actif={afficherNomsQuartiers}
          onToggle={onToggleAfficherNomsQuartiers}
          Icon={afficherNomsQuartiers ? Eye : EyeOff}
        />
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — Sécurité, Chiffrement & Confidentialité
// ─────────────────────────────────────────────────────────────────────────────

const ROLES_UTILISATEUR = [
  { id: 'admin',     label: 'Administrateur Principal',                description: 'Accès complet — configuration, simulation, export',   Icon: UserCog     },
  { id: 'operateur', label: 'Opérateur Trafic',                         description: 'Supervision trafic et gestion des anomalies',          Icon: Car         },
  { id: 'auditeur',  label: "Auditeur Ministère de l'Environnement",    description: 'Lecture seule — rapports et bilans environnementaux',  Icon: ShieldCheck },
];

function SectionSecurite({ anonymisationActive, onToggleAnonymisation, roleUtilisateur, onChangeRoleUtilisateur }) {
  return (
    <div className="flex flex-col gap-5">

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Lock size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Confidentialité des Données Flotte
          </h3>
        </div>

        <InterrupteurBascule
          label="Anonymisation cryptographique (SHA-256)"
          description="Masque irréversiblement les plaques d'immatriculation des Taxibes et véhicules privés en mouvement dans tout journal ou export"
          actif={anonymisationActive}
          onToggle={onToggleAnonymisation}
          Icon={KeyRound}
        />
      </section>

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <ShieldCheck size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Chiffrement des Communications Inter-Agences
          </h3>
        </div>

        <div className="flex items-center gap-2 rounded-lg px-4 py-3 bg-emerald-500/5 border border-emerald-500/20">
          <ShieldCheck size={14} strokeWidth={2} className="text-emerald-500 shrink-0" />
          <span className="text-xs font-mono text-emerald-400">
            Chiffrement AES-256 activé — Canal Radio et transmissions automatiques de rapports sécurisés
          </span>
          <span className="ml-auto text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
            ACTIF
          </span>
        </div>

        <ul className="flex flex-col gap-1.5 pl-4 text-xs text-slate-500 leading-relaxed list-disc marker:text-slate-600">
          <li>Chiffrement AES-256 pour les flux radio opérationnels</li>
          <li>Transmission TLS 1.3 pour les rapports IA destinés au MEDD</li>
          <li>Rotation des clés de session toutes les 24 heures</li>
        </ul>
      </section>

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <SelecteurBoutons
          label="Gestion des Accès — Profil Actif"
          description="Détermine les permissions visibles sur ce poste de supervision"
          Icon={UserCog}
          options={ROLES_UTILISATEUR}
          valeur={roleUtilisateur}
          onChange={onChangeRoleUtilisateur}
        />
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — Compliance, Audit & Exportation
// ─────────────────────────────────────────────────────────────────────────────

const FREQUENCES_ARCHIVAGE = [
  { id: '5min',  label: 'Toutes les 5 minutes',  description: 'Archivage haute fréquence — audit temps réel', Icon: Clock },
  { id: '15min', label: 'Toutes les 15 minutes', description: 'Équilibre performance / granularité',           Icon: Clock },
  { id: '24h',   label: 'Toutes les 24 heures',  description: 'Archivage quotidien consolidé',                 Icon: Clock },
];

function SectionCompliance({ frequenceArchivage, onChangeFrequenceArchivage, anomalies }) {
  const nbAnomalies = Array.isArray(anomalies) ? anomalies.length : 0;

  function exporterCSV() {
    const source  = Array.isArray(anomalies) ? anomalies : [];
    const entetes = ['id', 'priority', 'sensor', 'zone', 'time', 'description'];
    const lignes  = source.map(a => entetes.map(c => `"${String(a?.[c] ?? '').replace(/"/g, '""')}"`).join(','));
    const csv     = [entetes.join(','), ...lignes].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const lien    = document.createElement('a');
    lien.href     = url;
    lien.download = `mlam_registre_anomalies_${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <SelecteurBoutons
          label="Fréquence d'Archivage des Données"
          description="Configure la sauvegarde automatique de l'historique des anomalies"
          Icon={FileArchive}
          options={FREQUENCES_ARCHIVAGE}
          valeur={frequenceArchivage}
          onChange={onChangeFrequenceArchivage}
        />
      </section>

      <section className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <Download size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Export & Rapports
          </h3>
        </div>

        <button
          type="button"
          onClick={exporterCSV}
          className="flex items-center gap-3 rounded-lg px-4 py-3.5 bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition-all duration-200 text-left"
        >
          <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-800/60 border border-slate-700 shrink-0">
            <FileText size={15} strokeWidth={2} className="text-slate-400" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Exporter le Registre des Anomalies
            </span>
            <span className="text-xs text-slate-500">
              Format .CSV — {nbAnomalies} entrée{nbAnomalies > 1 ? 's' : ''} disponible{nbAnomalies > 1 ? 's' : ''}
            </span>
          </div>
          <Download size={14} strokeWidth={2} className="text-slate-500 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-3 rounded-lg px-4 py-3.5 bg-slate-950/40 border border-slate-800/60 hover:border-slate-700 transition-all duration-200 text-left"
        >
          <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-800/60 border border-slate-700 shrink-0">
            <FileText size={15} strokeWidth={2} className="text-slate-400" />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Bilan Environnemental Mensuel
            </span>
            <span className="text-xs text-slate-500">
              Format .PDF — Fianarantsoa, synthèse CO2/PM2.5 par quartier
            </span>
          </div>
          <Download size={14} strokeWidth={2} className="text-slate-500 shrink-0" />
        </button>
      </section>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — Documentation, Aide & Support Technique
// ─────────────────────────────────────────────────────────────────────────────

function SectionDocumentation() {
  const chapitres = Object.values(DOCUMENTATION_MLAM);

  return (
    <div className="flex flex-col gap-5">

      <section className="rounded-lg p-5 flex flex-col gap-3 bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/60">
          <BookOpen size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300">
            Branding Culturel
          </h3>
        </div>
        <div className="rounded-lg px-4 py-3.5 bg-slate-950/40 border border-slate-800/60 italic text-xs text-slate-400 leading-relaxed">
          M&apos;LAM v1.0 — Dérivé de « Milamina » (Harmonie, Ordre, Prospérité).
          Système unifié de supervision pour un développement urbain durable et prospère à
          Fianarantsoa.
          <p className="not-italic mt-2 text-slate-500">
            {DEVISE_MLAM} — {DEVISE_MLAM_FR}
          </p>
        </div>
      </section>

      {chapitres.map(chapitre => (
        <section
          key={chapitre.numero}
          className="rounded-lg p-5 flex flex-col gap-4 bg-slate-900/60 border border-slate-800/80"
        >
          <div className="flex flex-col gap-1 pb-3 border-b border-slate-800/60">
            <span className="text-xs font-mono text-slate-500">
              Chapitre {chapitre.numero}
            </span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-200">
              {chapitre.titre}
            </h3>
            <p className="text-xs text-slate-500">
              {chapitre.sousTitre}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {chapitre.sections.map(s => (
              <div key={s.id}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-1.5">
                  {s.titre}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                  {s.contenu}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// ORCHESTRATEUR — VueParametres avec sidebar interne de configuration
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS_PARAMETRES = [
  { id: 'systeme',       label: 'Système & Simulation',    Icon: SlidersHorizontal },
  { id: 'affichage',     label: 'Affichage & Cartographie', Icon: Palette           },
  { id: 'securite',      label: 'Sécurité & Chiffrement',   Icon: Lock              },
  { id: 'compliance',    label: 'Compliance & Export',      Icon: FileArchive       },
  { id: 'documentation', label: 'Aide & Documentation',     Icon: HelpCircle        },
];

function VueParametres({
  simSettings, onSettingsChange, onReset, simulationRef, anomalies,
  isDark, toggleTheme, styleCarteFond, onChangeStyleCarteFond,
  anonymisationActive, onToggleAnonymisation,
  afficherPollution, onToggleAfficherPollution,
  afficherLignesBus, onToggleAfficherLignesBus,
  afficherNomsQuartiers, onToggleAfficherNomsQuartiers,
  roleUtilisateur, onChangeRoleUtilisateur,
  frequenceArchivage, onChangeFrequenceArchivage,
}) {
  const [sectionActive, setSectionActive] = useState('systeme');

  return (
    <div className="flex flex-1 h-full overflow-hidden">

      {/* ── Sidebar de configuration interne ── */}
      <aside className="w-64 flex-shrink-0 h-full overflow-y-auto bg-slate-950/40 border-r border-slate-800/80 p-3 flex flex-col gap-1">
        <div className="px-3 py-3 mb-1">
          <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800/60 border border-slate-700 mb-2">
            <SlidersHorizontal size={14} strokeWidth={2} className="text-slate-400" />
          </span>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-200 leading-none">
            Paramètres
          </h2>
          <p className="text-xs font-mono text-slate-500 mt-1">
            M&apos;LAM Fianarantsoa
          </p>
        </div>

        {SECTIONS_PARAMETRES.map(({ id, label, Icon }) => {
          const estActif = sectionActive === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSectionActive(id)}
              className={[
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200',
                'font-mono text-xs font-bold uppercase tracking-wider',
                estActif
                  ? 'bg-slate-800/70 border border-slate-700 text-slate-100'
                  : 'border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/40',
              ].join(' ')}
            >
              <Icon size={15} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}

        <div className="mt-auto px-3 py-3 border-t border-slate-800/60">
          <p className="text-[10px] italic text-slate-600 leading-snug">
            {DEVISE_MLAM}
          </p>
        </div>
      </aside>

      {/* ── Zone de contenu ── */}
      <div className={[
        'flex-1 h-full overflow-y-auto',
        '[&::-webkit-scrollbar]:w-1',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb]:rounded-full',
        '[&::-webkit-scrollbar-thumb]:bg-slate-700',
      ].join(' ')}>
        <div className="max-w-2xl mx-auto w-full p-6 pb-10">

          {sectionActive === 'systeme' && (
            <SectionSysteme
              simSettings={simSettings}
              onSettingsChange={onSettingsChange}
              onReset={onReset}
              simulationRef={simulationRef}
              anomalies={anomalies}
            />
          )}

          {sectionActive === 'affichage' && (
            <SectionAffichage
              isDark={isDark}
              toggleTheme={toggleTheme}
              styleCarteFond={styleCarteFond}
              onChangeStyleCarteFond={onChangeStyleCarteFond}
              afficherPollution={afficherPollution}
              onToggleAfficherPollution={onToggleAfficherPollution}
              afficherLignesBus={afficherLignesBus}
              onToggleAfficherLignesBus={onToggleAfficherLignesBus}
              afficherNomsQuartiers={afficherNomsQuartiers}
              onToggleAfficherNomsQuartiers={onToggleAfficherNomsQuartiers}
            />
          )}

          {sectionActive === 'securite' && (
            <SectionSecurite
              anonymisationActive={anonymisationActive}
              onToggleAnonymisation={onToggleAnonymisation}
              roleUtilisateur={roleUtilisateur}
              onChangeRoleUtilisateur={onChangeRoleUtilisateur}
            />
          )}

          {sectionActive === 'compliance' && (
            <SectionCompliance
              frequenceArchivage={frequenceArchivage}
              onChangeFrequenceArchivage={onChangeFrequenceArchivage}
              anomalies={anomalies}
            />
          )}

          {sectionActive === 'documentation' && (
            <SectionDocumentation />
          )}

        </div>
      </div>

    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// CoquilleDashboard
// ─────────────────────────────────────────────────────────────────────────────
import { DOCUMENTATION_MLAM } from './data/documentationMlam';

function CoquilleDashboard() {
  const { isDark, toggleTheme } = useTheme();

  const [vueApp,    setVueApp]    = useState('dashboard');
  const [vueActive, setVueActive] = useState(null);

  const { simulationRef, tick, metrics, anomalies, kpis, loading, loadError } = useCitySimulation();

  const [anomalieActive, setAnomalieActive] = useState(null);
  const [filtreActif,    setFiltreActif]    = useState('tous');

  const [styleCarteFond, setStyleCarteFond]           = useState('technique');
  const [anonymisationActive, setAnonymisationActive] = useState(false);
  const [afficherPollution, setAfficherPollution]     = useState(true);
  const [afficherLignesBus, setAfficherLignesBus]     = useState(true);
  const [afficherNomsQuartiers, setAfficherNomsQuartiers] = useState(false);
  const [roleUtilisateur, setRoleUtilisateur]         = useState('admin');
  const [frequenceArchivage, setFrequenceArchivage]   = useState('15min');

  const [simSettings, setSimSettings] = useState({
    nbVehicules:  150,
    vitesseMulti: 1.0,
    seuilCO2:     600,
    seuilPM25:    35,
  });

  useEffect(() => {
    if (simulationRef?.current) {
      simulationRef.current._params = { ...simSettings };
    }
  }, [simSettings, simulationRef]);

  function handleFiltreMetrique(type) {
    setFiltreActif(prev => prev === type ? 'tous' : type);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Source unique de vérité — filtrage des anomalies selon vueActive
  // ─────────────────────────────────────────────────────────────────────────
  const anomaliesFiltrees = useMemo(() => {
    const source = Array.isArray(anomalies) ? anomalies : [];

    if (vueActive === null) return source;

    if (vueActive === 'trafic') {
      return source.filter(a => (a?.sensor ?? '').startsWith('CAP-TRF'));
    }

    if (vueActive === 'pollution') {
      return source.filter(a => (a?.sensor ?? '').startsWith('CAP-ENV'));
    }

    return source;
  }, [anomalies, vueActive]);

  const [modal, setModal] = useState({
    ouvert: false, anomalie: null, chargement: false,
    rapport: null, source: 'simulation', erreur: null,
  });

  const gererGenerationRapport = useCallback(async (anomalie) => {
    setAnomalieActive(anomalie);
    setModal({ ouvert: true, anomalie, chargement: true, rapport: null, source: 'simulation', erreur: null });
    const resultat = await generateUrbanReport(anomalie);
    setModal(prev => ({
      ...prev,
      chargement: false,
      rapport:    resultat.report ?? null,
      source:     resultat.source ?? 'simulation',
      erreur:     resultat.error  ?? null,
    }));
  }, []);

  function handleSelectAnomalie(anomalie) { setAnomalieActive(anomalie); }

  function fermerModal() {
    setModal({ ouvert: false, anomalie: null, chargement: false, rapport: null, source: 'simulation', erreur: null });
  }

  const handleResetSimulation = useCallback(() => {
    if (typeof simulationRef?.current?.reset === 'function') {
      simulationRef.current.reset();
    }
    setSimSettings({ nbVehicules: 150, vitesseMulti: 1.0, seuilCO2: 600, seuilPM25: 35 });
    setAnomalieActive(null);
    setModal({ ouvert: false, anomalie: null, chargement: false, rapport: null, source: 'simulation', erreur: null });
  }, [simulationRef]);

  function handleChangeVueActive(nouvelleVue) {
    setVueActive(nouvelleVue);
  }

  // ─────────────────────────────────────────────────────────────────────────
  function renderContenuPrincipal() {

    // ══════════════════════════════════════════════════════════════════════
    // GARDE PRIORITAIRE — supervision active (trafic ou pollution)
    // ══════════════════════════════════════════════════════════════════════
    if (vueActive !== null) {
      return (
        <div className="w-full h-[calc(100vh-80px)] flex flex-row overflow-hidden">

          {/* Colonne gauche — Indicateurs, largeur fixe compacte */}
          <aside className="w-64 flex-shrink-0 bg-slate-900/60 p-4 border-r border-slate-800/80 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className="block h-1 w-4 rounded-full bg-slate-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {vueActive === 'pollution' ? "Qualité de l'air" : 'Indicateurs Trafic'}
              </span>
            </div>
            <PanneauIndicateurs vueActive={vueActive} kpis={kpis} metrics={metrics} />
          </aside>

          {/* Colonne centrale — Carte, occupe tout l'espace restant */}
          <main className="flex-1 h-full relative">
            <CityMap
              simulationRef={simulationRef}
              tick={tick}
              anomalies={anomaliesFiltrees}
              filtreActif={filtreActif}
              vueActive={vueActive}
              vuePure={false}
              onRapportIA={gererGenerationRapport}
              loading={loading}
              loadError={loadError}
            />
          </main>

          {/* Colonne droite — Anomalies, largeur fixe compacte */}
          <aside className="w-80 flex-shrink-0 bg-slate-900/60 p-4 border-l border-slate-800/80 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <Radio size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Anomalies ({anomaliesFiltrees.length})
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar
                alerts={anomaliesFiltrees}
                onGenerateReport={gererGenerationRapport}
                onSelectAnomalie={handleSelectAnomalie}
              />
            </div>
            <div className="shrink-0 border-t border-slate-800/60 pt-2 mt-2">
              <ZoneIntervention anomalie={anomalieActive} onFermer={() => setAnomalieActive(null)} />
            </div>
          </aside>

        </div>
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // Onglets sidebar — actifs uniquement si vueActive === null
    // ══════════════════════════════════════════════════════════════════════

    if (vueApp === 'carte_pure') {
      return (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex flex-1 flex-col overflow-hidden relative">
            <CityMap
              simulationRef={simulationRef}
              tick={tick}
              anomalies={[]}
              vuePure={true}
              loading={loading}
              loadError={loadError}
            />
          </main>
        </div>
      );
    }

    if (vueApp === 'alertes') {
      return (
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex flex-col flex-1 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md transition-colors duration-200">
            <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800/80">
              <ShieldAlert size={13} strokeWidth={2} className="text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
                Centre d&apos;Alertes ({anomalies.length})
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar alerts={anomalies} onGenerateReport={gererGenerationRapport} onSelectAnomalie={handleSelectAnomalie} />
            </div>
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800/80 p-2">
              <ZoneIntervention anomalie={anomalieActive} onFermer={() => setAnomalieActive(null)} />
            </div>
          </aside>
        </div>
      );
    }

    if (vueApp === 'parametres') {
      return (
        <div className="flex flex-1 overflow-hidden">
          <VueParametres
            simSettings={simSettings}
            onSettingsChange={setSimSettings}
            onReset={handleResetSimulation}
            simulationRef={simulationRef}
            anomalies={anomalies}
            isDark={isDark}
            toggleTheme={toggleTheme}
            styleCarteFond={styleCarteFond}
            onChangeStyleCarteFond={setStyleCarteFond}
            anonymisationActive={anonymisationActive}
            onToggleAnonymisation={() => setAnonymisationActive(v => !v)}
            afficherPollution={afficherPollution}
            onToggleAfficherPollution={() => setAfficherPollution(v => !v)}
            afficherLignesBus={afficherLignesBus}
            onToggleAfficherLignesBus={() => setAfficherLignesBus(v => !v)}
            afficherNomsQuartiers={afficherNomsQuartiers}
            onToggleAfficherNomsQuartiers={() => setAfficherNomsQuartiers(v => !v)}
            roleUtilisateur={roleUtilisateur}
            onChangeRoleUtilisateur={setRoleUtilisateur}
            frequenceArchivage={frequenceArchivage}
            onChangeFrequenceArchivage={setFrequenceArchivage}
          />
        </div>
      );
    }
    // ── dashboard — carte VIERGE au centre ───────────────────────────────────
    return (
      <div className="flex flex-1 flex-col overflow-y-auto gap-4 p-4">
        <GrilleMetriques />

        <div className="relative w-full h-[350px] shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-sm">
          <CityMap
            simulationRef={simulationRef}
            tick={tick}
            anomalies={anomalies}
            filtreActif={filtreActif}
            vueActive={null}
            vuePure={true}
            onRapportIA={gererGenerationRapport}
            loading={loading}
            loadError={loadError}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="flex flex-col h-64 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2 px-4 py-2 shrink-0 border-b border-slate-200 dark:border-slate-800/80">
              <ShieldAlert size={12} strokeWidth={2} className="text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Anomalies</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar alerts={anomalies} onGenerateReport={gererGenerationRapport} onSelectAnomalie={handleSelectAnomalie} />
            </div>
          </div>

          <div className="flex flex-col h-64 rounded-lg p-4 gap-2 border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Qualité de l&apos;air</span>
            <div className="flex-1 flex items-end gap-2">
              {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-slate-500/50" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          <div className="flex flex-col h-64 rounded-lg p-4 gap-2 border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Trafic — Analytique</span>
            <div className="flex-1 flex items-end gap-1.5">
              {[20, 45, 35, 60, 50, 75, 65, 80, 55, 40].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-slate-600/50" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={[
      'relative flex h-screen w-full overflow-hidden',
      'transition-colors duration-200',
      'text-slate-800 dark:text-slate-100',

      // Mode CLAIR — papier technique, grille très discrète
      'bg-slate-100',
      'bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)]',
      'bg-[size:4rem_4rem]',

      // Mode SOMBRE — ardoise/carbone mat, grille fine et sourde
      'dark:bg-slate-950',
      'dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]',
      'dark:bg-[size:4rem_4rem]',
    ].join(' ')}>

      {/* Voile neutre — relief subtil sans teinte vive */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.06),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.25),transparent_55%)]" />

      <NavLaterale vueApp={vueApp} onChangeVue={setVueApp} />

      <div className="relative z-10 flex flex-col flex-1 h-full w-full min-w-0 overflow-hidden pl-16">
        <BarreHaut
          vueActive={vueActive}
          onChangeVue={handleChangeVueActive}
          onRetour={() => setVueActive(null)}
          afficherSelecteurVue={
            vueActive !== null ||
            vueApp === 'dashboard' ||
            vueApp === 'carte_pure'
          }
        />
        {renderContenuPrincipal()}
        <BarreEtat simulationRef={simulationRef} anomalies={anomalies} />
      </div>

      {modal.ouvert && (
        <ModalRapport
          ouvert={modal.ouvert}   anomalie={modal.anomalie}
          chargement={modal.chargement} rapport={modal.rapport}
          source={modal.source}   erreur={modal.erreur}
          onFermer={fermerModal}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App — export default unique
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <CoquilleDashboard />
    </ThemeProvider>
  );
}
