/**
 * Sidebar.jsx  —  src/components/Sidebar.jsx
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 * Premium industrial anomaly feed with inline AI report drawer
 */

import { useState, useEffect, useRef } from 'react';
import {
  FileText, Clock, Cpu, AlertOctagon, AlertTriangle,
  Info, ChevronDown, ChevronUp, Loader, Copy, Check, Radio, MapPin,
} from 'lucide-react';
import { generateUrbanReport } from '../services/aiService';

// ── Static seed (shown before simulation produces data) ───────────────────────
const DEFAULT_ALERTS = [
  { id: 'ALT-FKT-001', priority: 'critical', time: '14:32', sensor: 'CAP-TRF-42', zone: 'Axe Gare — Anjoma',    description: 'Embouteillage : 3 vehicules immobiles depuis 4 min. Propagation vers le Marche Anjoma.', reported: false, timestamp: new Date().toISOString() },
  { id: 'ALT-FKT-002', priority: 'critical', time: '14:27', sensor: 'CAP-ENV-17', zone: 'RN7 — Axe Nord-Sud',   description: 'Pic CO2 : 76 ug/m3. Origine probable : trafic poids lourds sur la RN7. Seuil OMS depasse.', reported: false, timestamp: new Date().toISOString() },
  { id: 'ALT-FKT-003', priority: 'warning',  time: '14:19', sensor: 'CAP-ACO-08', zone: 'Ville Haute',          description: 'Niveau sonore anormal : 81 dB(A) sur 6 min. Zone historique et residentielle protegee.', reported: true, timestamp: new Date().toISOString() },
  { id: 'ALT-FKT-004', priority: 'warning',  time: '14:11', sensor: 'CAP-TRF-31', zone: 'Route Marche Anjoma', description: 'Vitesse moyenne chutee a 5 km/h. Incident de voirie ou rassemblement non declare probable.', reported: false, timestamp: new Date().toISOString() },
  { id: 'ALT-FKT-005', priority: 'info',     time: '13:58', sensor: 'CAP-ENV-03', zone: 'Ambozontany',         description: 'CO2 en legere hausse : 488 ppm. Surveillance maintenue. Aucune action immediate requise.', reported: true, timestamp: new Date().toISOString() },
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const PRIORITY = {
  critical: {
    label:   'Critique',
    badge:   'bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20',
    borderL: 'border-l-red-500',
    Icon:    AlertOctagon,
  },
  warning: {
    label:   'Avert.',
    badge:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    borderL: 'border-l-amber-500',
    Icon:    AlertTriangle,
  },
  info: {
    label:   'Info',
    badge:   'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    borderL: 'border-l-blue-500',
    Icon:    Info,
  },
};

// ── ReportDrawer — inline expandable AI report panel ─────────────────────────
function ReportDrawer({ anomaly, onClose }) {
  const [status, setStatus] = useState('loading');
  const [report, setReport] = useState('');
  const [source, setSource] = useState('simulation');
  const [error,  setError]  = useState('');
  const [copied, setCopied] = useState(false);
  const cancelled           = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setStatus('loading');
    setReport('');
    setError('');

    generateUrbanReport(anomaly)
      .then((result) => {
        if (cancelled.current) return;
        setSource(result.source ?? 'simulation');
        if (result.success && result.report) {
          setReport(result.report);
          setStatus('ok');
        } else {
          setError(result.error ?? 'Erreur inconnue');
          setStatus('error');
        }
      })
      .catch((err) => {
        if (!cancelled.current) {
          setError(String(err));
          setStatus('error');
        }
      });

    return () => { cancelled.current = true; };
  }, [anomaly?.id]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">

      {/* Drawer header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <FileText size={11} strokeWidth={2} className="text-blue-500 dark:text-blue-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">
            Rapport IA
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            {anomaly?.id}
          </span>
          {status === 'ok' && (
            <span className={[
              'text-xs px-1.5 py-0.5 rounded-full font-semibold leading-none',
              source === 'gemini'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
            ].join(' ')}>
              {source === 'gemini' ? 'Gemini' : 'Simulation'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {status === 'ok' && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150"
            >
              {copied
                ? <Check size={10} strokeWidth={2.5} className="text-emerald-500" />
                : <Copy size={10} strokeWidth={2} />}
              {copied ? 'Copie' : 'Copier'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-0.5 rounded text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Drawer body */}
      <div className="px-3 py-3 max-h-64 overflow-y-auto">
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader size={14} strokeWidth={2} className="text-blue-500 dark:text-blue-400 animate-spin" />
            <span className="text-xs text-slate-400 dark:text-slate-500">Generation du rapport en cours...</span>
          </div>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-500 dark:text-red-400 leading-relaxed p-1">{error}</p>
        )}
        {status === 'ok' && (
          <pre className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
            {report}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── AlertCard ─────────────────────────────────────────────────────────────────
function AlertCard({ alert, isReported, onGenerate }) {
  const [open, setOpen] = useState(false);
  if (!alert) return null;

  const cfg      = PRIORITY[alert.priority] ?? PRIORITY.info;
  const Icon     = cfg.Icon;
  const reported = isReported ?? alert.reported ?? false;

  function handleButton() {
    const opening = !open;
    setOpen(opening);
    if (opening && !reported && onGenerate) onGenerate(alert);
  }

  return (
    <article className={[
      'flex flex-col rounded-xl border border-l-2 overflow-hidden',
      'border-slate-200 dark:border-slate-800',
      cfg.borderL,
      'bg-white dark:bg-slate-900 shadow-sm',
      'hover:shadow-md transition-shadow duration-200',
    ].join(' ')}>
      <div className="flex flex-col gap-2 px-3.5 pt-3 pb-2.5">

        {/* Row 1 : badge + timestamp */}
        <div className="flex items-center justify-between gap-2">
          <span className={'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold leading-none ' + cfg.badge}>
            <Icon size={9} strokeWidth={2.5} />
            {cfg.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs tabular-nums text-slate-400 dark:text-slate-500">
              <Clock size={10} strokeWidth={2} />
              {alert.time ?? '--:--'}
            </span>
            {reported && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Traite
              </span>
            )}
          </div>
        </div>

        {/* Row 2 : sensor + zone */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 dark:text-slate-400">
            <Cpu size={10} strokeWidth={2} />
            {alert.sensor ?? 'N/A'}
          </span>
          <span className="text-slate-300 dark:text-slate-700 text-xs select-none">·</span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 truncate">
            <MapPin size={9} strokeWidth={2} className="shrink-0" />
            {alert.zone ?? 'Zone inconnue'}
          </span>
        </div>

        {/* Row 3 : description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
          {alert.description ?? 'Aucune description disponible.'}
        </p>

        {/* Row 4 : AI report button */}
        <button
          type="button"
          onClick={handleButton}
          className={[
            'group flex items-center justify-between w-full mt-0.5 px-3 py-2 rounded-lg',
            'text-xs font-bold uppercase tracking-wider border',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
            open
              ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
              : [
                  'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
                  'hover:bg-slate-900 dark:hover:bg-slate-100',
                  'hover:text-white dark:hover:text-slate-900',
                  'hover:border-slate-900 dark:hover:border-slate-100',
                ].join(' '),
          ].join(' ')}
        >
          <span className="flex items-center gap-1.5">
            <FileText size={11} strokeWidth={2} />
            {open ? 'Masquer le rapport' : reported ? 'Voir rapport IA' : 'Generer Rapport IA'}
          </span>
          {open ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Inline report drawer */}
      {open && (
        <div className="px-3.5 pb-3.5">
          <ReportDrawer anomaly={alert} onClose={() => setOpen(false)} />
        </div>
      )}
    </article>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function Sidebar({ alerts, onGenerateReport }) {
  const safeAlerts = (Array.isArray(alerts) && alerts.length > 0) ? alerts : DEFAULT_ALERTS;

  const [reportedIds, setReportedIds] = useState(
    () => new Set(safeAlerts.filter(a => a?.reported).map(a => a.id))
  );

  function handleGenerate(alert) {
    setReportedIds(prev => new Set([...prev, alert.id]));
    if (onGenerateReport) onGenerateReport(alert);
  }

  const criticalCount = safeAlerts.filter(a => a?.priority === 'critical').length;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* Sub-header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="block h-1 w-4 rounded-full bg-red-500" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Flux d&apos;anomalies
          </p>
        </div>
        {criticalCount > 0 && (
          <span className="flex items-center gap-1.5">
            <Radio size={10} className="text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 dark:text-red-400 tabular-nums">
              {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </span>
          </span>
        )}
      </div>

      {/* Scrollable alert feed */}
      <div className="flex flex-col gap-2.5 p-3 overflow-y-auto flex-1">
        {safeAlerts.map(alert =>
          alert ? (
            <AlertCard
              key={alert.id ?? String(Math.random())}
              alert={alert}
              isReported={reportedIds.has(alert.id)}
              onGenerate={handleGenerate}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
