/**
 * App.jsx  —  src/App.jsx
 * M'LAM Urban Monitoring System — Root orchestrator
 *
 * Responsibilities:
 *   - Mounts ThemeProvider as the outermost boundary
 *   - Runs useCitySimulation() as the single IoT data source
 *   - Distributes live slices to CityMap, Metrics, and Sidebar via props
 *   - Owns the AI report workflow (handleGenerateReport + ReportModal)
 *
 * Data flow:
 *   useCitySimulation()
 *     ├── metrics   → <Metrics />
 *     ├── vehicles  → <CityMap />
 *     └── anomalies → <CityMap /> + <Sidebar />
 *
 *   Sidebar "Générer Rapport IA" click
 *     └── onGenerateReport(anomaly) → generateUrbanReport() → <ReportModal />
 */

import { useState, useCallback } from 'react';
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

import { ThemeProvider }          from './context/ThemeContext';
import ThemeToggle                from './components/ThemeToggle';
import Metrics                    from './components/Metrics';
import Sidebar                    from './components/Sidebar';
import CityMap                    from './map/CityMap';
import useCitySimulation          from './hooks/useCitySimulation';
import { generateUrbanReport }    from './services/aiService';

// ─────────────────────────────────────────────────────────────────────────────
// ReportModal
// Full-screen overlay that displays the AI-generated administrative report.
// Intentionally self-contained so App.jsx stays readable.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   anomaly:  object | null,
 *   loading:  boolean,
 *   report:   string | null,
 *   error:    string | null,
 *   onClose:  () => void,
 * }} props
 */
function ReportModal({ anomaly, loading, report, error, onClose }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked in some environments
    }
  }

  // Close on backdrop click
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) onClose();
  }

  if (!anomaly) return null;

  const priorityLabel = {
    critical: 'CRITIQUE',
    warning:  'AVERTISSEMENT',
    info:     'INFORMATION',
  }[anomaly.priority] ?? anomaly.priority?.toUpperCase();

  const priorityBadge = {
    critical: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25',
    warning:  'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25',
    info:     'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/25',
  }[anomaly.priority] ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className={[
          'relative flex flex-col w-full max-w-2xl max-h-[88vh]',
          'rounded-lg border shadow-2xl',
          'bg-white dark:bg-slate-900',
          'border-slate-200 dark:border-slate-700',
          'transition-colors duration-200',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
      >
        {/* ── Modal header ── */}
        <div className={[
          'flex items-start justify-between gap-4 px-6 py-4 shrink-0',
          'border-b border-slate-200 dark:border-slate-800',
        ].join(' ')}>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Rapport IA — M&apos;LAM Centre de Supervision
              </p>
              <span className={[
                'px-1.5 py-0.5 rounded border text-2xs font-bold tracking-wide leading-none uppercase',
                priorityBadge,
              ].join(' ')}>
                {priorityLabel}
              </span>
            </div>
            <h2
              id="report-modal-title"
              className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              {anomaly.id} — {anomaly.zone}
            </h2>
            <p className="text-2xs text-slate-400 dark:text-slate-500 font-mono">
              {anomaly.sensor} &middot; {anomaly.time}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le rapport"
            className={[
              'shrink-0 flex items-center justify-center h-8 w-8 rounded',
              'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            ].join(' ')}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* ── Modal body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader
                size={24}
                strokeWidth={1.75}
                className="text-blue-500 dark:text-blue-400 animate-spin"
              />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Analyse de l&apos;anomalie en cours
                </p>
                <p className="text-2xs text-slate-400 dark:text-slate-600 tracking-wide">
                  Gemini 1.5 Flash — M&apos;LAM IA
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className={[
              'flex items-start gap-3 rounded border px-4 py-3.5',
              'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25',
            ].join(' ')}>
              <TriangleAlert
                size={15}
                strokeWidth={2}
                className="text-red-500 dark:text-red-400 shrink-0 mt-0.5"
              />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Erreur de génération
                </p>
                <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Report */}
          {!loading && report && (
            <div className="flex flex-col gap-3">
              {/* Source tag */}
              <div className="flex items-center gap-2">
                <FileText size={12} strokeWidth={2} className="text-slate-400 dark:text-slate-500" />
                <span className="text-2xs font-medium text-slate-400 dark:text-slate-500 tracking-wide uppercase">
                  Rapport généré automatiquement — ne remplace pas une expertise humaine
                </span>
              </div>

              {/* Report text block */}
              <div className={[
                'rounded border px-5 py-4',
                'bg-slate-50 dark:bg-slate-800/50',
                'border-slate-200 dark:border-slate-700',
              ].join(' ')}>
                <pre className={[
                  'text-xs text-slate-700 dark:text-slate-300',
                  'leading-relaxed whitespace-pre-wrap',
                  'font-mono',
                ].join(' ')}>
                  {report}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal footer ── */}
        {!loading && (
          <div className={[
            'flex items-center justify-between gap-3 px-6 py-3 shrink-0',
            'border-t border-slate-200 dark:border-slate-800',
          ].join(' ')}>
            <p className="text-2xs text-slate-400 dark:text-slate-600 italic truncate">
              {report ? 'Gemini 1.5 Flash · M\'LAM Urban Intelligence' : ''}
            </p>

            <div className="flex items-center gap-2 shrink-0">
              {report && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded',
                    'text-2xs font-semibold uppercase tracking-wide',
                    'border border-slate-300 dark:border-slate-700',
                    'text-slate-600 dark:text-slate-300',
                    'hover:bg-slate-100 dark:hover:bg-slate-800',
                    'transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  ].join(' ')}
                >
                  {copied
                    ? <Check size={11} strokeWidth={2.5} className="text-emerald-500" />
                    : <Copy size={11} strokeWidth={2} />
                  }
                  {copied ? 'Copié' : 'Copier'}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className={[
                  'px-3 py-1.5 rounded',
                  'text-2xs font-semibold uppercase tracking-wide',
                  'border border-slate-300 dark:border-slate-700',
                  'text-slate-600 dark:text-slate-300',
                  'hover:bg-slate-900 dark:hover:bg-slate-100',
                  'hover:text-white dark:hover:text-slate-900',
                  'hover:border-slate-900 dark:hover:border-slate-100',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                ].join(' ')}
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBar — ultra-thin bottom strip showing live simulation counters
// ─────────────────────────────────────────────────────────────────────────────

function StatusBar({ vehicleCount = 0, anomalies }) {
  const safeAnomalies  = Array.isArray(anomalies) ? anomalies : [];
  const criticalCount  = safeAnomalies.filter((a) => a?.priority === 'critical').length;
  const activeVehicles = vehicleCount;

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
          <span className="text-2xs text-slate-500 dark:text-slate-400 tabular-nums">
            {activeVehicles} véhicule{activeVehicles > 1 ? 's' : ''} actif{activeVehicles > 1 ? 's' : ''}
          </span>
        </span>

        {criticalCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-2xs text-red-600 dark:text-red-400 font-medium tabular-nums">
              {criticalCount} alerte{criticalCount > 1 ? 's' : ''} critique{criticalCount > 1 ? 's' : ''}
            </span>
          </span>
        )}
      </div>

      <span className="text-2xs text-slate-400 dark:text-slate-600 tracking-wide">
        M&apos;LAM v1.0 — Antananarivo
      </span>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header className={[
      'flex items-center justify-between h-12 px-5 shrink-0',
      'bg-white dark:bg-slate-900',
      'border-b border-slate-200 dark:border-slate-800',
      'transition-colors duration-200',
    ].join(' ')}>
      {/* Brand */}
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

        <span className="text-2xs font-medium tracking-wide text-slate-500 dark:text-slate-400 uppercase hidden sm:block">
          Urban Monitoring System
        </span>

        <span className="flex items-center gap-1.5 ml-1">
          <Radio size={11} className="text-emerald-500 dark:text-emerald-400" />
          <span className="text-2xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </span>
      </div>

      <ThemeToggle />
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppShell — layout skeleton + data orchestration
// ─────────────────────────────────────────────────────────────────────────────

function AppShell() {
  // ── IoT simulation — single source of truth for all panels ───────────────
  const { simulationRef, metrics, anomalies, kpis } = useCitySimulation();

  // ── AI report modal state ─────────────────────────────────────────────────
  const [reportModal, setReportModal] = useState({
    open:    false,
    anomaly: null,
    loading: false,
    report:  null,
    error:   null,
  });

  /**
   * handleGenerateReport
   * Called by <Sidebar /> when the user clicks "Générer Rapport IA".
   * Opens the modal immediately (loading state) then populates it
   * with the Gemini response.
   *
   * @param {object} anomaly — The anomaly object from useCitySimulation
   */
  const handleGenerateReport = useCallback(async (anomaly) => {
    // Open modal in loading state right away — never keep the user waiting
    setReportModal({
      open:    true,
      anomaly,
      loading: true,
      report:  null,
      error:   null,
    });

    const result = await generateUrbanReport(anomaly);

    setReportModal((previous) => ({
      ...previous,
      loading: false,
      report:  result.report,
      error:   result.error,
    }));
  }, []);

  function handleCloseModal() {
    setReportModal({
      open: false, anomaly: null, loading: false, report: null, error: null,
    });
  }

  return (
    <div className={[
      'flex flex-col h-screen w-screen overflow-hidden',
      'bg-slate-100 dark:bg-slate-950',
      'text-slate-900 dark:text-slate-100',
      'transition-colors duration-200',
    ].join(' ')}>

      {/* ── Top bar ── */}
      <TopBar />

      {/* ── Main workspace ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left column — Environmental metrics */}
        <aside className={[
          'flex flex-col w-[18%] shrink-0 overflow-y-auto',
          'bg-white dark:bg-slate-900',
          'border-r border-slate-200 dark:border-slate-800',
          'transition-colors duration-200',
        ].join(' ')}>
          {/* Panel header */}
          <div className={[
            'flex items-center gap-2 px-4 py-3 shrink-0',
            'border-b border-slate-200 dark:border-slate-800',
          ].join(' ')}>
            <span className="text-2xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Indicateurs
            </span>
          </div>

          {/* Metrics component — receives live data slice */}
          <Metrics metrics={metrics} />
        </aside>

        {/* Centre column — Map */}
        <main className={[
          'flex flex-1 flex-col overflow-hidden relative',
          'bg-slate-100 dark:bg-slate-950',
          'transition-colors duration-200',
        ].join(' ')}>
          {/* CityMap receives both vehicles (fleet markers) and anomalies (alert markers) */}
          <CityMap simulationRef={simulationRef} anomalies={anomalies} />
        </main>

        {/* Right column — Anomaly feed */}
        <aside className={[
          'flex flex-col w-[18%] shrink-0',
          'bg-white dark:bg-slate-900',
          'border-l border-slate-200 dark:border-slate-800',
          'transition-colors duration-200',
        ].join(' ')}>
          {/* Panel header */}
          <div className={[
            'flex items-center gap-2 px-4 py-3 shrink-0',
            'border-b border-slate-200 dark:border-slate-800',
          ].join(' ')}>
            <Radio
              size={13}
              strokeWidth={2}
              className="text-slate-400 dark:text-slate-500 shrink-0"
            />
            <span className="text-2xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
              Anomalies en temps réel
            </span>
          </div>

          {/* Sidebar receives the anomaly feed and the AI report handler */}
          <Sidebar
            alerts={anomalies}
            onGenerateReport={handleGenerateReport}
          />
        </aside>
      </div>

      {/* ── Status bar ── */}
      <StatusBar
       vehicleCount={simulationRef?.current?.vehicles?.length ?? 0}
        anomalies={anomalies}/>

      {/* ── AI Report modal — rendered at root level to escape stacking contexts ── */}
      {reportModal.open && (
        <ReportModal
          anomaly={reportModal.anomaly}
          loading={reportModal.loading}
          report={reportModal.report}
          error={reportModal.error}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App — public export
// ThemeProvider wraps everything so all descendants access the theme context.
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
