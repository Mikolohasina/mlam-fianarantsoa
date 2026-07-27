/**
 * App.jsx  —  src/App.jsx
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Orchestrateur principal : monte le ThemeProvider, instancie le hook de
 * simulation, distribue les données aux trois panneaux et gère le cycle
 * de vie de la modale de rapport IA.
 */

import { useState, useCallback } from 'react';
import { ZoneIntervention } from './components/ZoneIntervention';

import {
  LayoutDashboard,
  Radio,
  FileText,
  X,
  Loader,
  TriangleAlert,
  Copy,
  Check,
} from 'lucide-react';

import { ThemeProvider }       from './context/ThemeContext';
import { useTheme }            from './context/ThemeContext';
import ThemeToggle             from './components/ThemeToggle';
import Metrics                 from './components/Metrics';
import Sidebar                 from './components/Sidebar';
import CityMap                 from './map/CityMap';
import useCitySimulation       from './hooks/useCitySimulation';
import { generateUrbanReport } from './services/aiService';

// ─────────────────────────────────────────────────────────────────────────────
// BarreEtat — bandeau de 24px en bas de l'écran
// ─────────────────────────────────────────────────────────────────────────────

function BarreEtat({ simulationRef, anomalies }) {
  const nbVehicules = simulationRef?.current?.vehicles?.length ?? 0;
  const nbCritiques = (Array.isArray(anomalies) ? anomalies : [])
    .filter(a => a?.priority === 'critical').length;

  return (
    <footer className={[
      'flex items-center justify-between px-5 h-6 shrink-0',
      'border-t border-slate-200 dark:border-slate-800',
      'bg-white dark:bg-slate-900',
      'transition-colors duration-200',
    ].join(' ')}>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {nbVehicules} vehicule{nbVehicules > 1 ? 's' : ''} actif{nbVehicules > 1 ? 's' : ''}
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

const SEUILS = {
  trafic:      { warn: 65, crit: 85  },
  infractions: { warn: 3,  crit: 8   },
  secours:     { warn: 1,  crit: 3   },
};

function calcNiveau(id, valeur) {
  const s = SEUILS[id];
  if (!s) return 'ok';
  if (valeur >= s.crit) return 'crit';
  if (valeur >= s.warn) return 'warn';
  return 'ok';
}

// Couleur appliquee UNIQUEMENT sur le chiffre et la micro-pastille
const NIVEAU_STYLES = {
  ok:   { chiffre: 'text-slate-800 dark:text-slate-100', pastille: 'bg-emerald-500', label: 'Normal'   },
  warn: { chiffre: 'text-amber-700  dark:text-amber-400', pastille: 'bg-amber-500',   label: 'Eleve'    },
  crit: { chiffre: 'text-red-600    dark:text-red-400',   pastille: 'bg-red-600',     label: 'Critique' },
};

const METRIQUES = [
  {
    id:      'trafic',
    label:   'Trafic global',
    valeur:  72,
    unite:   '%',
    detail:  'Densite reseau RN7',
    Icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l4-8 4 4 4-6 4 10"/>
      </svg>
    ),
  },
  {
    id:      'infractions',
    label:   'Infractions',
    valeur:  11,
    unite:   '',
    detail:  'Vehicules sanctionnes',
    Icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    id:      'secours',
    label:   'Secours actifs',
    valeur:  2,
    unite:   '',
    detail:  'Interventions en cours',
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
      {METRIQUES.map(({ id, label, valeur, unite, detail, Icon }) => {
        const niveau = calcNiveau(id, valeur);
        const styles = NIVEAU_STYLES[niveau];

        return (
          <div
            key={id}
            className={[
              'relative flex flex-col gap-3 rounded-xl px-4 py-4',
              'bg-white dark:bg-slate-900',
              'border border-slate-200 dark:border-slate-800',
              'shadow-sm hover:shadow-md transition-shadow duration-200',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                  <Icon />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600 truncate">
                  {label}
                </span>
              </div>

              <span
                title={styles.label}
                className={[
                  'h-2 w-2 rounded-full shrink-0',
                  styles.pastille,
                  niveau === 'crit' ? 'animate-pulse' : '',
                ].join(' ')}
              />
            </div>

            <div className="flex items-baseline gap-1">
              <span className={[
                'text-3xl font-bold font-mono tabular-nums tracking-tight leading-none',
                styles.chiffre,
              ].join(' ')}>
                {valeur}
              </span>
              {unite && (
                <span className="text-sm font-mono text-slate-400 dark:text-slate-600 mb-0.5">
                  {unite}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-600 leading-none">
              {detail}
            </p>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-mono text-slate-400 dark:text-slate-600">
                Statut
              </span>
              <span className={[
                'text-xs font-mono font-semibold',
                niveau === 'ok'
                  ? 'text-slate-400 dark:text-slate-600'
                  : styles.chiffre,
              ].join(' ')}>
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
// BarreHaut — en-tête fixe de 48px
// ─────────────────────────────────────────────────────────────────────────────

function BarreHaut() {
  return (
    <header className={[
      'flex items-center justify-between h-12 px-5 shrink-0',
      'bg-white dark:bg-slate-900',
      'border-b border-slate-200 dark:border-slate-800',
      'transition-colors duration-200',
    ].join(' ')}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard
            size={15}
            strokeWidth={1.75}
            className="text-blue-600 dark:text-blue-400 shrink-0"
          />
          <span className="text-sm font-bold tracking-widest uppercase text-slate-900 dark:text-slate-100">
            M&apos;LAM
          </span>
        </div>

        <span aria-hidden="true" className="block h-4 w-px bg-slate-300 dark:bg-slate-700" />

        <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase hidden sm:block">
          Urban Monitoring — Fianarantsoa
        </span>

        <span className="flex items-center gap-1.5 ml-1">
          <Radio size={11} className="text-emerald-500 dark:text-emerald-400" />
          <span className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </span>
      </div>

      <ThemeToggle />
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalRapport — modale plein écran affichant le rapport IA
// ─────────────────────────────────────────────────────────────────────────────

function ModalRapport({ ouvert, chargement, anomalie, rapport, source, erreur, onClose }) {
  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wider text-slate-200">
              M'LAM // RAPPORT URBAIN
            </span>
            {source === 'simulation' ? (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded">
                Mode Simulation (Hors-ligne)
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                Garantie IA Gemini
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-300">
          {chargement ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-mono text-slate-400 animate-pulse">
                Analyse des flux vidéo et rédaction du protocole en cours...
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
                <div><span className="text-indigo-400">INDEX :</span> {anomalie?.id}</div>
                <div><span className="text-indigo-400">ZONE  :</span> {anomalie?.zone}</div>
                <div><span className="text-indigo-400">ALERTE :</span> {anomalie?.priority?.toUpperCase()}</div>
              </div>

              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 min-h-[150px]">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300 select-all">
                  {rapport || "Aucun rapport n'a pu être extrait pour cet incident."}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoquilleDashboard — layout principal sans ThemeProvider
// ─────────────────────────────────────────────────────────────────────────────

function CoquilleDashboard() {
  const { isDark } = useTheme();

  // Source de vérité unique — toutes les données viennent d'ici
  const { simulationRef, metrics, anomalies, kpis } = useCitySimulation();

  // État de la modale de rapport IA
  const [modal, setModal] = useState({
    ouvert:     false,
    anomalie:   null,
    chargement: false,
    rapport:    null,
    source:     'simulation',
    erreur:     null,
  });

  const gererGenerationRapport = useCallback(async (anomalie) => {
    let annule = false;
  
    setModal({
      ouvert:     true,
      anomalie,
      chargement: true,
      rapport:    null,
      source:     'simulation',
      erreur:     null,
    });
  
    const resultat = await generateUrbanReport(anomalie);
  
    if (annule) return; 
  
    setModal(prev => ({
      ...prev,
      chargement: false,
      rapport:    resultat.rapport ?? null,   
      source:     resultat.source  ?? 'simulation',
      erreur:     resultat.erreur  ?? null,   
    }));
  
    return () => { annule = true; };
  }, []);

  // Ajouter dans CoquilleDashboard(), après les useState existants
const [filtreActif, setFiltreActif] = useState('tous');

function handleFiltreMetrique(type) {
  setFiltreActif(prev => prev === type ? 'tous' : type); // reclique = reset
}

  function fermerModal() {
    setModal({
      ouvert:     false,
      anomalie:   null,
      chargement: false,
      rapport:    null,
      source:     'simulation',
      erreur:     null,
    });
  }

  return (
    <div className={[
      'flex flex-col h-screen w-screen overflow-hidden',
      'bg-slate-100 dark:bg-slate-950',
      'text-slate-900 dark:text-slate-100',
      'transition-colors duration-200',
    ].join(' ')}>

      {/* En-tête */}
      <BarreHaut />

      {/* Zone principale à 3 colonnes */}
      <div className="flex flex-1 overflow-hidden">

        {/* Colonne gauche — Métriques */}
        <aside className={[
          'flex flex-col w-[18%] shrink-0 overflow-hidden',
          'bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-800',
          'transition-colors duration-200',
        ].join(' ')}>
          <div className={[
            'flex items-center gap-2 px-4 py-3 shrink-0',
            'border-b border-slate-200 dark:border-slate-800',
          ].join(' ')}>
            <span className="block h-1 w-4 rounded-full bg-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              Indicateurs
            </span>
          </div>
          <Metrics
  metrics={metrics}
  kpis={kpis}
  filtreActif={filtreActif}
  onFiltreChange={handleFiltreMetrique}
/>

        </aside>

        {/* Colonne centrale — Carte */}
        <main className={[
          'flex flex-1 flex-col overflow-hidden relative',
          'bg-slate-100 dark:bg-slate-950',
          'transition-colors duration-200',
        ].join(' ')}>
          <CityMap
  simulationRef={simulationRef}
  anomalies={anomalies}
  filtreActif={filtreActif}
  onRapportIA={gererGenerationRapport}
/>
        </main>

        {/* Colonne droite — Anomalies & Module d'urgence */}
        <aside className={[
          'flex flex-col w-[18%] shrink-0 gap-4 p-4',
          'bg-white dark:bg-slate-900',
          'border-l border-slate-200 dark:border-slate-800',
          'transition-colors duration-200 overflow-y-auto',
        ].join(' ')}>
          <div className="flex items-center gap-2 shrink-0 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Radio size={13} strokeWidth={2} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
              Anomalies
            </span>
          </div>
          
          {/* Liste des anomalies existantes */}
          <Sidebar
            alerts={anomalies}
            onGenerateReport={gererGenerationRapport}
          />

          {/* Nouveau Module d'Intervention connecté en temps réel */}
          <ZoneIntervention anomalie={modal.anomalie} />
        </aside>

      </div>

      {/* Barre d'état */}
      <BarreEtat simulationRef={simulationRef} anomalies={anomalies} />

      {/* Modale IA — Alignée sur onClose pour fermer correctement */}
      {modal.ouvert && (
        <ModalRapport
          anomalie={modal.anomalie}
          chargement={modal.chargement}
          rapport={modal.rapport}
          source={modal.source}
          erreur={modal.erreur}
          onClose={fermerModal}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App — export public avec ThemeProvider
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <CoquilleDashboard />
    </ThemeProvider>
  );
}