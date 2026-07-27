// src/map/CityMap.jsx
import { useEffect, useMemo, useState } from 'react';
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
const URL_TUILES    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAX_MARQUEURS = 25;
const FILTRE_SOMBRE = [
  'brightness(0.80)', 'invert(1)', 'hue-rotate(180deg)', 'saturate(1.15)', 'contrast(0.95)',
].join(' ');

const PALETTE_AXES = ['#60A5FA', '#FBBF24', '#34D399', '#A78BFA', '#F87171', '#22D3EE', '#FB923C'];

function couleurPourAxe(nom, idx) {
  if (nom === 'RN7') return '#60A5FA';
  if (nom === 'N42') return '#FBBF24';
  return PALETTE_AXES[idx % PALETTE_AXES.length];
}

const PALETTE_ANOMALIE = {
  critical: { couleur: '#EF4444', fondBadge: '#FEE2E2', texteBadge: '#991B1B', label: 'Critique' },
  warning:  { couleur: '#F59E0B', fondBadge: '#FEF3C7', texteBadge: '#92400E', label: 'Avertissement' },
  info:     { couleur: '#3B82F6', fondBadge: '#DBEAFE', texteBadge: '#1E40AF', label: 'Information' },
};

// ── Quartiers clés de Fianarantsoa — rayon d'effet réaliste 200-350m ─────────
const DEG_PAR_METRE = 1 / 111000;

const QUARTIERS_FIANAR = [
  { nom: 'Centre-Ville',   lat: -21.4526, lng: 47.0857, rayonMetres: 320 },
  { nom: 'Tsianolondroa',  lat: -21.4380, lng: 47.0790, rayonMetres: 280 },
  { nom: 'Ampasambazaha',  lat: -21.4610, lng: 47.0920, rayonMetres: 260 },
  { nom: 'Talatamaty',     lat: -21.4290, lng: 47.1010, rayonMetres: 240 },
  { nom: 'Anjoma',         lat: -21.4470, lng: 47.0700, rayonMetres: 250 },
  { nom: 'Haute Ville',    lat: -21.4550, lng: 47.0830, rayonMetres: 220 },
];

const RAYON_INFLUENCE_DEG = 400 * DEG_PAR_METRE;

function couleurPollution(indice) {
  if (indice >= 70) return { r: 248, g: 113, b: 113 };
  if (indice >= 35) return { r: 251, g: 191, b: 36 };
  return { r: 52, g: 211, b: 153 };
}

function distanceApprox(lat1, lng1, lat2, lng2) {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────

function positionValide(position) {
  try {
    let lat, lng;
    if (Array.isArray(position)) {
      [lat, lng] = position;
    } else if (position && typeof position === 'object') {
      ({ lat, lng } = position);
    }
    lat = Number(lat); lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
  } catch {
    return null;
  }
}

function construireIconeAnomalie(priorite, estSombre) {
  const palette = PALETTE_ANOMALIE[priorite] ?? PALETTE_ANOMALIE.info;
  const couleur = palette.couleur;
  const fond    = estSombre ? '#1E293B' : '#FFFFFF';

  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -20],
    html: `
      <div style="position:relative;width:30px;height:30px;">
        <span style="position:absolute;inset:-5px;border-radius:50%;border:2px solid ${couleur};
          opacity:.65;animation:pulseMlam 2.2s ease-in-out infinite;pointer-events:none;"></span>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          border-radius:50%;background:${fond};border:1.5px solid ${couleur};
          box-shadow:0 2px 8px rgba(0,0,0,.28);">
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
    pane.style.filter = estSombre ? FILTRE_SOMBRE : 'none';
  }, [carte, estSombre]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RedimensionneurCarte
// ─────────────────────────────────────────────────────────────────────────────

function RedimensionneurCarte({ isFullscreen }) {
  const carte = useMap();
  useEffect(() => {
    const id = setTimeout(() => {
      carte?.invalidateSize?.();
    }, 260);
    return () => clearTimeout(id);
  }, [carte, isFullscreen]);
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PolylignesRoutes
// ─────────────────────────────────────────────────────────────────────────────

function PolylignesRoutes({ simulationRef, loading, estSombre }) {
  const routesDict = simulationRef?.current?.routes ?? {};
  const cles = Object.keys(routesDict);

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
              color: couleurPourAxe(cle, index),
              weight: 2.5,
              opacity: estSombre ? 0.72 : 0.58,
              dashArray: '8 5',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoucheCanvasVehicules
// ─────────────────────────────────────────────────────────────────────────────

function CoucheCanvasVehicules({ simulationRef, estSombre }) {
  const carte = useMap();

  useEffect(() => {
    if (!carte) return;

    if (!carte.getPane('vehicules')) {
      const pane = carte.createPane('vehicules');
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }

    const conteneur = carte.getContainer();
    const canvas = document.createElement('canvas');
    canvas.width = conteneur.offsetWidth;
    canvas.height = conteneur.offsetHeight;
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    carte.getPane('vehicules').appendChild(canvas);

    function surRedim() {
      canvas.width = conteneur.offsetWidth;
      canvas.height = conteneur.offsetHeight;
    }
    carte.on('resize', surRedim);

    function surMouv() {
      const coin = carte.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, coin);
    }
    carte.on('move zoom moveend zoomend', surMouv);

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
          try {
            point = carte.latLngToContainerPoint([v.lat, v.lng]);
          } catch {
            continue;
          }

          if (point.x < -12 || point.x > canvas.width + 12 ||
              point.y < -12 || point.y > canvas.height + 12) continue;

          const rayon = v.taille ?? 4;

          if (v.enAlerte === 'critical') {
            const pulse = (Math.sin((timestamp / 667) * Math.PI * 2) + 1) / 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon + 8 + pulse * 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.35 + pulse * 0.45;
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
            ctx.fillStyle = '#EF4444';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (v.enAlerte === 'warning') {
            const po = (Math.sin((timestamp / 900) * Math.PI * 2) + 1) / 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon + 4 + po * 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#F97316';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.25 + po * 0.35;
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
            ctx.fillStyle = v.couleur ?? '#F97316';
            ctx.fill();
            ctx.strokeStyle = '#F97316';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else {
            const couleur = v.arrete ? '#94A3B8' : (v.chocDetecte ? '#EF4444' : (v.couleur ?? '#60A5FA'));
            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
            ctx.fillStyle = couleur;
            ctx.fill();
            ctx.strokeStyle = estSombre ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(dessiner);
    }

    rafId = requestAnimationFrame(dessiner);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      carte.off('resize', surRedim);
      carte.off('move zoom moveend zoomend', surMouv);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [carte, simulationRef, estSombre]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CouchePollutionCanvas — pollution par quartier
// ─────────────────────────────────────────────────────────────────────────────

function CouchePollutionCanvas({ simulationRef, estSombre }) {
  const carte = useMap();

  useEffect(() => {
    if (!carte) return;

    if (!carte.getPane('pollution')) {
      const pane = carte.createPane('pollution');
      pane.style.zIndex = '420';
      pane.style.pointerEvents = 'none';
    }
    const panePollution = carte.getPane('pollution');

    const canvas = document.createElement('canvas');
    const taille = carte.getSize();
    canvas.width = taille.x;
    canvas.height = taille.y;
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    panePollution.appendChild(canvas);

    function surRedim() {
      const t = carte.getSize();
      canvas.width = t.x;
      canvas.height = t.y;
    }
    carte.on('resize', surRedim);

    function surMouv() {
      const coin = carte.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvas, coin);
    }
    carte.on('move zoom moveend zoomend', surMouv);
    surMouv();

    let rafId = null;

    function calculerPollutionParQuartier() {
      const routesDict = simulationRef?.current?.routes ?? {};
      const resultats = QUARTIERS_FIANAR.map(q => ({ ...q, indiceCumule: 0, contributions: 0 }));

      Object.values(routesDict).forEach(coords => {
        if (!Array.isArray(coords) || coords.length < 2) return;
        const indiceRoute = coords.pollutionIndex ?? 0;
        if (indiceRoute < 3) return;

        const pas = Math.max(1, Math.floor(coords.length / 6));
        for (let i = 0; i < coords.length; i += pas) {
          const pt = coords[i];
          if (!Array.isArray(pt)) continue;

          resultats.forEach(q => {
            const dist = distanceApprox(pt[0], pt[1], q.lat, q.lng);
            if (dist <= RAYON_INFLUENCE_DEG) {
              const poids = 1 - (dist / RAYON_INFLUENCE_DEG);
              q.indiceCumule += indiceRoute * poids;
              q.contributions += 1;
            }
          });
        }
      });

      return resultats.map(q => ({
        ...q,
        indiceMoyen: q.contributions > 0 ? clamp(q.indiceCumule / q.contributions, 0, 100) : 0,
      }));
    }

    function dessiner(timestamp) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const quartiers = calculerPollutionParQuartier();

      quartiers.forEach((q, idx) => {
        const indiceAffiche = Math.max(q.indiceMoyen, 12);

        let centre;
        try {
          centre = carte.latLngToContainerPoint([q.lat, q.lng]);
        } catch {
          return;
        }

        let bordurePoint;
        try {
          bordurePoint = carte.latLngToContainerPoint([q.lat + q.rayonMetres * DEG_PAR_METRE, q.lng]);
        } catch {
          return;
        }

        const rayonPx = Math.max(40, Math.abs(centre.y - bordurePoint.y));

        if (centre.x < -rayonPx * 2 || centre.x > canvas.width + rayonPx * 2 ||
            centre.y < -rayonPx * 2 || centre.y > canvas.height + rayonPx * 2) return;

        const { r, g, b } = couleurPollution(indiceAffiche);
        const pulse = (Math.sin(timestamp / 2800 + idx * 1.1) + 1) / 2;
        const rayonFinal = rayonPx * (0.85 + (indiceAffiche / 100) * 0.5) + pulse * 8;
        const alpha = 0.22 + (indiceAffiche / 100) * 0.38;

        ctx.save();
        ctx.filter = 'blur(15px)';

        const degrade = ctx.createRadialGradient(centre.x, centre.y, 0, centre.x, centre.y, rayonFinal);
        degrade.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        degrade.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.55})`);
        degrade.addColorStop(1, `rgba(${r},${g},${b},0)`);

        ctx.beginPath();
        ctx.arc(centre.x, centre.y, rayonFinal, 0, Math.PI * 2);
        ctx.fillStyle = degrade;
        ctx.fill();
        ctx.restore();
      });

      rafId = requestAnimationFrame(dessiner);
    }

    rafId = requestAnimationFrame(dessiner);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
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
  const heure = (() => {
    try {
      return new Date(anomalie.timestamp).toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return anomalie.time ?? '--:--';
    }
  })();

  return (
    <Marker position={latLng} icon={icone}>
      <Popup minWidth={230} maxWidth={300} className="popup-mlam">
        <div style={{ fontFamily: 'Inter,system-ui,sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B' }}>
              Anomalie — Fianarantsoa
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: palette.fondBadge, color: palette.texteBadge }}>
              {palette.label}
            </span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.45 }}>
            {anomalie.description?.slice(0, 100) ?? 'Incident détecté'}
            {(anomalie.description?.length ?? 0) > 100 ? '…' : ''}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {[['Capteur', anomalie.sensor], ['Zone', anomalie.zone], ['ID', anomalie.id], ['Heure', heure]].map(([cle, val]) => (
                <tr key={cle}>
                  <td style={{ color: '#94A3B8', padding: '2px 0', width: '36%' }}>{cle}</td>
                  <td style={{ fontWeight: 600, color: '#334155' }}>{val ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {typeof onRapportIA === 'function' && (
            <button
              type="button"
              onClick={() => onRapportIA(anomalie)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginTop: 10,
                padding: '7px 12px', borderRadius: 7, border: '1px solid #E2E8F0',
                background: '#F8FAFC', color: '#334155', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
              }}
            >
              Générer Rapport IA
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlays
// ─────────────────────────────────────────────────────────────────────────────

function OverlayChargement() {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(15,23,42,0.55)', pointerEvents: 'none',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#60A5FA',
        animation: 'spinMlam 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', fontFamily: 'Inter,system-ui,sans-serif' }}>
        Chargement du réseau routier de Fianarantsoa...
      </span>
    </div>
  );
}

function BandeauErreur({ message }) {
  return (
    <div style={{
      position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000,
      display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', pointerEvents: 'none',
    }}>
      <span style={{ fontSize: 11, color: '#FCA5A5', fontFamily: 'Inter,system-ui,sans-serif' }}>
        {message}
      </span>
    </div>
  );
}

function BoutonPleinEcran({ isFullscreen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: 10, background: 'rgba(15,23,42,0.85)',
        border: '1px solid rgba(148,163,184,0.25)', color: '#CBD5E1', cursor: 'pointer',
        backdropFilter: 'blur(6px)',
      }}
    >
      {isFullscreen ? <Minimize2 size={16} strokeWidth={2} /> : <Maximize2 size={16} strokeWidth={2} />}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export default — CityMap
// ─────────────────────────────────────────────────────────────────────────────

export default function CityMap({
  simulationRef,
  tick,
  anomalies,
  filtreActif = 'tous',
  vueActive   = 'trafic',
  onRapportIA,
  loading     = false,
  loadError   = null,
  zoom        = ZOOM_INITIAL,
  vuePure     = false,
}) {
  const { isDark } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    function surEchap(ev) {
      if (ev.key === 'Escape') setIsFullscreen(false);
    }
    window.addEventListener('keydown', surEchap);
    return () => window.removeEventListener('keydown', surEchap);
  }, [isFullscreen]);

  const anomaliesSures = useMemo(() => {
    if (vuePure) return [];

    const valides = (Array.isArray(anomalies) ? anomalies : [])
      .filter(a => a != null && positionValide(a.position) !== null)
      .slice(0, MAX_MARQUEURS);

    const filtreesParType = filtreActif === 'tous'
      ? valides
      : valides.filter(a => a?.type === filtreActif);

    return filtreesParType;
  }, [anomalies, filtreActif, vuePure]);

  return (
    <div
      className={[
        isFullscreen ? 'fixed inset-0 w-screen h-screen z-50' : 'relative w-full h-full',
        'transition-all duration-200 ease-in-out',
      ].join(' ')}
    >
      <style>{`
        @keyframes pulseMlam {
          0%,100%{opacity:.65;transform:scale(1)}
          50%{opacity:0;transform:scale(1.65)}
        }
        @keyframes spinMlam {
          from{transform:rotate(0deg)} to{transform:rotate(360deg)}
        }
        .popup-mlam .leaflet-popup-content-wrapper{
          border-radius:8px;box-shadow:0 6px 30px rgba(0,0,0,.18);
          border:1px solid #E2E8F0;padding:0;
        }
        .popup-mlam .leaflet-popup-content{margin:13px 15px}
      `}</style>

      <MapContainer
        center={CITY_CENTER}
        zoom={zoom}
        scrollWheelZoom
        zoomControl
        className="w-full h-full"
        attributionControl={false}
      >
        <FiltreSombre estSombre={isDark} />
        <RedimensionneurCarte isFullscreen={isFullscreen} />
        <TileLayer url={URL_TUILES} maxZoom={19} attribution="&copy; OpenStreetMap contributors" />
        <PolylignesRoutes simulationRef={simulationRef} loading={loading} estSombre={isDark} />

        {!vuePure && vueActive === 'trafic' && (
          <CoucheCanvasVehicules simulationRef={simulationRef} estSombre={isDark} />
        )}

        {!vuePure && vueActive === 'pollution' && (
          <CouchePollutionCanvas simulationRef={simulationRef} estSombre={isDark} />
        )}

        {!vuePure && anomaliesSures.map(anomalie => (
          <MarqueurAnomalie
            key={anomalie.id}
            anomalie={anomalie}
            estSombre={isDark}
            onRapportIA={onRapportIA}
          />
        ))}
      </MapContainer>

      {loading && <OverlayChargement />}
      {!loading && loadError && <BandeauErreur message={loadError} />}

      {!vuePure && (
        <div style={{
          position: 'absolute', top: 12, right: 56, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(15,23,42,0.88)',
          border: vueActive === 'pollution' ? '1px solid rgba(52,211,153,0.4)' : '1px solid rgba(96,165,250,0.4)',
          borderRadius: 20, padding: '5px 14px', pointerEvents: 'none',
        }}>
          <span style={{
            height: 6, width: 6, borderRadius: '50%', display: 'inline-block',
            background: vueActive === 'pollution' ? '#34D399' : '#60A5FA',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
            color: vueActive === 'pollution' ? '#6EE7B7' : '#93C5FD',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {vueActive === 'pollution' ? 'Vue Pollution' : 'Vue Trafic'}
          </span>
        </div>
      )}

      <BoutonPleinEcran isFullscreen={isFullscreen} onToggle={() => setIsFullscreen(v => !v)} />
    </div>
  );
}