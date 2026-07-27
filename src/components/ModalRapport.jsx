// src/components/ModalRapport.jsx
import { useEffect, useState } from 'react';

const ETAPES_ANALYSE = [
  'Connexion au flux de surveillance urbaine…',
  'Analyse des capteurs de trafic en temps réel…',
  'Corrélation des données géospatiales…',
  'Rédaction du rapport administratif…',
  'Finalisation et contrôle qualité IA…',
];

function BarreProgression({ actif }) {
  const [etape, setEtape] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    if (!actif) { setEtape(0); setPct(4); return; }

    // Progression fausse mais crédible : avance par paliers irréguliers
    const paliers = [18, 38, 56, 74, 90];
    let i = 0;
    const avancer = () => {
      if (i >= paliers.length) return;
      setPct(paliers[i]);
      setEtape(i);
      i += 1;
    };

    avancer();
    const id = setInterval(avancer, 900 + Math.random() * 400);
    return () => clearInterval(id);
  }, [actif]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="truncate">{ETAPES_ANALYSE[etape]}</span>
        <span className="ml-3 shrink-0 text-cyan-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ModalRapport({ modal, onFermer }) {
  const { ouvert, anomalie, chargement, rapport, source, erreur } = modal;

  // Gestion du fade-in/slide-up via classe conditionnelle
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (ouvert) {
      // micro-delay pour que la transition CSS se déclenche après le montage
      const id = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(id);
    } else {
      setVisible(false);
    }
  }, [ouvert]);

  if (!ouvert) return null;

  const modeSimulation = erreur !== null; // rapport de secours actif

  return (
    /* Overlay */
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4
        transition-all duration-300
        ${visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'}`}
      onClick={onFermer}
    >
      {/* Panneau */}
      <div
        className={`relative w-full max-w-2xl rounded-2xl border border-slate-700/80
          bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60
          transition-all duration-300 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bandeau supérieur coloré selon gravité */}
        <div className={`h-1 w-full rounded-t-2xl ${
          anomalie?.gravite === 'CRITIQUE'
            ? 'bg-gradient-to-r from-red-600 via-orange-500 to-red-600'
            : 'bg-gradient-to-r from-cyan-600 to-blue-600'
        }`} />

        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-semibold tracking-widest text-slate-500 uppercase">
                Rapport M'LAM · IA Urbaine
              </span>
              {/* Pastille mode simulation — discrète, jamais bloquante */}
              {modeSimulation && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Mode Simulation · Hors-ligne
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-white leading-snug">
              {anomalie?.type ?? 'Incident'} —{' '}
              <span className="text-slate-300 font-normal">{anomalie?.routeKey ?? 'Axe inconnu'}</span>
            </h2>
          </div>

          <button
            onClick={onFermer}
            className="shrink-0 mt-0.5 text-slate-500 hover:text-white
              transition-colors rounded-lg p-1.5 hover:bg-slate-800"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="px-6 pb-6 space-y-4">
          {chargement ? (
            /* État chargement enrichi */
            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-5">
              <BarreProgression actif={chargement} />
            </div>
          ) : (
            /* Rapport textuel */
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 p-5
              max-h-80 overflow-y-auto
              scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">
                {rapport ?? 'Aucun contenu disponible.'}
              </p>
            </div>
          )}

          {/* Pied de modale : source + horodatage */}
          {!chargement && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>
                Source :{' '}
                <span className={source === 'gemini' ? 'text-cyan-400' : 'text-amber-400'}>
                  {source === 'gemini' ? 'Gemini AI' : 'Simulation locale'}
                </span>
              </span>
              <span>{new Date().toLocaleTimeString('fr-FR')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}