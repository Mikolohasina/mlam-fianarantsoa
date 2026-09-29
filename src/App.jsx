// src/App.jsx — M'LAM v1.0 — Responsive Mobile-First
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Radio, Map, ShieldAlert, Settings,
  Car, Zap, Wind, RotateCcw, AlertTriangle, X,
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

// ─── Hook détection mobile ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    function check() { setMobile(window.innerWidth < 768); }
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Vues de l'app ────────────────────────────────────────────────────────────
const VUES = [
  { id: 'dashboard',  label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'carte_pure', label: 'Carte',     Icon: Map             },
  { id: 'alertes',    label: 'Alertes',   Icon: ShieldAlert     },
  { id: 'parametres', label: 'Paramètres', Icon: Settings       },
];

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE — Barre de navigation inférieure
// ─────────────────────────────────────────────────────────────────────────────
function BottomNav({ vue, onChange }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      height: '60px',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'rgba(15,23,42,0.98)',
      borderTop: '1px solid rgba(51,65,85,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    }}>
      {VUES.map(({ id, label, Icon }) => {
        const actif = vue === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', flex: 1, height: '100%',
              background: 'none', border: 'none', cursor: 'pointer',
              color: actif ? '#818cf8' : '#475569',
              transition: 'color 0.15s',
            }}>
            <Icon size={20} strokeWidth={actif ? 2.2 : 1.75} />
            <span style={{
              fontSize: '10px', fontWeight: 600,
              letterSpacing: '0.05em', lineHeight: 1,
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE — Header compact
// ─────────────────────────────────────────────────────────────────────────────
function MobileHeader({ vue, nbCritiques }) {
  const label = VUES.find(v => v.id === vue)?.label ?? 'M\'LAM';
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9998,
      height: '48px',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      background: 'rgba(15,23,42,0.98)',
      borderBottom: '1px solid rgba(51,65,85,0.6)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '24px', height: '24px', borderRadius: '6px',
          background: 'rgba(99,102,241,0.2)',
          border: '1px solid rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LayoutDashboard size={13} color="#818cf8" />
        </div>
        <span style={{
          fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.08em', color: '#e2e8f0',
        }}>M'LAM</span>
        <span style={{ color: '#334155', fontSize: '12px' }}>·</span>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {nbCritiques > 0 && (
          <span style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '12px', padding: '2px 8px',
            fontSize: '11px', fontWeight: 700, color: '#f87171',
          }}>
            ⚠ {nbCritiques}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#10b981', display: 'inline-block',
          }} />
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>LIVE</span>
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP — NavLaterale (inchangée, masquée sur mobile via CSS)
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
    ].join(' ')}>

      <div className="flex items-center gap-3 h-12 px-4 shrink-0 border-b border-slate-800/80 overflow-hidden">
        <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 shrink-0">
          <LayoutDashboard size={14} strokeWidth={2} className="text-indigo-400" />
        </span>
        <span className="text-xs font-bold tracking-widest uppercase text-slate-200 whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100">
          M&apos;LAM
        </span>
      </div>

      <div className="flex flex-col gap-1 px-2 py-3 flex-1">
        {VUES.map(({ id, label, Icon }) => {
          const actif = vueApp === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeVue(id)}
              aria-current={actif ? 'page' : undefined}
              className={[
                'flex items-center gap-3 h-10 px-3 rounded-lg shrink-0 w-full',
                'font-mono text-xs font-semibold uppercase tracking-wider',
                'transition-all duration-200 ease-out',
                actif
                  ? 'bg-indigo-500/15 border border-indigo-400/40 text-indigo-300 shadow-[0_0_12px_-4px_rgba(99,102,241,0.5)]'
                  : 'border border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/60',
              ].join(' ')}
            >
              <Icon size={16} strokeWidth={2} className="shrink-0" />
              <span className="whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100">
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
        <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-200 delay-100">
          Live
        </span>
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModalRapport
// ─────────────────────────────────────────────────────────────────────────────
const ETAPES = [
  { label: 'Connexion capteurs IoT...',     duree: 900      },
  { label: 'Analyse des flux...',           duree: 1400     },
  { label: 'Traitement données trafic...',  duree: 1200     },
  { label: 'Corrélation anomalies...',      duree: 1100     },
  { label: 'Rédaction rapport...',          duree: Infinity },
];

function BarreProgressionIA() {
  const [etapeIdx, setEtapeIdx] = useState(0);
  const [pct, setPct] = useState(0);
  useState(() => {
    let idx = 0; const timers = [];
    function av() {
      const e = ETAPES[idx]; if (!e || e.duree === Infinity) return;
      timers.push(setTimeout(() => { idx++; setEtapeIdx(idx); av(); }, e.duree));
    }
    av();
    const debut = performance.now();
    const dur   = ETAPES.slice(0,-1).reduce((s,e)=>s+e.duree,0);
    let raf;
    function anim(now) {
      const v = Math.round(92*(1-Math.pow(1-Math.min((now-debut)/dur,1),2.5)));
      setPct(v); if(v<92) raf=requestAnimationFrame(anim);
    }
    raf = requestAnimationFrame(anim);
    return ()=>{timers.forEach(clearTimeout);cancelAnimationFrame(raf);};
  });
  return (
    <div style={{ padding: '24px 4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.4)', animation: 'ping 1s infinite' }} />
          <span style={{ position: 'relative', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(34,211,238,0.2)', border: '1px solid #22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22d3ee' }} />
          </span>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#67e8f9', letterSpacing: '0.1em' }}>ANALYSE EN COURS</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(to right, #06b6d4, #6366f1)', borderRadius: '3px', width: `${pct}%`, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
            {ETAPES[Math.min(etapeIdx,ETAPES.length-1)]?.label ?? ''}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#22d3ee' }}>{pct}%</span>
        </div>
      </div>
    </div>
  );
}

function ModalRapport({ ouvert, chargement, anomalie, rapport, source, erreur, onFermer }) {
  if (!ouvert) return null;
  const aRapport    = Boolean(rapport?.trim());
  const aErreurSeule = !aRapport && Boolean(erreur);
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onFermer();}} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width: '100%', maxHeight: '90dvh',
        background: '#020617', borderTop: '1px solid rgba(51,65,85,0.8)',
        borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {/* Poignée */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <span style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#334155', display: 'block' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 20px 12px', borderBottom: '1px solid #1e293b' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Rapport IA — M'LAM
              </span>
              {!chargement && (
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  fontFamily: 'monospace', fontWeight: 700,
                  background: source==='gemini' ? 'rgba(99,102,241,0.15)' : 'rgba(30,41,59,0.8)',
                  color: source==='gemini' ? '#a5b4fc' : '#64748b',
                  border: `1px solid ${source==='gemini' ? 'rgba(99,102,241,0.3)' : '#334155'}`,
                }}>
                  {source==='gemini' ? 'GEMINI 2.0' : 'Simulation'}
                </span>
              )}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>
              {anomalie?.id ?? '—'} — {anomalie?.zone ?? '—'}
            </div>
          </div>
          <button type="button" onClick={onFermer} style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: 'rgba(30,41,59,0.8)', border: '1px solid #334155',
            color: '#64748b', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Corps */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {chargement && <BarreProgressionIA />}
          {!chargement && aErreurSeule && (
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px' }}>
              <p style={{ fontSize: '12px', fontFamily: 'monospace', color: 'rgba(252,165,165,0.8)', margin: 0 }}>{erreur}</p>
            </div>
          )}
          {!chargement && aRapport && (
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
              <pre style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{rapport}</pre>
            </div>
          )}
        </div>

        {/* Pied */}
        {!chargement && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #1e293b' }}>
            <button type="button" onClick={onFermer} style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              background: 'rgba(30,41,59,0.8)', border: '1px solid #334155',
              color: '#94a3b8', fontSize: '13px', fontFamily: 'monospace',
              fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em',
            }}>
              FERMER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SliderParam
// ─────────────────────────────────────────────────────────────────────────────
function SliderParam({ label, valeur, min, max, pas=1, unite='', onChange, accentHex='#6366f1', description }) {
  const pct = Math.round(((valeur-min)/(max-min))*100);
  const dv  = typeof valeur==='number'&&valeur%1!==0?valeur.toFixed(1):valeur;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#cbd5e1' }}>{label}</div>
          {description && <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{description}</div>}
        </div>
        <span style={{
          minWidth: '60px', textAlign: 'center', padding: '4px 10px',
          borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700,
          background: 'rgba(15,23,42,0.8)', border: '1px solid #334155',
          color: accentHex, flexShrink: 0,
        }}>{dv}{unite}</span>
      </div>
      <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: '6px',
          borderRadius: '3px', background: '#1e293b', overflow: 'hidden', pointerEvents: 'none',
        }}>
          <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: accentHex, transition: 'width 0.1s' }} />
        </div>
        <input type="range" min={min} max={max} step={pas} value={valeur}
          onChange={e=>onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%' }} />
        {/* Thumb visible */}
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 10px)`,
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          pointerEvents: 'none', transition: 'left 0.1s',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', color: '#475569' }}>
        <span>{min}{unite}</span><span>{max}{unite}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VueParametres mobile
// ─────────────────────────────────────────────────────────────────────────────
function VueParametres({ simSettings, onSettingsChange, onReset, simulationRef, anomalies }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const timerRef = useRef(null);
  const nbV = simulationRef?.current?.vehicles?.length ?? 0;
  const nbA = Array.isArray(anomalies) ? anomalies.length : 0;
  const nbC = Array.isArray(anomalies) ? anomalies.filter(a=>a?.priority==='critical').length : 0;

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); timerRef.current=setTimeout(()=>setConfirmReset(false),3000); return; }
    clearTimeout(timerRef.current); onReset(); setConfirmReset(false);
  }
  useEffect(()=>()=>clearTimeout(timerRef.current),[]);

  const stats = [
    { label:'Véhicules', value:nbV, color:'#818cf8' },
    { label:'Anomalies', value:nbA, color:'#fbbf24' },
    { label:'Critiques',  value:nbC, color:'#f87171' },
  ];

  const cardStyle = {
    background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b',
    borderRadius: '12px', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '16px',
  };

  const sectionTitleStyle = {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: '#64748b',
    paddingBottom: '10px', borderBottom: '1px solid #1e293b',
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'rgba(15,23,42,0.6)', border: '1px solid #1e293b',
            borderRadius: '10px', padding: '12px 8px',
            display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center',
          }}>
            <span style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', color: s.color }}>{s.value}</span>
            <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#475569' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Trafic */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>🚗 Contrôle du trafic</div>
        <SliderParam label="Véhicules simulés" valeur={simSettings.nbVehicules} min={10} max={500} pas={5} unite=" veh."
          onChange={v=>onSettingsChange(p=>({...p,nbVehicules:v}))} accentHex="#6366f1"
          description="Nombre total de véhicules" />
        <SliderParam label="Vitesse rafraîchissement" valeur={simSettings.vitesseMulti} min={0.5} max={5.0} pas={0.5} unite="×"
          onChange={v=>onSettingsChange(p=>({...p,vitesseMulti:v}))} accentHex="#22d3ee"
          description="Multiplicateur tick" />
      </div>

      {/* Seuils */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>🍃 Seuils pollution</div>
        <SliderParam label="CO2 critique" valeur={simSettings.seuilCO2} min={450} max={1000} pas={10} unite=" ppm"
          onChange={v=>onSettingsChange(p=>({...p,seuilCO2:v}))} accentHex="#34d399"
          description="Réf. Fianarantsoa : 390–420 ppm" />
        <SliderParam label="PM2.5 critique" valeur={simSettings.seuilPM25} min={15} max={75} pas={1} unite=" µg/m³"
          onChange={v=>onSettingsChange(p=>({...p,seuilPM25:v}))} accentHex="#f59e0b"
          description="Seuil OMS : 15 µg/m³" />
      </div>

      {/* Reset */}
      <button type="button" onClick={handleReset} style={{
        padding: '14px', borderRadius: '10px', width: '100%',
        border: `1px solid ${confirmReset ? 'rgba(239,68,68,0.8)' : 'rgba(239,68,68,0.3)'}`,
        background: confirmReset ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.05)',
        color: confirmReset ? '#fca5a5' : '#ef4444',
        fontSize: '12px', fontFamily: 'monospace', fontWeight: 700,
        letterSpacing: '0.08em', cursor: 'pointer',
      }}>
        {confirmReset ? '⚠ CONFIRMER LA RÉINITIALISATION' : '↺ RÉINITIALISER'}
      </button>

      <div style={{ height: '8px' }} /> {/* espace pour la bottom nav */}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GrilleMetriques — export nommé (inchangé)
// ─────────────────────────────────────────────────────────────────────────────
const SEUILS_KPI = { trafic:{warn:65,crit:85}, infractions:{warn:3,crit:8}, secours:{warn:1,crit:3} };
function calcN(id,v){const s=SEUILS_KPI[id];if(!s)return'ok';if(v>=s.crit)return'crit';if(v>=s.warn)return'warn';return'ok';}
const NIV={ok:{ch:'text-slate-800 dark:text-slate-100',p:'bg-emerald-500',l:'Normal'},warn:{ch:'text-amber-700 dark:text-amber-400',p:'bg-amber-500',l:'Élevé'},crit:{ch:'text-red-600 dark:text-red-400',p:'bg-red-600',l:'Critique'}};
const MK=[
  {id:'trafic',label:'Trafic global',valeur:72,unite:'%',detail:'Densité RN7'},
  {id:'infractions',label:'Infractions',valeur:11,unite:'',detail:'Véhicules sanctionnés'},
  {id:'secours',label:'Secours actifs',valeur:2,unite:'',detail:'Interventions'},
];
export function GrilleMetriques(){
  return(
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {MK.map(({id,label,valeur,unite,detail})=>{
        const n=calcN(id,valeur);const s=NIV[n];
        return(
          <div key={id} className="flex flex-col gap-3 rounded-xl px-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between"><span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span><span className={`h-2 w-2 rounded-full ${s.p} ${n==='crit'?'animate-pulse':''}`}/></div>
            <span className={`text-3xl font-bold font-mono tabular-nums ${s.ch}`}>{valeur}{unite&&<span className="text-sm ml-1 text-slate-400">{unite}</span>}</span>
            <p className="text-xs text-slate-400">{detail}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoquilleDashboard — orchestrateur principal
// ─────────────────────────────────────────────────────────────────────────────
function CoquilleDashboard() {
  const isMobile  = useIsMobile();
  const [vue,      setVue]      = useState('dashboard');
  const [vueMap,   setVueMap]   = useState('trafic');
  const [anomAct,  setAnomAct]  = useState(null);
  const [filtre,   setFiltre]   = useState('tous');
  const [toast,    setToast]    = useState(null);
  const [sim, setSim] = useState({ nbVehicules:150, vitesseMulti:1.0, seuilCO2:600, seuilPM25:35 });
  const [modal, setModal] = useState({ ouvert:false, anomalie:null, chargement:false, rapport:null, source:'simulation', erreur:null });

  const { simulationRef, metrics, anomalies, kpis, loading, loadError } = useCitySimulation();

  useEffect(()=>{ if(simulationRef?.current) simulationRef.current._params={...sim}; },[sim,simulationRef]);

  const nbCritiques = (Array.isArray(anomalies)?anomalies:[]).filter(a=>a?.priority==='critical').length;

  const genRapport = useCallback(async (anomalie)=>{
    setAnomAct(anomalie);
    setModal({ ouvert:true, anomalie, chargement:true, rapport:null, source:'simulation', erreur:null });
    const r = await generateUrbanReport(anomalie);
    setModal(p=>({...p, chargement:false, rapport:r.report??null, source:r.source??'simulation', erreur:r.error??null }));
    if(r.report){ setToast('✓ Rapport transmis au Ministère'); setTimeout(()=>setToast(null),4000); }
  },[]);

  const fermerModal = ()=>setModal({ ouvert:false, anomalie:null, chargement:false, rapport:null, source:'simulation', erreur:null });
  const handleReset = useCallback(()=>{ setSim({ nbVehicules:150, vitesseMulti:1.0, seuilCO2:600, seuilPM25:35 }); setAnomAct(null); fermerModal(); },[]);

  const carte = (
    <CityMap
      simulationRef={simulationRef} anomalies={anomalies}
      filtreActif={filtre} vueActive={vueMap}
      onRapportIA={genRapport} loading={loading} loadError={loadError}
    />
  );

  // ── Sélecteur vue trafic/pollution ────────────────────────────────────────
  const selecteurVue = (
    <div style={{
      position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, display: 'flex', gap: '4px',
      background: 'rgba(15,23,42,0.9)', borderRadius: '20px',
      border: '1px solid #334155', padding: '4px',
    }}>
      {[{id:'trafic',l:'📡 Trafic'},{id:'pollution',l:'🍃 Air'}].map(o=>(
        <button key={o.id} type="button" onClick={()=>setVueMap(o.id)} style={{
          padding: '5px 14px', borderRadius: '16px',
          fontSize: '11px', fontFamily: 'monospace', fontWeight: 700,
          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
          background: vueMap===o.id ? '#4f46e5' : 'transparent',
          color: vueMap===o.id ? 'white' : '#64748b',
        }}>{o.l}</button>
      ))}
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT MOBILE
  // ══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{
        width: '100%', height: '100dvh',
        background: '#020617', color: '#e2e8f0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', position: 'relative',
      }}>
        <MobileHeader vue={vue} nbCritiques={nbCritiques} />

        {/* Zone de contenu — entre header (48px) et bottom nav (60px) */}
        <main style={{
          flex: 1, overflow: 'hidden',
          marginTop: '48px', marginBottom: '60px',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* DASHBOARD — carte plein écran + KPIs flottants */}
          {vue === 'dashboard' && (
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {carte}
              {selecteurVue}
              {/* KPIs flottants en bas */}
              <div style={{
                position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                zIndex: 1000, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
              }}>
                {[
                  { l:'Véhicules', v:kpis?.vehicles??0,   c:'#818cf8' },
                  { l:'Accidents', v:kpis?.accidents??0,  c: kpis?.accidents>0?'#f87171':'#94a3b8' },
                  { l:'Congestion',v:kpis?.congestion??0, c: kpis?.congestion>0?'#fbbf24':'#94a3b8' },
                ].map(k=>(
                  <div key={k.l} style={{
                    background: 'rgba(2,6,23,0.88)',
                    border: '1px solid rgba(51,65,85,0.7)',
                    borderRadius: '10px', padding: '8px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    backdropFilter: 'blur(8px)',
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: k.c }}>{k.v}</span>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>{k.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CARTE PURE */}
          {vue === 'carte_pure' && (
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {carte}
              {selecteurVue}
            </div>
          )}

          {/* ALERTES */}
          {vue === 'alertes' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Sidebar alerts={anomalies} onGenerateReport={genRapport} onSelectAnomalie={a=>setAnomAct(a)} />
              </div>
              {anomAct && (
                <div style={{ flexShrink: 0, borderTop: '1px solid #1e293b', padding: '8px' }}>
                  <ZoneIntervention anomalie={anomAct} onFermer={()=>setAnomAct(null)} />
                </div>
              )}
            </div>
          )}

          {/* PARAMÈTRES */}
          {vue === 'parametres' && (
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <VueParametres simSettings={sim} onSettingsChange={setSim}
                onReset={handleReset} simulationRef={simulationRef} anomalies={anomalies} />
            </div>
          )}
        </main>

        <BottomNav vue={vue} onChange={setVue} />

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '72px', left: '16px', right: '16px', zIndex: 99998,
            background: 'rgba(6,78,59,0.95)', border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '10px',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#10b981',flexShrink:0 }} />
            <span style={{ fontSize:'12px',fontFamily:'monospace',fontWeight:700,color:'#6ee7b7' }}>{toast}</span>
          </div>
        )}

        {modal.ouvert && (
          <ModalRapport ouvert={modal.ouvert} anomalie={modal.anomalie}
            chargement={modal.chargement} rapport={modal.rapport}
            source={modal.source} erreur={modal.erreur} onFermer={fermerModal} />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LAYOUT DESKTOP — inchangé visuellement
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={[
      'relative flex h-screen w-full overflow-hidden',
      'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100',
    ].join(' ')}>

      <NavLaterale vueApp={vue} onChangeVue={setVue} />

      <div className="relative z-10 flex flex-col flex-1 h-full w-full min-w-0 overflow-hidden" style={{ paddingLeft: '64px' }}>
        {/* Header desktop */}
        <header className="hidden md:flex items-center justify-between h-12 px-5 shrink-0 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase">
              Urban Monitoring — Fianarantsoa
            </span>
            <span className="flex items-center gap-1.5">
              <Radio size={11} className="text-emerald-500" />
              <span className="text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">Live</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {(vue==='dashboard'||vue==='carte_pure') && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                {[{id:'trafic',l:'📡 TRAFIC'},{id:'pollution',l:'🍃 AIR'}].map(o=>(
                  <button key={o.id} type="button" onClick={()=>setVueMap(o.id)}
                    className={['flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest border transition-all',
                      vueMap===o.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                    ].join(' ')}>{o.l}</button>
                ))}
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Contenu desktop */}
        <div className="flex flex-1 overflow-hidden min-w-0">
          {vue==='dashboard' && (<>
            <aside className="flex flex-col w-[18%] min-w-[220px] shrink-0 overflow-hidden bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border-r border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
                <span className="block h-1 w-4 rounded-full bg-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Indicateurs</span>
              </div>
              <Metrics metrics={metrics} kpis={kpis} filtreActif={filtre} onFiltreChange={t=>setFiltre(prev=>prev===t?'tous':t)} />
            </aside>
            <main className="flex flex-1 min-w-0 flex-col overflow-hidden relative">{carte}</main>
            <aside className="flex flex-col w-[18%] min-w-[220px] shrink-0 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border-l border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 px-4 py-3 shrink-0 border-b border-slate-200 dark:border-slate-800">
                <Radio size={13} className="text-slate-400 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Anomalies</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <Sidebar alerts={anomalies} onGenerateReport={genRapport} onSelectAnomalie={a=>setAnomAct(a)} />
              </div>
              <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-2">
                <ZoneIntervention anomalie={anomAct} onFermer={()=>setAnomAct(null)} />
              </div>
            </aside>
          </>)}
          {vue==='carte_pure' && <main className="flex flex-1 flex-col overflow-hidden relative">{carte}</main>}
          {vue==='alertes' && (
            <div className="flex flex-1 overflow-hidden">
              <aside className="flex flex-col flex-1 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md">
                <div className="flex-1 overflow-hidden"><Sidebar alerts={anomalies} onGenerateReport={genRapport} onSelectAnomalie={a=>setAnomAct(a)} /></div>
                <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-2">
                  <ZoneIntervention anomalie={anomAct} onFermer={()=>setAnomAct(null)} />
                </div>
              </aside>
            </div>
          )}
          {vue==='parametres' && (
            <main className="flex flex-1 flex-col overflow-hidden bg-white/40 dark:bg-slate-900/20">
              <VueParametres simSettings={sim} onSettingsChange={setSim}
                onReset={handleReset} simulationRef={simulationRef} anomalies={anomalies} />
            </main>
          )}
        </div>

        <footer className="hidden md:flex items-center justify-between px-5 h-6 shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40">
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-500 tabular-nums">{simulationRef?.current?.vehicles?.length??0} véhicules</span>
          </span>
          <span className="text-xs text-slate-400">M'LAM v1.0 — Fianarantsoa</span>
        </footer>
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

export default function App() {
  return <ThemeProvider><CoquilleDashboard /></ThemeProvider>;
}
