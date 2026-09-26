// src/App.jsx — Version responsive mobile-first
// Modifications uniquement sur le layout et la navigation
// Simulation, hooks, services : INCHANGÉS

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Radio, Map, ShieldAlert, Settings,
  Car, Zap, Wind, RotateCcw, AlertTriangle, Menu, X,
  ChevronLeft,
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

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const VUES_APP = [
  { id: 'dashboard',  label: 'Dashboard',        Icon: LayoutDashboard },
  { id: 'carte_pure', label: 'Carte',             Icon: Map             },
  { id: 'alertes',    label: "Alertes",           Icon: ShieldAlert     },
  { id: 'parametres', label: 'Paramètres',        Icon: Settings        },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook détection mobile
// ─────────────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const obs = new ResizeObserver(() => setMobile(window.innerWidth < 768));
    obs.observe(document.documentElement);
    return () => obs.disconnect();
  }, []);
  return mobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// BottomNav — navigation mobile (barre du bas style app native)
// ─────────────────────────────────────────────────────────────────────────────

function BottomNav({ vueApp, onChangeVue }) {
  return (
    <nav className={[
      'fixed bottom-0 inset-x-0 z-50',
      'flex items-center justify-around',
      'h-16 pb-[env(safe-area-inset-bottom,0px)]',
      'bg-slate-900/95 dark:bg-slate-950/95',
      'border-t border-slate-800',
      'backdrop-blur-md',
    ].join(' ')}>
      {VUES_APP.map(({ id, label, Icon }) => {
        const actif = vueApp === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChangeVue(id)}
            className={[
              'flex flex-col items-center justify-center gap-1',
              'w-16 h-full rounded-lg',
              'transition-all duration-150 active:scale-90',
              actif
                ? 'text-indigo-400'
                : 'text-slate-500 hover:text-slate-300',
            ].join(' ')}
          >
            <Icon size={20} strokeWidth={actif ? 2.2 : 1.75} />
            <span className={[
              'text-[10px] font-semibold tracking-wide leading-none',
              actif ? 'text-indigo-400' : 'text-slate-500',
            ].join(' ')}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavLaterale — desktop uniquement (inchangée visuellement)
// ─────────────────────────────────────────────────────────────────────────────

function NavLaterale({ vueApp, onChangeVue }) {
  return (
    <nav className={[
      'group/nav',
      'fixed top-0 left-0 z-50',
      'flex flex-col h-screen overflow-hidden',
      'w-16 hover:w-64',
      'transition-all duration-300 ease-in-out',
      'bg-slate-900/95 backdrop-blur-md',
      'border-r border-slate-800',
      // Masquée sur mobile
      'hidden md:flex',
    ].join(' ')}>
      <div className="flex items-center gap-3 h-12 px-4 shrink-0 border-b border-slate-800/80 overflow-hidden">
        <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 shrink-0">
          <LayoutDashboard size={14} strokeWidth={2} className="text-indigo-400" />
        </span>
        <span className={[
          'text-xs font-bold tracking-widest uppercase text-slate-200 whitespace-nowrap',
          'opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100',
        ].join(' ')}>
          M&apos;LAM
        </span>
      </div>

      <div className="flex flex-col gap-1 px-2 py-3 flex-1">
        {VUES_APP.map(({ id, label, Icon }) => {
          const estActif = vueApp === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeVue(id)}
              className={[
                'flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 w-full',
                'font-mono text-xs font-semibold uppercase tracking-wider',
                'transition-all duration-200 ease-out',
                estActif
                  ? 'bg-indigo-500/15 border border-indigo-400/40 text-indigo-300'
                  : 'border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/60',
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

      <div className="flex items-center gap-3 h-11 px-4 shrink-0 border-t border-slate-800/80 overflow-hidden">
        <span className="relative flex items-center justify-center h-2 w-2 shrink-0">
          <span className="absolute inset-0 rounded-full bg-emerald-500/50 animate-ping" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className={[
          'text-xs font-mono text-emerald-400 uppercase tracking-widest whitespace-nowrap',
          'opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100',
        ].join(' ')}>
          Live
        </span>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarreHautMobile — header mobile compact
// ─────────────────────────────────────────────────────────────────────────────

function BarreHautMobile({ vueApp, vueActive, onChangeVue }) {
  const labelVue = VUES_APP.find(v => v.id === vueApp)?.label ?? 'M\'LAM';
  return (
    <header className={[
      'fixed top-0 inset-x-0 z-40',
      'flex items-center justify-between h-12 px-4',
      'bg-slate-900/95 backdrop-blur-md',
      'border-b border-slate-800',
      'md:hidden',
      // Safe area top pour les encoches
      'pt-[env(safe-area-inset-top,0px)]',
    ].join(' ')}>
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-6 w-6 rounded bg-indigo-500/20 border border-indigo-500/30">
          <LayoutDashboard size={12} className="text-indigo-400" />
        </span>
        <span className="text-xs font-bold tracking-widest uppercase text-slate-200">
          M&apos;LAM
        </span>
        <span className="text-slate-700 text-xs">·</span>
        <span className="text-xs font-medium text-slate-400">{labelVue}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <Radio size={10} className="text-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-500">LIVE</span>
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BarreHaut — desktop uniquement (inchangée)
// ─────────────────────────────────────────────────────────────────────────────

function SelecteurVue({ vueActive, onChangeVue }) {
  const OPTIONS = [
    { id: 'trafic',    label: 'TRAFIC',   emoji: '📡' },
    { id: 'pollution', label: 'AIR',      emoji: '🍃' },
  ];
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
      {OPTIONS.map(opt => {
        const estActif = vueActive === opt.id;
        return (
          <button key={opt.id} type="button" onClick={() => onChangeVue?.(opt.id)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
              'font-mono text-xs font-bold uppercase tracking-widest',
              'border transition-all duration-200 ease-out',
              estActif
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600'
                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800',
            ].join(' ')}>
            <span className="text-sm">{opt.emoji}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BarreHaut({ vueActive, onChangeVue, afficherSelecteurVue }) {
  return (
    <header className={[
      'flex items-center justify-between h-12 px-5 shrink-0',
      'bg-white/70 dark:bg-slate-900/40 backdrop-blur-md',
      'border-b border-slate-200 dark:border-slate-800',
      // Masquée sur mobile (remplacée par BarreHautMobile)
      'hidden md:flex',
    ].join(' ')}>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase hidden lg:block">
          Urban Monitoring — Fianarantsoa
        </span>
        <span className="flex items-center gap-1.5">
          <Radio size={11} className="text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">Live</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {afficherSelecteurVue && <SelecteurVue vueActive={vueActive} onChangeVue={onChangeVue} />}
        <ThemeToggle />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SelecteurVueMobile — bascule trafic/pollution sur mobile
// ─────────────────────────────────────────────────────────────────────────────

function SelecteurVueMobile({ vueActive, onChangeVue }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-slate-800/80 border border-slate-700">
      {[
        { id: 'trafic',    label: '📡 Trafic'  },
        { id: 'pollution', label: '🍃 Air'      },
      ].map(opt => (
        <button key={opt.id} type="button" onClick={() => onChangeVue?.(opt.id)}
          className={[
            'px-3 py-1 rounded-full text-xs font-semibold font-mono transition-all duration-150',
            vueActive === opt.id
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400',
          ].join(' ')}>
          {opt.label}
        </button>
      ))}
    </div>
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
      'flex items-center justify-between px-4 h-6 shrink-0',
      'border-t border-slate-200 dark:border-slate-800',
      'bg-white/70 dark:bg-slate-900/40',
      // Sur mobile, la bottom nav est déjà là
      'hidden md:flex',
    ].join(' ')}>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {nbVehicules} véhicules
          </span>
        </span>
        {nbCritiques > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-600 dark:text-red-400 tabular-nums">
              {nbCritiques} critique{nbCritiques > 1 ? 's' : ''}
            </span>
          </span>
        )}
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-600">M&apos;LAM v1.0 — Fianarantsoa</span>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalRapport (inchangée, rendue responsive)
// ─────────────────────────────────────────────────────────────────────────────

const ETAPES = [
  { label: 'Connexion capteurs IoT...',        duree: 900      },
  { label: 'Analyse des flux...',              duree: 1400     },
  { label: 'Traitement données trafic...',     duree: 1200     },
  { label: 'Corrélation anomalies...',         duree: 1100     },
  { label: 'Rédaction rapport...',             duree: Infinity },
];

function BarreProgressionIA() {
  const [etapeIdx, setEtapeIdx] = useState(0);
  const [pct, setPct] = useState(0);
  useState(() => {
    let idx = 0; const timers = [];
    function avancer() {
      const e = ETAPES[idx];
      if (!e || e.duree === Infinity) return;
      timers.push(setTimeout(() => { idx++; setEtapeIdx(idx); avancer(); }, e.duree));
    }
    avancer();
    const debut = performance.now();
    const dur   = ETAPES.slice(0,-1).reduce((s,e) => s + e.duree, 0);
    let raf;
    function anim(now) {
      const v = Math.round(92 * (1 - Math.pow(1 - Math.min((now-debut)/dur,1), 2.5)));
      setPct(v); if (v < 92) raf = requestAnimationFrame(anim);
    }
    raf = requestAnimationFrame(anim);
    return () => { timers.forEach(clearTimeout); cancelAnimationFrame(raf); };
  });
  return (
    <div className="flex flex-col gap-3 py-6 px-1">
      <div className="flex items-center justify-center gap-3">
        <div className="relative flex items-center justify-center h-8 w-8">
          <span className="absolute inset-0 rounded-full border-2 border-cyan-500/40 animate-ping" />
          <span className="relative h-4 w-4 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </span>
        </div>
        <span className="text-xs font-mono text-cyan-300 tracking-wider animate-pulse uppercase">Analyse...</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between">
          <span className="text-xs font-mono text-slate-400">{ETAPES[Math.min(etapeIdx, ETAPES.length-1)]?.label ?? ''}</span>
          <span className="text-xs font-mono text-cyan-400 tabular-nums">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function ModalRapport({ ouvert, chargement, anomalie, rapport, source, erreur, onFermer }) {
  if (!ouvert) return null;
  const aRapport = Boolean(rapport?.trim());
  const aErreurSeule = !aRapport && Boolean(erreur);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onFermer(); }}>
      <div
        className={[
          'relative flex flex-col w-full sm:max-w-2xl',
          // Mobile : drawer depuis le bas ; desktop : modal centré
          'max-h-[90vh] sm:max-h-[88vh]',
          'rounded-t-2xl sm:rounded-2xl',
          'border border-slate-700/60',
          'bg-slate-950',
          'shadow-2xl shadow-[0_0_60px_-15px_rgba(99,102,241,0.2)]',
        ].join(' ')}
        onClick={e => e.stopPropagation()}>

        {/* Poignée mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <span className="block h-1 w-10 rounded-full bg-slate-700" />
        </div>

        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent rounded-t-2xl" />

        <div className="flex items-start justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-800 shrink-0">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-500">
                Rapport IA — M&apos;LAM
              </span>
              {!chargement && (
                <span className={[
                  'text-xs px-2 py-0.5 rounded-full font-mono font-semibold',
                  source === 'gemini'
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700',
                ].join(' ')}>
                  {source === 'gemini' ? 'GEMINI 2.0' : 'Mode Simulation'}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold font-mono text-slate-100 truncate">
              {anomalie?.id ?? '—'} — {anomalie?.zone ?? '—'}
            </h2>
          </div>
          <button type="button" onClick={onFermer}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {chargement && <BarreProgressionIA />}
          {!chargement && aErreurSeule && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <p className="text-xs font-mono text-red-300/80">{erreur}</p>
            </div>
          )}
          {!chargement && aRapport && (
            <div className="rounded-xl border px-4 py-3 bg-slate-900 border-slate-800">
              <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">{rapport}</pre>
            </div>
          )}
        </div>

        {!chargement && (
          <div className="flex items-center justify-end gap-2 px-4 sm:px-6 py-3 shrink-0 border-t border-slate-800
            pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            <button type="button" onClick={onFermer}
              className="px-4 py-2 rounded-lg text-xs font-mono font-semibold border border-slate-700 text-slate-400 hover:bg-slate-900 hover:text-slate-100 transition-all">
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GrilleMetriques — export nommé (inchangé)
// ─────────────────────────────────────────────────────────────────────────────

const SEUILS_KPI = { trafic: { warn:65, crit:85 }, infractions: { warn:3, crit:8 }, secours: { warn:1, crit:3 } };
function calcNiveau(id, v) { const s=SEUILS_KPI[id]; if(!s) return 'ok'; if(v>=s.crit) return 'crit'; if(v>=s.warn) return 'warn'; return 'ok'; }
const NIV = { ok:{chiffre:'text-slate-800 dark:text-slate-100',pastille:'bg-emerald-500',label:'Normal'}, warn:{chiffre:'text-amber-700 dark:text-amber-400',pastille:'bg-amber-500',label:'Élevé'}, crit:{chiffre:'text-red-600 dark:text-red-400',pastille:'bg-red-600',label:'Critique'} };
const METRIQUES_KPI = [
  {id:'trafic',label:'Trafic global',valeur:72,unite:'%',detail:'Densité RN7',Icon:()=><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l4-8 4 4 4-6 4 10"/></svg>},
  {id:'infractions',label:'Infractions',valeur:11,unite:'',detail:'Véhicules sanctionnés',Icon:()=><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
  {id:'secours',label:'Secours actifs',valeur:2,unite:'',detail:'Interventions en cours',Icon:()=><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>},
];

export function GrilleMetriques() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {METRIQUES_KPI.map(({ id, label, valeur, unite, detail, Icon }) => {
        const niveau = calcNiveau(id, valeur);
        const styles = NIV[niveau];
        return (
          <div key={id} className="relative flex flex-col gap-3 rounded-xl px-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0"><Icon /></span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 truncate">{label}</span>
              </div>
              <span className={['h-2 w-2 rounded-full shrink-0', styles.pastille, niveau==='crit'?'animate-pulse':''].join(' ')} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={['text-3xl font-bold font-mono tabular-nums', styles.chiffre].join(' ')}>{valeur}</span>
              {unite && <span className="text-sm font-mono text-slate-400 mb-0.5">{unite}</span>}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-600">{detail}</p>
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-mono text-slate-400">Statut</span>
              <span className={['text-xs font-mono font-semibold', niveau==='ok'?'text-slate-400':styles.chiffre].join(' ')}>{styles.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SliderParam (inchangé)
// ─────────────────────────────────────────────────────────────────────────────

function SliderParam({ label, valeur, min, max, pas=1, unite='', onChange, accentHex='#6366f1', description }) {
  const pct = Math.round(((valeur-min)/(max-min))*100);
  const dv  = typeof valeur==='number'&&valeur%1!==0?valeur.toFixed(1):valeur;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">{label}</span>
          {description && <span className="text-xs text-slate-400 dark:text-slate-600 leading-snug mt-0.5">{description}</span>}
        </div>
        <span className="shrink-0 min-w-[4rem] text-center px-2 py-1 rounded-lg text-sm font-mono font-bold bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 tabular-nums" style={{color:accentHex}}>
          {dv}{unite}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden pointer-events-none">
          <div className="h-full rounded-full transition-all duration-100" style={{width:`${pct}%`,backgroundColor:accentHex}} />
        </div>
        <input type="range" min={min} max={max} step={pas} value={valeur}
          onChange={e=>onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer outline-none appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer" />
      </div>
      <div className="flex justify-between text-xs font-mono text-slate-400 dark:text-slate-700 tabular-nums">
        <span>{min}{unite}</span><span>{max}{unite}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VueParametres — rendue scrollable sur mobile
// ─────────────────────────────────────────────────────────────────────────────

function VueParametres({ simSettings, onSettingsChange, onReset, simulationRef, anomalies }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const timerRef = useRef(null);
  const nbV = simulationRef?.current?.vehicles?.length ?? 0;
  const nbA = Array.isArray(anomalies) ? anomalies.length : 0;
  const nbC = Array.isArray(anomalies) ? anomalies.filter(a=>a?.priority==='critical').length : 0;

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); timerRef.current = setTimeout(()=>setConfirmReset(false),3000); return; }
    clearTimeout(timerRef.current); onReset(); setConfirmReset(false);
  }
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);

  const STATS = [
    {label:'Véhicules',value:nbV,hex:'#6366f1',Icon:Car},
    {label:'Anomalies',value:nbA,hex:'#f59e0b',Icon:AlertTriangle},
    {label:'Critiques', value:nbC,hex:'#ef4444',Icon:ShieldAlert},
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40">
        <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shrink-0">
          <Settings size={14} strokeWidth={2} className="text-indigo-400" />
        </span>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">Paramètres</h2>
          <p className="text-xs font-mono text-slate-400 dark:text-slate-600">M&apos;LAM Fianarantsoa</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-6 max-w-2xl mx-auto w-full pb-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {STATS.map(({label,value,hex,Icon})=>(
            <div key={label} className="flex flex-col gap-1.5 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-1">
                <Icon size={10} strokeWidth={2} style={{color:hex}} className="shrink-0 opacity-70" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 truncate">{label}</span>
              </div>
              <span className="text-xl font-bold font-mono tabular-nums" style={{color:hex}}>{value}</span>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-5 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <Car size={13} className="text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">Trafic</h3>
          </div>
          <SliderParam label="Véhicules simulés" valeur={simSettings.nbVehicules} min={10} max={500} pas={5} unite=" veh."
            onChange={v=>onSettingsChange(p=>({...p,nbVehicules:v}))} accentHex="#6366f1"
            description="Nombre de véhicules injectés dans la simulation" />
          <SliderParam label="Vitesse de rafraîchissement" valeur={simSettings.vitesseMulti} min={0.5} max={5.0} pas={0.5} unite="×"
            onChange={v=>onSettingsChange(p=>({...p,vitesseMulti:v}))} accentHex="#22d3ee"
            description="Multiplicateur du cycle de tick" />
        </section>

        <section className="flex flex-col gap-5 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
            <Wind size={13} className="text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">Seuils d&apos;alerte</h3>
          </div>
          <SliderParam label="CO2 critique" valeur={simSettings.seuilCO2} min={450} max={1000} pas={10} unite=" ppm"
            onChange={v=>onSettingsChange(p=>({...p,seuilCO2:v}))} accentHex="#34d399"
            description="Réf. Fianarantsoa : 390–420 ppm" />
          <SliderParam label="PM2.5 critique" valeur={simSettings.seuilPM25} min={15} max={75} pas={1} unite=" µg/m³"
            onChange={v=>onSettingsChange(p=>({...p,seuilPM25:v}))} accentHex="#f59e0b"
            description="Seuil OMS : 15 µg/m³" />
        </section>

        <button type="button" onClick={handleReset}
          className={[
            'flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl w-full',
            'font-mono text-xs font-bold uppercase tracking-widest',
            'transition-all duration-200 active:scale-[0.98]',
            confirmReset
              ? 'border border-red-500/80 bg-red-500/20 text-red-300'
              : 'border border-red-500/30 bg-red-500/8 text-red-500 hover:bg-red-500/15',
          ].join(' ')}>
          <RotateCcw size={14} strokeWidth={2} className={confirmReset?'animate-spin':''} />
          {confirmReset ? 'CONFIRMER LA RÉINITIALISATION' : 'RÉINITIALISER LA SIMULATION'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoquilleDashboard — orchestrateur principal, layout adaptatif
// ─────────────────────────────────────────────────────────────────────────────

function CoquilleDashboard() {
  const isMobile = useIsMobile();
  const [vueApp,    setVueApp]    = useState('dashboard');
  const [vueActive, setVueActive] = useState('trafic');

  const { simulationRef, metrics, anomalies, kpis, loading, loadError } = useCitySimulation();

  const [anomalieActive, setAnomalieActive] = useState(null);
  const [filtreActif,    setFiltreActif]    = useState('tous');
  const [toast,          setToast]          = useState(null);

  const [simSettings, setSimSettings] = useState({
    nbVehicules: 150, vitesseMulti: 1.0, seuilCO2: 600, seuilPM25: 35,
  });

  useEffect(() => {
    if (simulationRef?.current) simulationRef.current._params = { ...simSettings };
  }, [simSettings, simulationRef]);

  function handleFiltreMetrique(type) {
    setFiltreActif(prev => prev === type ? 'tous' : type);
  }

  function afficherToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4500);
  }

  const [modal, setModal] = useState({
    ouvert:false, anomalie:null, chargement:false, rapport:null, source:'simulation', erreur:null
  });

  const gererGenerationRapport = useCallback(async (anomalie) => {
    setAnomalieActive(anomalie);
    setModal({ ouvert:true, anomalie, chargement:true, rapport:null, source:'simulation', erreur:null });
    const r = await generateUrbanReport(anomalie);
    setModal(p => ({ ...p, chargement:false, rapport:r.report??null, source:r.source??'simulation', erreur:r.error??null }));
    if (r.report) afficherToast('✓ Transmission réussie — Rapport reçu par le Ministère');
  }, []);

  function fermerModal() {
    setModal({ ouvert:false, anomalie:null, chargement:false, rapport:null, source:'simulation', erreur:null });
  }

  const handleReset = useCallback(() => {
    if (typeof simulationRef?.current?.reset === 'function') simulationRef.current.reset();
    setSimSettings({ nbVehicules:150, vitesseMulti:1.0, seuilCO2:600, seuilPM25:35 });
    setAnomalieActive(null);
    fermerModal();
  }, [simulationRef]);

  // ── Carte — composant partagé ──────────────────────────────────────────────
  const carteElement = (
    <CityMap
      simulationRef={simulationRef}
      anomalies={anomalies}
      filtreActif={filtreActif}
      vueActive={vueActive}
      onRapportIA={gererGenerationRapport}
      loading={loading}
      loadError={loadError}
    />
  );

  // ── Layout MOBILE ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className={[
        'flex flex-col w-full overflow-hidden',
        'bg-slate-950 text-slate-100',
        // Hauteur = écran complet en tenant compte des safe areas
        'h-[100dvh]',
      ].join(' ')}>

        {/* Header mobile fixe */}
        <BarreHautMobile vueApp={vueApp} vueActive={vueActive} onChangeVue={setVueApp} />

        {/* Contenu — prend tout l'espace entre header et bottom nav */}
        <main className={[
          'flex-1 overflow-hidden',
          // Padding top = hauteur header + safe area top
          'pt-12',
          // Padding bottom = hauteur bottom nav + safe area bottom
          'pb-16',
        ].join(' ')}>

          {/* DASHBOARD mobile : carte plein écran + overlay KPIs */}
          {vueApp === 'dashboard' && (
            <div className="relative w-full h-full">
              {carteElement}

              {/* Overlay sélecteur vue */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
                <SelecteurVueMobile vueActive={vueActive} onChangeVue={setVueActive} />
              </div>

              {/* KPIs compacts en bas de carte */}
              <div className="absolute bottom-3 left-3 right-3 z-30 flex gap-2">
                {[
                  { label:'Véhicules', value: kpis?.vehicles ?? 0, color:'text-slate-200' },
                  { label:'Accidents', value: kpis?.accidents ?? 0, color: kpis?.accidents > 0 ? 'text-red-400' : 'text-slate-200' },
                  { label:'Congestion', value: kpis?.congestion ?? 0, color: kpis?.congestion > 0 ? 'text-amber-400' : 'text-slate-200' },
                ].map(k => (
                  <div key={k.label} className="flex-1 flex flex-col items-center gap-0.5 rounded-xl bg-slate-950/85 border border-slate-800/60 backdrop-blur-sm py-2 px-1">
                    <span className={['text-lg font-bold font-mono tabular-nums', k.color].join(' ')}>{k.value}</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{k.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CARTE PURE mobile */}
          {vueApp === 'carte_pure' && (
            <div className="relative w-full h-full">
              {carteElement}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
                <SelecteurVueMobile vueActive={vueActive} onChangeVue={setVueActive} />
              </div>
            </div>
          )}

          {/* ALERTES mobile — liste scrollable */}
          {vueApp === 'alertes' && (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  alerts={anomalies}
                  onGenerateReport={gererGenerationRapport}
                  onSelectAnomalie={a => setAnomalieActive(a)}
                />
              </div>
              {anomalieActive && (
                <div className="shrink-0 border-t border-slate-800 p-3">
                  <ZoneIntervention anomalie={anomalieActive} onFermer={() => setAnomalieActive(null)} />
                </div>
              )}
            </div>
          )}

          {/* PARAMÈTRES mobile */}
          {vueApp === 'parametres' && (
            <VueParametres
              simSettings={simSettings}
              onSettingsChange={setSimSettings}
              onReset={handleReset}
              simulationRef={simulationRef}
              anomalies={anomalies}
            />
          )}
        </main>

        {/* Bottom navigation */}
        <BottomNav vueApp={vueApp} onChangeVue={setVueApp} />

        {/* Modal rapport */}
        {modal.ouvert && (
          <ModalRapport
            ouvert={modal.ouvert} anomalie={modal.anomalie}
            chargement={modal.chargement} rapport={modal.rapport}
            source={modal.source} erreur={modal.erreur}
            onFermer={fermerModal}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-20 left-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-950/95 border border-emerald-500/40 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-mono font-semibold text-emerald-300">{toast}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Layout DESKTOP — inchangé ──────────────────────────────────────────────
  return (
    <div className={[
      'relative flex h-screen w-full overflow-hidden',
      'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100',
      'bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)]',
      'dark:bg-[linear-gradient(to_right,rgba(99,102,241,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.15)_1px,transparent_1px)]',
      'bg-[size:36px_36px]',
    ].join(' ')}>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.28),transparent_55%)]" />

      <NavLaterale vueApp={vueApp} onChangeVue={setVueApp} />

      <div className="relative z-10 flex flex-col flex-1 h-full w-full min-w-0 overflow-hidden pl-16">
        <BarreHaut
          vueActive={vueActive}
          onChangeVue={setVueActive}
          afficherSelecteurVue={vueApp === 'dashboard' || vueApp === 'carte_pure'}
        />

        {/* Contenu desktop selon la vue */}
        <div className="flex flex-1 overflow-hidden">
          {(vueApp === 'dashboard') && (
            <>
              <aside className="flex flex-col w-[18%] shrink-0 overflow-hidden bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border-r border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
                  <span className="block h-1 w-4 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Indicateurs</span>
                </div>
                <Metrics metrics={metrics} kpis={kpis} filtreActif={filtreActif} onFiltreChange={handleFiltreMetrique} />
              </aside>
              <main className="flex flex-1 flex-col overflow-hidden relative">{carteElement}</main>
              <aside className="flex flex-col w-[18%] shrink-0 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border-l border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
                  <Radio size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Anomalies</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Sidebar alerts={anomalies} onGenerateReport={gererGenerationRapport} onSelectAnomalie={a=>setAnomalieActive(a)} />
                </div>
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-2">
                  <ZoneIntervention anomalie={anomalieActive} onFermer={()=>setAnomalieActive(null)} />
                </div>
              </aside>
            </>
          )}
          {vueApp === 'carte_pure' && (
            <main className="flex flex-1 flex-col overflow-hidden relative">{carteElement}</main>
          )}
          {vueApp === 'alertes' && (
            <div className="flex flex-1 overflow-hidden">
              <aside className="flex flex-col flex-1 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
                  <ShieldAlert size={13} strokeWidth={2} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Centre d&apos;Alertes</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <Sidebar alerts={anomalies} onGenerateReport={gererGenerationRapport} onSelectAnomalie={a=>setAnomalieActive(a)} />
                </div>
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-2">
                  <ZoneIntervention anomalie={anomalieActive} onFermer={()=>setAnomalieActive(null)} />
                </div>
              </aside>
            </div>
          )}
          {vueApp === 'parametres' && (
            <main className="flex flex-1 flex-col overflow-hidden bg-white/40 dark:bg-slate-900/20">
              <VueParametres simSettings={simSettings} onSettingsChange={setSimSettings}
                onReset={handleReset} simulationRef={simulationRef} anomalies={anomalies} />
            </main>
          )}
        </div>

        <BarreEtat simulationRef={simulationRef} anomalies={anomalies} />
      </div>

      {modal.ouvert && (
        <ModalRapport ouvert={modal.ouvert} anomalie={modal.anomalie}
          chargement={modal.chargement} rapport={modal.rapport}
          source={modal.source} erreur={modal.erreur} onFermer={fermerModal} />
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-950/95 border border-emerald-500/40 backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-xs font-mono font-semibold text-emerald-300">{toast}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export default unique
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <CoquilleDashboard />
    </ThemeProvider>
  );
}
