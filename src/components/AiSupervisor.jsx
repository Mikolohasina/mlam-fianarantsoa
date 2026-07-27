/**
 * AiSupervisor.jsx  —  src/components/AiSupervisor.jsx
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Module d'analyse predictive IA — style "Cyber-securite / Control Room".
 * Affiche un bouton de lancement d'analyse, un etat de chargement skeleton,
 * et le resultat formate en liste d'actions recommandees.
 *
 * Necessite : npm install framer-motion
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Loader2, AlertTriangle,
  CheckCircle2, ChevronRight, Sparkles,
} from 'lucide-react';
import { analyzeUrbanStatus } from '../services/geminiService';

// ─────────────────────────────────────────────────────────────────────────────
// Parsing du texte de reponse en sections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Separe le texte d'analyse en un constat (paragraphe libre) et une liste
 * d'actions (lignes commencant par "- ").
 */
function parserAnalyse(texte) {
  if (!texte) return { constat: '', actions: [] };

  const lignes  = texte.split('\n').map(l => l.trim()).filter(Boolean);
  const actions = lignes.filter(l => l.startsWith('-')).map(l => l.replace(/^-\s*/, ''));
  const constat = lignes.filter(l => !l.startsWith('-')).join(' ');

  return { constat, actions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton de chargement — animation de pulsation type scan
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonChargement() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Loader2 size={14} className="text-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase">
          Analyse en cours...
        </span>
      </div>
      {[1, 0.85, 0.7].map((largeur, i) => (
        <motion.div
          key={i}
          className="h-3 rounded bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"
          style={{ width: `${largeur * 100}%`, backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: i * 0.15 }}
        />
      ))}
      <div className="h-px bg-slate-800 my-1" />
      {[0.9, 0.95, 0.6].map((largeur, i) => (
        <motion.div
          key={`a${i}`}
          className="h-2.5 rounded bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"
          style={{ width: `${largeur * 100}%`, backgroundSize: '200% 100%' }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', delay: 0.45 + i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Affichage du resultat — constat + liste d'actions
// ─────────────────────────────────────────────────────────────────────────────

function ResultatAnalyse({ constat, actions, source }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col gap-3"
    >
      {/* Badge source */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-400">
          <CheckCircle2 size={12} strokeWidth={2.5} />
          Analyse complete
        </span>
        <span className={[
          'text-xs px-2 py-0.5 rounded-full font-bold font-mono',
          source === 'gemini'
            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
            : 'bg-slate-700/50 text-slate-400 border border-slate-600/40',
        ].join(' ')}>
          {source === 'gemini' ? 'GEMINI 2.0' : 'MOTEUR LOCAL'}
        </span>
      </div>

      {/* Constat */}
      {constat && (
        <p className="text-sm text-slate-300 leading-relaxed font-light">
          {constat}
        </p>
      )}

      {/* Liste d'actions */}
      {actions.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
            Actions recommandees
          </span>
          {actions.map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
              className="flex items-start gap-2.5 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-3 py-2.5"
            >
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold font-mono shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">{action}</p>
              <ChevronRight size={12} className="text-cyan-500/40 shrink-0 mt-0.5 ml-auto" />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Etat d'erreur
// ─────────────────────────────────────────────────────────────────────────────

function ErreurAnalyse({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5"
    >
      <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-xs text-red-300 leading-relaxed">{message}</p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AiSupervisor
 *
 * Props :
 *   metrics   — Array depuis useCitySimulation (co2, pm25, traffic)
 *   anomalies — Array d'anomalies actives
 */
export default function AiSupervisor({ metrics, anomalies }) {
  const [statut,   setStatut]   = useState('idle'); // idle | loading | done | error
  const [constat,  setConstat]  = useState('');
  const [actions,  setActions]  = useState([]);
  const [source,   setSource]   = useState('simulation');
  const [erreur,   setErreur]   = useState('');

  async function lancerAnalyse() {
    setStatut('loading');
    setErreur('');

    const resultat = await analyzeUrbanStatus(metrics, anomalies);

    if (resultat.success && resultat.analysis) {
      const { constat: c, actions: a } = parserAnalyse(resultat.analysis);
      setConstat(c);
      setActions(a);
      setSource(resultat.source);
      setStatut('done');
    } else {
      setErreur(resultat.error ?? 'Erreur inconnue lors de l\'analyse.');
      setStatut('error');
    }
  }

  const nbAnomalies = Array.isArray(anomalies) ? anomalies.length : 0;
  const nbCritiques = Array.isArray(anomalies)
    ? anomalies.filter(a => a?.priority === 'critical').length
    : 0;

  return (
    <div className={[
      'relative overflow-hidden rounded-2xl',
      'border border-cyan-500/20',
      'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950',
      'shadow-[0_0_40px_-12px_rgba(34,211,238,0.25)]',
    ].join(' ')}>

      {/* Grille de fond type scanner */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Ligne de scan animee */}
      {statut === 'loading' && (
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          initial={{ top: '0%' }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Contenu */}
      <div className="relative p-5 flex flex-col gap-4">

        {/* En-tete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
              <Brain size={16} strokeWidth={2} className="text-cyan-400" />
              {statut === 'loading' && (
                <motion.span
                  className="absolute inset-0 rounded-xl border border-cyan-400"
                  animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-100 tracking-tight">
                Superviseur IA
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Analyse predictive — Fianarantsoa
              </span>
            </div>
          </div>

          {nbCritiques > 0 && (
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/25">
              <span className="block h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-xs font-bold font-mono text-red-300">
                {nbCritiques}
              </span>
            </span>
          )}
        </div>

        {/* Contexte resume */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
          <span>{nbAnomalies} anomalie{nbAnomalies > 1 ? 's' : ''} active{nbAnomalies > 1 ? 's' : ''}</span>
          <span className="h-1 w-1 rounded-full bg-slate-700" />
          <span>Reseau RN7 + axes secondaires</span>
        </div>

        {/* Bouton de lancement */}
        {statut !== 'loading' && (
          <motion.button
            type="button"
            onClick={lancerAnalyse}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className={[
              'group flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl',
              'text-xs font-bold uppercase tracking-widest font-mono',
              'bg-gradient-to-r from-cyan-500 to-blue-600',
              'text-white shadow-lg shadow-cyan-500/20',
              'hover:shadow-cyan-500/40 transition-shadow duration-300',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            ].join(' ')}
          >
            <Zap size={13} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-200" />
            {statut === 'idle' ? "Lancer l'analyse IA" : 'Relancer l\'analyse'}
            <Sparkles size={12} strokeWidth={2} className="opacity-70" />
          </motion.button>
        )}

        {/* Zone de resultat */}
        <AnimatePresence mode="wait">
          {statut === 'loading' && (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <SkeletonChargement />
            </motion.div>
          )}

          {statut === 'done' && (
            <ResultatAnalyse key="done" constat={constat} actions={actions} source={source} />
          )}

          {statut === 'error' && (
            <ErreurAnalyse key="error" message={erreur} />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
