// src/map/CityMap.jsx
// M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
// Responsive mobile : canvas auto-redimensionné, overlays safe-area-aware

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CITY_CENTER } from '../hooks/useCitySimulation';

import iconUrl       from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl     from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const ZOOM_INITIAL  = 14;
const ZOOM_MOBILE   = 13;   // zoom légèrement plus large sur petit écran
const URL_TUILES    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAX_MARQUEURS = 25;
const FILTRE_SOMBRE = [
  'brightness(0.80)', 'invert(1)', 'hue-rotate(180deg)',
  'saturate(1.15)', 'contrast(0.95)',
].join(' ');

const PALETTE_AXES = [
  '#60A5FA','#FBBF24','#34D399','#A78BFA',
  '#F87171','#22D3EE','#FB923C',
];
function couleurPourAxe(nom, idx) {
  if (nom === 'RN7') return '#60A5FA';
  if (nom === 'N42') return '#FBBF24';
  return PALETTE_AXES[idx % PALETTE_AXES.length];
}

const PALETTE_ANOMALIE = {
  critical: { couleur:'#EF4444', fondBadge:'#FEE2E2', texteBadge:'#991B1B', label:'Critique'      },
  warning:  { couleur:'#F59E0B', fondBadge:'#FEF3C7', texteBadge:'#92400E', label:'Avertissement' },
  info:     { couleur:'#3B82F6', fondBadge:'#DBEAFE', texteBadge:'#1E40AF', label:'Information'   },
};

const PALETTE_POLLUTION = {
  ok:       { centre:'rgba(52,211,153,0.55)',  bord:'rgba(52,211,153,0.85)',  externe:'rgba(52,211,153,0)'  },
  elevated: { centre:'rgba(251,191,36,0.55)',  bord:'rgba(251,191,36,0.85)',  externe:'rgba(251,191,36,0)'  },
  critical: { centre:'rgba(248,113,113,0.60)', bord:'rgba(248,113,113,0.9)',  externe:'rgba(248,113,113,0)' },
};

const ECHANTILLONS_PAR_AXE = 4;

// ─────────────────────────────────────────────────────────────────────────────
// Hook — détection mobile
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
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────

function positionValide(position) {
  try {
    let lat, lng;
    if (Array.isArray(position))                       { [lat, lng] = position; }
    else if (position && typeof position === 'object') { ({ lat, lng } = position); }
    lat = Number(lat); lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
  } catch { return null; }
}

function construireIconeAnomalie(priorite, estSombre) {
  const palette = PALETTE_ANOMALIE[priorite] ?? PALETTE_ANOMALIE.info;
  const couleur = palette.couleur;
  const fond    = estSombre ? '#1E293B' : '#FFFFFF';
  return L.divIcon({
    className: '', iconSize:[30,30], iconAnchor:[15,15], popupAnchor:[0,-20],
    html: `<div style="position:relative;width:30px;height:30px;">
      <span style="position:absolute;inset:-5px;border-radius:50%;border:2px solid ${couleur};
        opacity:.65;animation:pulseMlam 2.2s ease-in-out infinite;pointer-events:none;"></span>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        border-radius:50%;background:${fond};border:1.5px solid ${couleur};box-shadow:0 2px 8px rgba(0,0,0,.28);">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
          fill="none" stroke="${couleur}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
    </div>`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FiltreSombre
// ─────────────────────────────────────────────────────────────────────────────

function FiltreSombre({ estSombre }) {
  const carte = useMap();
  useEffect(() => {
    const pane = carte?.getPanes?.()?.tilePane;
    if (!pane) return;
    pane.style.transition = 'filter 0.45s ease';
    pane.style.filter     = estSombre ? FILTRE_SOMBRE : 'none';
  }, [carte, estSombre]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RedimensionneurCarte — invalide la taille Leaflet après layout change
// Critique pour mobile : carte ne se recalcule pas seule après transition CSS
// ─────────────────────────────────────────────────────────────────────────────

function RedimensionneurCarte({ isFullscreen, isMobile }) {
  const carte = useMap();

  useEffect(() => {
    // Délai pour laisser la transition CSS se terminer
    const id = setTimeout(() => carte?.invalidateSize?.({ animate: false }), 300);
    return () => clearTimeout(id);
  }, [carte, isFullscreen, isMobile]);

  // Observer les changements de taille du conteneur Leaflet lui-même
  useEffect(() => {
    if (!carte) return;
    const conteneur = carte.getContainer();
    if (!conteneur) return;
    const obs = new ResizeObserver(() => {
      carte.invalidateSize?.({ animate: false });
    });
    obs.observe(conteneur);
    return () => obs.disconnect();
  }, [carte]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PolylignesRoutes
// ─────────────────────────────────────────────────────────────────────────────

function PolylignesRoutes({ simulationRef, loading, estSombre, isMobile }) {
  const routesDict = simulationRef?.current?.routes ?? {};
  const cles       = Object.keys(routesDict);
  if (loading || cles.length === 0) return null;

  return (
    <>
      {cles.map((cle, index) => {
        const coords = routesDict[cle];
        if (!Array.isArray(coords) || coords.length < 2) return null;
        return (
          <Polyline
            key={cle}
            positions={coords}
            pathOptions={{
              color:     couleurPourAxe(cle, index),
              // Lignes légèrement plus épaisses sur mobile pour la lisibilité
              weight:    isMobile ? 3 : 2.5,
              opacity:   estSombre ? 0.72 : 0.58,
              dashArray: '8 5',
              lineCap:   'round',
              lineJoin:  'round',
            }}
          />
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoucheCanvasVehicules — 60 FPS, auto-redimensionnement robuste
// ─────────────────────────────────────────────────────────────────────────────

function CoucheCanvasVehicules({ simulationRef, estSombre, isMobile }) {
  const carte = useMap();

  useEffect(() => {
    if (!carte) return;

    // Création du pane dédié véhicules
    if (!carte.getPane('vehicules')) {
      const p = carte.createPane('vehicules');
      p.style.zIndex        = '450';
      p.style.pointerEvents = 'none';
    }

    const conteneur = carte.getContainer();
    const canvas    = document.createElement('canvas');

    function syncTaille() {
      canvas.width  = conteneur.offsetWidth;
      canvas.height = conteneur.offsetHeight;
    }
    syncTaille();

    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    carte.getPane('vehicules').appendChild(canvas);

    // Tooltip — masqué sur mobile (tap, pas hover)
    const tooltip = document.createElement('div');
    tooltip.style.cssText = [
      'position:absolute',
      'background:rgba(15,23,42,0.95)',
      'color:#e2e8f0',
      'font-size:11px',
      'font-family:Inter,system-ui,sans-serif',
      'padding:8px 12px',
      'border-radius:8px',
      'border:1px solid rgba(148,163,184,0.2)',
      'box-shadow:0 4px 20px rgba(0,0,0,0.45)',
      'pointer-events:none',
      'display:none',
      'z-index:600',
      'max-width:260px',
      'line-height:1.5',
    ].join(';');
    if (!isMobile) conteneur.appendChild(tooltip);

    // Redimensionnement du canvas quand la carte change de taille
    function surRedim() { syncTaille(); }
    carte.on('resize', surRedim);

    // Repositionnement du canvas quand la carte bouge
    function surMouv() {
      const coin = carte.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, coin);
    }
    carte.on('move zoom moveend zoomend', surMouv);

    // Observer natif pour les changements de taille du conteneur
    const obs = new ResizeObserver(() => syncTaille());
    obs.observe(conteneur);

    // ── Boucle de dessin 60 FPS ───────────────────────────────────────────
    let rafId = null;

    function dessiner(timestamp) {
      const vehicules = simulationRef?.current?.vehicles;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (Array.isArray(vehicules) && vehicules.length > 0) {
        for (let i = 0; i < vehicules.length; i++) {
          const v = vehicules[i];
          if (!v || !isFinite(v?.lat) || !isFinite(v?.lng)) continue;

          let point;
          try { point = carte.latLngToContainerPoint([v.lat, v.lng]); }
          catch { continue; }

          if (
            point.x < -12 || point.x > canvas.width  + 12 ||
            point.y < -12 || point.y > canvas.height + 12
          ) continue;

          // Rayon légèrement plus grand sur mobile pour la visibilité
          const rayon  = isMobile ? (v.taille ?? 4) + 1 : (v.taille ?? 4);
          const statut = v.legalStatus ?? 'CLEAN';

          if (statut === 'CRITICAL_ACCIDENT') {
            const pulse = (Math.sin((timestamp / 667) * Math.PI * 2) + 1) / 2;
            const gyro  = Math.floor(timestamp / 333) % 2 === 0 ? '#EF4444' : '#3B82F6';

            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon + 8 + pulse * 6, 0, Math.PI * 2);
            ctx.strokeStyle = gyro; ctx.lineWidth = 2;
            ctx.globalAlpha = 0.35 + pulse * 0.45; ctx.stroke(); ctx.globalAlpha = 1;

            ctx.beginPath(); ctx.arc(point.x, point.y, rayon + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239,68,68,0.18)'; ctx.fill();

            ctx.beginPath(); ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
            ctx.fillStyle = '#EF4444'; ctx.fill();
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.stroke();

          } else if (statut === 'SANCTIONNED') {
            const po = (Math.sin((timestamp / 900) * Math.PI * 2) + 1) / 2;
            ctx.beginPath(); ctx.arc(point.x, point.y, rayon + 4 + po * 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#F97316'; ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.25 + po * 0.35; ctx.stroke(); ctx.globalAlpha = 1;

            ctx.beginPath(); ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
            ctx.fillStyle = v.couleur ?? '#F97316'; ctx.fill();
            ctx.strokeStyle = '#F97316'; ctx.lineWidth = 1.5; ctx.stroke();

          } else {
            const couleur = v.arrete
              ? '#94A3B8'
              : (v.chocDetecte ? '#EF4444' : (v.couleur ?? '#60A5FA'));

            if (v.typeKey === 'SECOURS' && !v.arrete) {
              ctx.beginPath(); ctx.arc(point.x, point.y, rayon + 4, 0, Math.PI * 2);
              ctx.fillStyle = estSombre
                ? 'rgba(248,113,113,0.22)'
                : 'rgba(239,68,68,0.16)';
              ctx.fill();
            }

            ctx.beginPath(); ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
            ctx.fillStyle = couleur; ctx.fill();

            ctx.strokeStyle = estSombre
              ? 'rgba(15,23,42,0.88)'
              : 'rgba(255,255,255,0.92)';
            ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(dessiner);
    }

    rafId = requestAnimationFrame(dessiner);

    // ── Tooltip au survol — desktop uniquement ─────────────────────────────
    function surSouris(ev) {
      if (isMobile) return;
      const rect  = conteneur.getBoundingClientRect();
      const mx    = ev.clientX - rect.left;
      const my    = ev.clientY - rect.top;
      const vhcls = simulationRef?.current?.vehicles ?? [];
      let proche = null, distMin = 16;

      for (let i = 0; i < vhcls.length; i++) {
        const v = vhcls[i];
        if (!v || !isFinite(v?.lat) || !isFinite(v?.lng)) continue;
        try {
          const p    = carte.latLngToContainerPoint([v.lat, v.lng]);
          const dist = Math.hypot(p.x - mx, p.y - my);
          if (dist < distMin) { distMin = dist; proche = v; }
        } catch { /* ignore */ }
      }

      if (proche) {
        const vitesse = Math.round(proche.vitesseKmh ?? 0);
        const statutM = proche.status === 'PARKED'
          ? `<span style="color:#FBBF24;font-weight:700">Garé — ${Math.round(proche.currentMission?.parkingTimer ?? 0)}s</span>`
          : proche.arrete
            ? '<span style="color:#F87171;font-weight:700">Arrêté</span>'
            : `<span style="color:#34D399;font-weight:700">${vitesse} km/h</span>`;

        tooltip.style.display = 'block';
        tooltip.style.left    = `${mx + 16}px`;
        tooltip.style.top     = `${Math.max(8, my - 8)}px`;
        tooltip.innerHTML = `
          <div style="font-weight:700;font-size:12px;color:#f1f5f9;margin-bottom:6px">
            ${proche.typeLabel ?? 'Véhicule'}
            <span style="font-weight:400;color:#64748b;font-size:10px;margin-left:4px">
              VEH-${String(proche.id ?? 0).padStart(3,'0')}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:90px 1fr;gap:3px 8px;font-size:10px;color:#94a3b8">
            <span>Statut</span>      <span>${statutM}</span>
            <span>Mission</span>     <span style="color:#cbd5e1">${proche.mission ?? 'N/A'}</span>
            <span>Destination</span> <span style="color:#e2e8f0">${proche.destination ?? 'N/A'}</span>
            <span>Axe</span>         <span style="color:#e2e8f0">${proche.labelRoute ?? 'N/A'}</span>
          </div>`;
      } else {
        tooltip.style.display = 'none';
      }
    }

    function surSortie() { tooltip.style.display = 'none'; }

    if (!isMobile) {
      conteneur.addEventListener('mousemove',  surSouris);
      conteneur.addEventListener('mouseleave', surSortie);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      obs.disconnect();
      carte.off('resize', surRedim);
      carte.off('move zoom moveend zoomend', surMouv);
      if (!isMobile) {
        conteneur.removeEventListener('mousemove',  surSouris);
        conteneur.removeEventListener('mouseleave', surSortie);
      }
      if (canvas.parentNode)  canvas.parentNode.removeChild(canvas);
      if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
    };
  }, [carte, simulationRef, estSombre, isMobile]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CouchePollutionCanvas — heatmap 60 FPS, auto-redimensionnée
// ─────────────────────────────────────────────────────────────────────────────

function CouchePollutionCanvas({ simulationRef, estSombre }) {
  const carte = useMap();

  useEffect(() => {
    if (!carte) return;

    if (!carte.getPane('pollution')) {
      const p = carte.createPane('pollution');
      p.style.zIndex        = '420';
      p.style.pointerEvents = 'none';
    }

    const pane      = carte.getPane('pollution');
    const conteneur = carte.getContainer();
    const canvas    = document.createElement('canvas');

    function syncTaille() {
      const t      = carte.getSize();
      canvas.width  = t.x;
      canvas.height = t.y;
    }
    syncTaille();

    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    pane.appendChild(canvas);

    function surRedim() { syncTaille(); }
    carte.on('resize', surRedim);

    function surMouv() {
      const c = carte.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, c);
    }
    carte.on('move zoom moveend zoomend', surMouv);
    surMouv();

    // Observer natif pour mobile
    const obs = new ResizeObserver(() => syncTaille());
    obs.observe(conteneur);

    let rafId = null;

    function construireZones() {
      const routesDict = simulationRef?.current?.routes ?? {};
      const zones = [];
      Object.entries(routesDict).forEach(([, coords]) => {
        if (!Array.isArray(coords) || coords.length < 2) return;
        const pas = Math.max(1, Math.floor(coords.length / ECHANTILLONS_PAR_AXE));
        for (let i = 0; i < coords.length; i += pas) {
          const pt = coords[i];
          if (Array.isArray(pt)) zones.push({ lat: pt[0], lng: pt[1], seed: zones.length });
        }
      });
      return zones;
    }

    let zonesCache   = construireZones();
    let dernierNbAxes = Object.keys(simulationRef?.current?.routes ?? {}).length;

    function dessiner(ts) {
      const nbAxes = Object.keys(simulationRef?.current?.routes ?? {}).length;
      if (nbAxes !== dernierNbAxes) {
        zonesCache    = construireZones();
        dernierNbAxes = nbAxes;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const m    = simulationRef?.current?.metriques;
      const sCO2  = m?.co2?.status  ?? 'ok';
      const sPM25 = m?.pm25?.status ?? 'ok';
      const ordre = { ok:0, elevated:1, critical:2 };
      const sMax  = ordre[sPM25] > ordre[sCO2] ? sPM25 : sCO2;
      const pal   = PALETTE_POLLUTION[sMax] ?? PALETTE_POLLUTION.ok;

      for (let i = 0; i < zonesCache.length; i++) {
        const zone = zonesCache[i];
        let point;
        try { point = carte.latLngToContainerPoint([zone.lat, zone.lng]); }
        catch { continue; }

        if (
          point.x < -60 || point.x > canvas.width  + 60 ||
          point.y < -60 || point.y > canvas.height + 60
        ) continue;

        const pulse = (Math.sin(ts / 2600 + zone.seed * 1.3) + 1) / 2;
        const rayon  = 46 + pulse * 14;

        const deg = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, rayon,
        );
        deg.addColorStop(0,   pal.centre);
        deg.addColorStop(0.6, pal.bord);
        deg.addColorStop(1,   pal.externe);

        ctx.beginPath();
        ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
        ctx.fillStyle = deg;
        ctx.fill();
      }

      rafId = requestAnimationFrame(dessiner);
    }

    rafId = requestAnimationFrame(dessiner);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      obs.disconnect();
      carte.off('resize', surRedim);
      carte.off('move zoom moveend zoomend', surMouv);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [carte, simulationRef, estSombre]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MarqueurAnomalie
// ─────────────────────────────────────────────────────────────────────────────

function MarqueurAnomalie({ anomalie, estSombre, onRapportIA }) {
  const latLng = useMemo(() => positionValide(anomalie?.position), [anomalie?.position]);
  const icone  = useMemo(
    () => construireIconeAnomalie(anomalie?.priority ?? 'info', estSombre),
    [anomalie?.priority, estSombre],
  );

  if (!latLng || !anomalie) return null;

  const palette = PALETTE_ANOMALIE[anomalie.priority] ?? PALETTE_ANOMALIE.info;
  const heure   = (() => {
    try {
      return new Date(anomalie.timestamp).toLocaleTimeString('fr-MG', {
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return anomalie.time ?? '--:--'; }
  })();

  return (
    <Marker position={latLng} icon={icone}>
      <Popup minWidth={220} maxWidth={280} className="popup-mlam">
        <div style={{ fontFamily:'Inter,system-ui,sans-serif' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#64748B' }}>
              Anomalie — Fianarantsoa
            </span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background:palette.fondBadge, color:palette.texteBadge }}>
              {palette.label}
            </span>
          </div>

          <p style={{ fontSize:12, fontWeight:600, color:'#0F172A', margin:'0 0 10px', lineHeight:1.45 }}>
            {anomalie.description?.slice(0, 100) ?? 'Incident détecté'}
            {(anomalie.description?.length ?? 0) > 100 ? '…' : ''}
          </p>

          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <tbody>
              {[
                ['Capteur', anomalie.sensor],
                ['Zone',    anomalie.zone],
                ['ID',      anomalie.id],
                ['Heure',   heure],
              ].map(([cle, val]) => (
                <tr key={cle}>
                  <td style={{ color:'#94A3B8', padding:'2px 0', width:'36%' }}>{cle}</td>
                  <td style={{ fontWeight:600, color:'#334155' }}>{val ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {typeof onRapportIA === 'function' && (
            <button
              type="button"
              onClick={() => onRapportIA(anomalie)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                width:'100%', marginTop:10, padding:'8px 12px',
                borderRadius:7, border:'1px solid #E2E8F0',
                background:'#F8FAFC', color:'#334155',
                fontSize:11, fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.06em',
                cursor:'pointer', transition:'background 0.15s ease',
                // Zone de tap plus grande sur mobile
                minHeight:'36px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#0F172A';
                e.currentTarget.style.color      = '#FFFFFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.color      = '#334155';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Rapport IA
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlays chargement / erreur
// ─────────────────────────────────────────────────────────────────────────────

function OverlayChargement() {
  return (
    <div style={{
      position:'absolute', inset:0, zIndex:1000,
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      gap:12, background:'rgba(15,23,42,0.55)',
      pointerEvents:'none',
    }}>
      <div style={{
        width:28, height:28, borderRadius:'50%',
        border:'3px solid rgba(255,255,255,0.25)',
        borderTopColor:'#60A5FA',
        animation:'spinMlam 0.8s linear infinite',
      }} />
      <span style={{
        fontSize:12, fontWeight:600, color:'#E2E8F0',
        fontFamily:'Inter,system-ui,sans-serif',
        letterSpacing:'0.02em',
        textAlign:'center', padding:'0 20px',
      }}>
        Chargement du réseau routier…
      </span>
    </div>
  );
}

function BandeauErreur({ message }) {
  return (
    <div style={{
      position:'absolute', top:12, left:12, right:12, zIndex:1000,
      display:'flex', alignItems:'center', gap:8,
      background:'rgba(15,23,42,0.95)',
      border:'1px solid rgba(239,68,68,0.4)',
      borderRadius:8, padding:'10px 14px',
      pointerEvents:'none',
    }}>
      <span style={{ fontSize:11, color:'#FCA5A5', fontFamily:'Inter,system-ui,sans-serif' }}>
        {message}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BoutonPleinEcran — masqué sur mobile (inutile, la carte est déjà plein écran)
// ─────────────────────────────────────────────────────────────────────────────

function BoutonPleinEcran({ isFullscreen, onToggle, isMobile }) {
  if (isMobile) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
      style={{
        position:'absolute', top:12, right:12, zIndex:1000,
        display:'flex', alignItems:'center', justifyContent:'center',
        width:34, height:34, borderRadius:10,
        background:'rgba(15,23,42,0.85)',
        border:'1px solid rgba(148,163,184,0.25)',
        color:'#CBD5E1', cursor:'pointer',
        backdropFilter:'blur(6px)',
        transition:'transform 0.15s ease, border-color 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform   = 'scale(1.08)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
        e.currentTarget.style.color       = '#E0E7FF';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform   = 'scale(1)';
        e.currentTarget.style.borderColor = 'rgba(148,163,184,0.25)';
        e.currentTarget.style.color       = '#CBD5E1';
      }}
    >
      {isFullscreen
        ? <Minimize2 size={16} strokeWidth={2} />
        : <Maximize2 size={16} strokeWidth={2} />
      }
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export default — CityMap
// ─────────────────────────────────────────────────────────────────────────────

export default function CityMap({
  simulationRef,
  anomalies,
  filtreActif  = 'tous',
  vueActive    = 'trafic',
  onRapportIA,
  loading      = false,
  loadError    = null,
  zoom,
}) {
  const { isDark } = useTheme();
  const isMobile   = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Zoom adapté selon l'écran
  const zoomInitial = zoom ?? (isMobile ? ZOOM_MOBILE : ZOOM_INITIAL);

  // Échap pour quitter le plein écran
  useEffect(() => {
    if (!isFullscreen) return;
    function surEchap(ev) { if (ev.key === 'Escape') setIsFullscreen(false); }
    window.addEventListener('keydown', surEchap);
    return () => window.removeEventListener('keydown', surEchap);
  }, [isFullscreen]);

  // Filtrage des anomalies — par type puis par vue active
  const anomaliesSures = useMemo(() => {
    const valides = (Array.isArray(anomalies) ? anomalies : [])
      .filter(a => a != null && positionValide(a.position) !== null)
      .slice(0, MAX_MARQUEURS);

    const filtreesParType = filtreActif === 'tous'
      ? valides
      : valides.filter(a => a?.type === filtreActif);

    return filtreesParType.filter(a => {
      const capteur = a?.sensor ?? '';
      if (vueActive === 'pollution') return capteur.startsWith('CAP-ENV');
      if (vueActive === 'trafic')    return !capteur.startsWith('CAP-ENV');
      return true;
    });
  }, [anomalies, filtreActif, vueActive]);

  return (
    <div className={[
      isFullscreen
        ? 'fixed inset-0 w-screen h-screen z-50'
        : 'relative w-full h-full',
      'transition-all duration-200 ease-in-out',
    ].join(' ')}>

      <style>{`
        @keyframes pulseMlam {
          0%,100%{opacity:.65;transform:scale(1)}
          50%{opacity:0;transform:scale(1.65)}
        }
        @keyframes spinMlam {
          from{transform:rotate(0deg)} to{transform:rotate(360deg)}
        }
        /* Popup responsive */
        .popup-mlam .leaflet-popup-content-wrapper {
          border-radius:8px;
          box-shadow:0 6px 30px rgba(0,0,0,.18);
          border:1px solid #E2E8F0;
          padding:0;
          max-width:calc(100vw - 40px);
        }
        .popup-mlam .leaflet-popup-content { margin:13px 15px; }
        .popup-mlam a.leaflet-popup-close-button {
          font-size:16px; color:#94A3B8; top:6px; right:8px;
          /* Zone de tap élargie sur mobile */
          min-width:36px; min-height:36px;
          display:flex; align-items:center; justify-content:center;
        }
      `}</style>

      <MapContainer
        center={CITY_CENTER}
        zoom={zoomInitial}
        scrollWheelZoom={!isMobile}
        // Sur mobile : pinch-to-zoom natif, pas de scroll wheel
        touchZoom={isMobile}
        doubleClickZoom={!isMobile}
        zoomControl={!isMobile}   // masqué sur mobile, on utilise les gestes
        className="w-full h-full"
        attributionControl={false}
        // Empêche le scroll de la page quand on interagit avec la carte
        dragging={true}
      >
        <FiltreSombre estSombre={isDark} />
        <RedimensionneurCarte isFullscreen={isFullscreen} isMobile={isMobile} />

        <TileLayer
          url={URL_TUILES}
          maxZoom={19}
          attribution="&copy; OpenStreetMap contributors"
          // Tuiles détectIcon adapté pour les petits écrans
          tileSize={isMobile ? 256 : 256}
          detectRetina={true}
        />

        <PolylignesRoutes
          simulationRef={simulationRef}
          loading={loading}
          estSombre={isDark}
          isMobile={isMobile}
        />

        {vueActive === 'trafic' && (
          <CoucheCanvasVehicules
            simulationRef={simulationRef}
            estSombre={isDark}
            isMobile={isMobile}
          />
        )}

        {vueActive === 'pollution' && (
          <CouchePollutionCanvas
            simulationRef={simulationRef}
            estSombre={isDark}
          />
        )}

        {anomaliesSures.map(anomalie => (
          <MarqueurAnomalie
            key={anomalie.id}
            anomalie={anomalie}
            estSombre={isDark}
            onRapportIA={onRapportIA}
          />
        ))}
      </MapContainer>

      {loading   && <OverlayChargement />}
      {!loading  && loadError && <BandeauErreur message={loadError} />}

      {/* Badge filtre actif */}
      {filtreActif !== 'tous' && (
        <div style={{
          position:'absolute',
          top: isMobile ? 8 : 12,
          left:'50%', transform:'translateX(-50%)',
          zIndex:1000,
          display:'flex', alignItems:'center', gap:6,
          background:'rgba(15,23,42,0.88)',
          border:'1px solid rgba(99,102,241,0.4)',
          borderRadius:20, padding:'5px 14px',
          pointerEvents:'none',
        }}>
          <span style={{ height:6, width:6, borderRadius:'50%', background:'#6366F1', display:'inline-block' }} />
          <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace', color:'#A5B4FC', letterSpacing:'0.08em', textTransform:'uppercase' }}>
            {filtreActif}
          </span>
          <span style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>
            — {anomaliesSures.length} marqueur{anomaliesSures.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Badge vue active */}
      <div style={{
        position:'absolute',
        top: isMobile ? 8 : 12,
        right: isMobile ? 8 : 56,
        zIndex:1000,
        display:'flex', alignItems:'center', gap:6,
        background:'rgba(15,23,42,0.88)',
        border: vueActive === 'pollution'
          ? '1px solid rgba(52,211,153,0.4)'
          : '1px solid rgba(96,165,250,0.4)',
        borderRadius:20, padding:'5px 12px',
        pointerEvents:'none',
      }}>
        <span style={{
          height:6, width:6, borderRadius:'50%', display:'inline-block',
          background: vueActive === 'pollution' ? '#34D399' : '#60A5FA',
        }} />
        <span style={{
          fontSize: isMobile ? 10 : 11,
          fontWeight:700, fontFamily:'monospace',
          color: vueActive === 'pollution' ? '#6EE7B7' : '#93C5FD',
          letterSpacing:'0.08em', textTransform:'uppercase',
        }}>
          {vueActive === 'pollution' ? '🍃 Air' : '📡 Trafic'}
        </span>
      </div>

      <BoutonPleinEcran
        isFullscreen={isFullscreen}
        onToggle={() => setIsFullscreen(v => !v)}
        isMobile={isMobile}
      />
    </div>
  );
}
