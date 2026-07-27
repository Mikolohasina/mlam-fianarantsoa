// src/components/ZoneIntervention.jsx
// M'LAM Urban Monitoring System — Fianarantsoa, Madagascar

import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const PHASES_TRANSMISSION = [
  { label: 'INITIALISATION DU CANAL CHIFFRE...',  duree: 800  },
  { label: 'TRANSMISSION DES DONNEES EN COURS...', duree: 1400 },
  { label: 'CONFIRMATION DE RECEPTION...',         duree: 800  },
  { label: 'UNITES EN ROUTE',                      duree: Infinity },
];

// Retranscription radio simulée — un log par phase, indices alignés sur PHASES_TRANSMISSION
const LOGS_RADIO = [
  '[CENTRAL]: Accident détecté sur l\'axe principal, ouverture du canal sécurisé...',
  '[CENTRAL]: Canal établi, appel des agents en cours...',
  '[AGENT]: Reçu, sirènes activées, unité en route.',
  '[AGENT]: Unité arrivée sur zone, prise en charge de la mission.',
];

// ─────────────────────────────────────────────────────────────────────────────
// Icones SVG inline — pas de dependance lucide pour ce composant isole
// ─────────────────────────────────────────────────────────────────────────────

function IconeRadar({ taille = 16, className = '' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a10 10 0 0 1 10 10"/>
      <path d="M12 6a6 6 0 0 1 6 6"/>
      <path d="M12 10a2 2 0 0 1 2 2"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <line x1="12" y1="12" x2="20" y2="4"/>
    </svg>
  );
}

function IconeBouclier({ taille = 16, className = '' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  );
}

function IconeVeille({ taille = 16, className = '' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.18 2 2 0 0 1 3.69 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.1a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  );
}

function IconeFermer({ taille = 14, className = '' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.25"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BoutonFermer — bouton flottant "✕" réutilisable, câblé sur onFermer/onClose
// ─────────────────────────────────────────────────────────────────────────────

function BoutonFermer({ onFermer, teinte = 'slate' }) {
  if (typeof onFermer !== 'function') return null;

  const TEINTES = {
    slate:   'hover:bg-slate-800 hover:border-slate-600 text-slate-500 hover:text-slate-200',
    red:     'hover:bg-red-900/50 hover:border-red-600 text-red-500/70 hover:text-red-200',
    amber:   'hover:bg-amber-900/50 hover:border-amber-600 text-amber-500/70 hover:text-amber-200',
  };

  return (
    <button
      type="button"
      onClick={onFermer}
      aria-label="Fermer le panneau"
      className={[
        'absolute top-2.5 right-2.5 z-10',
        'flex items-center justify-center h-6 w-6 rounded-md shrink-0',
        'border border-transparent bg-black/20 backdrop-blur-sm',
        'transition-all duration-200 ease-out',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-1 focus:ring-slate-500',
        TEINTES[teinte] ?? TEINTES.slate,
      ].join(' ')}
    >
      <IconeFermer taille={12} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Etat de veille — affiché quand anomalie est null/undefined
// ─────────────────────────────────────────────────────────────────────────────

function EtatVeille({ onFermer }) {
  return (
    <div className={[
      'relative flex items-center gap-3 px-4 py-3 rounded-xl',
      'border border-slate-800',
      'bg-slate-950/80 backdrop-blur-sm',
      'transition-colors duration-300 hover:border-slate-700',
    ].join(' ')}>
      <BoutonFermer onFermer={onFermer} teinte="slate" />
      <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800/80 shrink-0">
        <IconeVeille taille={15} className="text-slate-500" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500">
          Canal radio securise
        </span>
        <span className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 animate-pulse" />
          EN VEILLE NOMINALE
        </span>
      </div>
      <span className="ml-auto mr-6 text-xs font-mono tabular-nums text-slate-700">
        {new Date().toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Alerte critique — accident, gyrophare, simulation d'appel secours
// ─────────────────────────────────────────────────────────────────────────────

function AlerteCritique({ anomalie, onFermer }) {
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [transmis,  setTransmis]  = useState(false);
  const [logs,      setLogs]      = useState([]);
  // ✅ FIX — hook déplacé à l'intérieur du composant qui l'utilise réellement
  const [canalRadioVisible, setCanalRadioVisible] = useState(true);
  const timers      = useRef([]);
  const logsBoxRef  = useRef(null);

  useEffect(() => {
    // Reinitialiser si une nouvelle anomalie critique arrive — logique originale inchangée
    setPhaseIdx(0);
    setTransmis(false);
    setLogs([LOGS_RADIO[0]]);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    let idx = 0;
    function avancer() {
      const phase = PHASES_TRANSMISSION[idx];
      if (!phase || phase.duree === Infinity) {
        setTransmis(true);
        return;
      }
      const id = setTimeout(() => {
        idx++;
        setPhaseIdx(idx);
        setLogs(prev => [...prev, LOGS_RADIO[idx] ?? prev[prev.length - 1]]);
        avancer();
      }, phase.duree);
      timers.current.push(id);
    }
    avancer();

    return () => timers.current.forEach(clearTimeout);
  }, [anomalie?.id]);

  // Auto-scroll du terminal radio — pur effet de rendu, ne touche à aucune donnée
  useEffect(() => {
    if (logsBoxRef.current) {
      logsBoxRef.current.scrollTop = logsBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const phase         = PHASES_TRANSMISSION[Math.min(phaseIdx, PHASES_TRANSMISSION.length - 1)];
  const estFinalise   = transmis || phase?.duree === Infinity;
  const coords        = anomalie?.position
    ? `${anomalie.position[0].toFixed(5)}° N / ${anomalie.position[1].toFixed(5)}° E`
    : '-21.43760° N / 47.08200° E';

  // Catégorie visuelle dérivée de l'état existant — n'introduit aucune nouvelle condition métier
  const categorie = estFinalise ? 'connecte' : phaseIdx === 0 ? 'radio' : 'appel';

  const STYLES_CATEGORIE = {
    radio: {
      bandeau:   'bg-red-950/60 border-red-900/40',
      texte:     'text-red-400',
      sousTexte: 'text-red-600/80',
      dot:       'bg-red-500 animate-pulse',
      anneau:    'bg-red-500/20',
      cercle:    'bg-red-950 border-red-700',
      icone:     'text-red-400 animate-pulse',
      label:     'ETABLISSEMENT DU CANAL RADIO...',
    },
    appel: {
      bandeau:   'bg-amber-950/50 border-amber-900/40',
      texte:     'text-amber-400',
      sousTexte: 'text-amber-600/80',
      dot:       'bg-amber-500 animate-pulse [animation-duration:600ms]',
      anneau:    'bg-amber-500/25',
      cercle:    'bg-amber-950 border-amber-700',
      icone:     'text-amber-400 animate-pulse [animation-duration:600ms]',
      label:     'APPEL DES AGENTS EN COURS...',
    },
    connecte: {
      bandeau:   'bg-emerald-950/40 border-emerald-900/40',
      texte:     'text-emerald-400',
      sousTexte: 'text-emerald-600/80',
      dot:       'bg-emerald-500',
      anneau:    'bg-emerald-500/25',
      cercle:    'bg-emerald-950 border-emerald-700',
      icone:     'text-emerald-400',
      label:     'AGENT CONNECTÉ — MISSION TRANSMISE',
    },
  };
  const sk = STYLES_CATEGORIE[categorie];

  return (
    <div className={[
      'relative flex flex-col gap-3 rounded-xl overflow-hidden',
      'border border-red-900/60',
      'bg-slate-950/90 backdrop-blur-sm',
      'shadow-[0_0_30px_-8px_rgba(239,68,68,0.35)]',
      'transition-shadow duration-300 hover:shadow-[0_0_36px_-6px_rgba(239,68,68,0.45)]',
    ].join(' ')}>

      {/* Keyframe local pour le scanner de frequence — aucune dependance a tailwind.config */}
      <style>{`
        @keyframes mlamScan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      <BoutonFermer onFermer={onFermer} teinte="red" />

      {/* Bandeau superieur — categorie dynamique (radio / appel / connecte) */}
      <div className={[
        'flex items-center gap-2.5 px-4 py-2.5 border-b transition-colors duration-500',
        sk.bandeau,
      ].join(' ')}>
        <span className="relative flex items-center justify-center h-7 w-7 shrink-0">
          {!estFinalise && (
            <span className={['absolute inset-0 rounded-full animate-ping', sk.anneau].join(' ')} />
          )}
          {estFinalise && (
            <span className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping" />
          )}
          <span className={[
            'relative h-7 w-7 rounded-full flex items-center justify-center border transition-colors duration-500',
            sk.cercle,
          ].join(' ')}>
            <IconeRadar taille={14} className={sk.icone} />
          </span>
        </span>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className={['text-xs font-mono font-bold uppercase tracking-widest transition-colors duration-500', sk.texte].join(' ')}>
            {sk.label}
          </span>
          <span className={['text-xs font-mono truncate transition-colors duration-500', sk.sousTexte].join(' ')}>
            {phase?.label ?? ''}
          </span>
        </div>

        <span className={['ml-auto mr-6 h-2 w-2 rounded-full shrink-0 transition-colors duration-500', sk.dot].join(' ')} />
      </div>

      {/* Bloc Canal Radio Sécurisé — repliable via le bouton "X" dédié */}
      {canalRadioVisible && (
        <div className="mx-4 rounded-lg px-4 py-3 bg-slate-900/60 border border-slate-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Canal Radio Sécurisé
            </span>
            <button
              type="button"
              onClick={() => setCanalRadioVisible(false)}
              aria-label="Fermer le canal radio"
              className="flex items-center justify-center h-6 w-6 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all duration-150"
            >
              ✕
            </button>
          </div>
          <p className="text-xs font-mono text-slate-500 leading-relaxed">
            Flux chiffré AES-256 — canal opérationnel entre le centre de commandement
            M&apos;LAM et les unités de terrain mobilisées sur cet incident.
          </p>
        </div>
      )}

      {/* Corps — details de l'incident (grille inchangee) */}
      <div className="flex flex-col gap-2 px-4 pb-3">

        <div
          className="grid gap-x-4 gap-y-1.5 text-xs font-mono"
          style={{ gridTemplateColumns: '100px 1fr' }}
        >
          {[
            ['REF.',        anomalie?.id            ?? 'ALT-XXX'],
            ['ZONE',        anomalie?.zone          ?? 'N/A'],
            ['CAPTEUR',     anomalie?.sensor        ?? 'N/A'],
            ['COORDONNEES', coords],
            ['HEURE',       anomalie?.time          ?? '--:--'],
          ].map(([cle, valeur]) => (
            <div key={cle} className="contents">
              <span className="text-slate-600 uppercase tracking-wider">{cle}</span>
              <span className="text-slate-300 truncate">{valeur}</span>
            </div>
          ))}
        </div>

        {anomalie?.description && (
          <p className={[
            'text-xs font-mono leading-relaxed',
            'px-3 py-2 rounded-lg',
            'border border-red-900/30 bg-red-950/30',
            'text-red-200/80',
          ].join(' ')}>
            {anomalie.description}
          </p>
        )}

        {/* Terminal radio — retranscription en direct */}
        <div
          ref={logsBoxRef}
          className={[
            'flex flex-col gap-1 max-h-24 overflow-y-auto',
            'px-3 py-2 rounded-lg',
            'border border-slate-800 bg-black/40',
            'font-mono text-xs scroll-smooth',
          ].join(' ')}
        >
          {logs.map((ligne, i) => (
            <p
              key={i}
              className={i === logs.length - 1 ? 'text-slate-200' : 'text-slate-600'}
            >
              {ligne}
              {i === logs.length - 1 && !estFinalise && (
                <span className="inline-block w-1.5 h-3 bg-slate-400 ml-1 align-middle animate-pulse" />
              )}
            </p>
          ))}
        </div>

        {/* Barre de progression transmission — inchangee */}
        {!estFinalise && (
          <div className="flex flex-col gap-1">
            <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-600 transition-all duration-700 ease-out"
                style={{ width: `${(phaseIdx / (PHASES_TRANSMISSION.length - 1)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-600 text-right tabular-nums">
              {Math.round((phaseIdx / (PHASES_TRANSMISSION.length - 1)) * 100)}%
            </span>
          </div>
        )}

        {/* Confirmation finale — inchangee */}
        {estFinalise && (
          <div className={[
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'border border-emerald-800/40 bg-emerald-950/30',
          ].join(' ')}>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-mono text-emerald-400">
              TRANSMISSION COMPLETE — ACCUSÉ DE RECEPTION REÇU
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Alerte warning — infraction, notification police municipale
// ─────────────────────────────────────────────────────────────────────────────

function AlerteWarning({ anomalie, onFermer }) {
  return (
    <div className={[
      'relative flex flex-col gap-3 rounded-xl overflow-hidden',
      'border border-amber-900/50',
      'bg-slate-950/80 backdrop-blur-sm',
      'transition-shadow duration-300 hover:shadow-[0_0_28px_-10px_rgba(245,158,11,0.35)]',
    ].join(' ')}>

      <BoutonFermer onFermer={onFermer} teinte="amber" />

      {/* Bandeau superieur */}
      <div className={[
        'flex items-center gap-2.5 px-4 py-2.5',
        'border-b border-amber-900/30',
        'bg-amber-950/30',
      ].join(' ')}>
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-950 border border-amber-800 shrink-0 transition-transform duration-200 hover:scale-105">
          <IconeBouclier taille={14} className="text-amber-500" />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-500">
            Police municipale notifiee
          </span>
          <span className="text-xs font-mono text-amber-700">
            ENVOI DU RAPPORT EN COURS
          </span>
        </div>
        <span className="ml-auto mr-6 h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
      </div>

      {/* Corps */}
      <div className="flex flex-col gap-2 px-4 pb-3">
        <div
          className="grid gap-x-4 gap-y-1.5 text-xs font-mono"
          style={{ gridTemplateColumns: '100px 1fr' }}
        >
          {[
            ['REF.',    anomalie?.id     ?? 'ALT-XXX'],
            ['ZONE',    anomalie?.zone   ?? 'N/A'],
            ['CAPTEUR', anomalie?.sensor ?? 'N/A'],
            ['HEURE',   anomalie?.time   ?? '--:--'],
          ].map(([cle, valeur]) => (
            <div key={cle} className="contents">
              <span className="text-slate-600 uppercase tracking-wider">{cle}</span>
              <span className="text-slate-300 truncate">{valeur}</span>
            </div>
          ))}
        </div>

        {anomalie?.description && (
          <p className={[
            'text-xs font-mono leading-relaxed',
            'px-3 py-2 rounded-lg',
            'border border-amber-900/25 bg-amber-950/20',
            'text-amber-200/70',
          ].join(' ')}>
            {anomalie.description}
          </p>
        )}

        <div className={[
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'border border-amber-900/30 bg-amber-950/20',
        ].join(' ')}>
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-xs font-mono text-amber-500/80">
            RAPPORT TRANSMIS — EN ATTENTE DE PRISE EN CHARGE
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export nommé principal
// ─────────────────────────────────────────────────────────────────────────────

export function ZoneIntervention({ anomalie, onFermer, onClose }) {
  // ✅ État de visibilité propre au panneau — permet de le masquer réellement
  const [visible, setVisible] = useState(true);

  // Réaffiche automatiquement le panneau dès qu'une nouvelle anomalie arrive
  useEffect(() => {
    if (anomalie) setVisible(true);
  }, [anomalie?.id]);

  function gererFermeture() {
    setVisible(false);
    const callbackParent = onFermer ?? onClose;
    if (typeof callbackParent === 'function') callbackParent();
  }

  if (!visible) return null;

  if (!anomalie) return <EtatVeille onFermer={gererFermeture} />;

  if (anomalie.priority === 'critical') {
    return <AlerteCritique anomalie={anomalie} onFermer={gererFermeture} />;
  }
  if (anomalie.priority === 'warning') {
    return <AlerteWarning anomalie={anomalie} onFermer={gererFermeture} />;
  }

  return <EtatVeille onFermer={gererFermeture} />;
}