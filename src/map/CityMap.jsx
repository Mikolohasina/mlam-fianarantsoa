/**
 * CityMap.jsx  —  src/map/CityMap.jsx
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Architecture de rendu en 4 couches :
 *
 *   Couche 1 — Tuiles OpenStreetMap        (Leaflet TileLayer)
 *   Couche 2 — Polylignes des axes réels    (Leaflet Polyline, dessinées une fois)
 *   Couche 3 — Véhicules 150+              (Canvas HTML2D, 60 FPS, zéro React)
 *   Couche 4 — Marqueurs d'anomalies        (react-leaflet Marker, < 25 actifs)
 *
 * Pourquoi canvas pour les véhicules ?
 *   Leaflet positionne ses marqueurs via left/top absolus — les transitions CSS
 *   transform n'ont aucun effet sur ces éléments. Le seul moyen d'obtenir un
 *   mouvement réellement fluide à 60 FPS avec 150+ entités est de dessiner
 *   directement sur un canvas via requestAnimationFrame, en dehors de l'arbre
 *   React. Chaque frame lit simulationRef.current.vehicles sans déclencher
 *   un seul re-render.
 *
 * Tooltip de survol (popup léger) :
 *   Un div HTML positionné dynamiquement remplace les popups Leaflet pour les
 *   véhicules canvas — les popups Leaflet ne fonctionnent pas sur le canvas.
 *   Les anomalies, elles, utilisent les popups Leaflet standard.
 */

import { useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext';
import { CITY_CENTER } from '../hooks/useCitySimulation';

// ─────────────────────────────────────────────────────────────────────────────
// Correctif icônes Leaflet — obligatoire sous Vite
// Vite réécrit les chemins d'assets et rompt la résolution des PNG de Leaflet.
// ─────────────────────────────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const ZOOM_INITIAL   = 14;
const URL_TUILES     = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const FILTRE_SOMBRE  = 'brightness(0.82) invert(1) hue-rotate(180deg) saturate(1.1)';
const MAX_ANOMALIES  = 25;

// ─────────────────────────────────────────────────────────────────────────────
// Coordonnées des axes routiers — miroir des routes de useCitySimulation.js
// Nécessaires ici pour dessiner les polylignes sans réimporter le hook.
// ─────────────────────────────────────────────────────────────────────────────

const POLYLIGNES = {
  RN7_NS: {
    label: 'RN7 Nord-Sud',
    couleur: '#60A5FA',
    coords: [
      [-21.4192, 47.0785], [-21.4220, 47.0790], [-21.4248, 47.0796],
      [-21.4275, 47.0801], [-21.4302, 47.0806], [-21.4328, 47.0811],
      [-21.4352, 47.0815], [-21.4376, 47.0820], [-21.4398, 47.0824],
      [-21.4420, 47.0829], [-21.4440, 47.0834], [-21.4458, 47.0839],
      [-21.4476, 47.0843], [-21.4493, 47.0848], [-21.4510, 47.0852],
      [-21.4522, 47.0856], [-21.4530, 47.0858], [-21.4542, 47.0862],
      [-21.4558, 47.0867], [-21.4575, 47.0872], [-21.4593, 47.0877],
      [-21.4612, 47.0882], [-21.4630, 47.0888], [-21.4650, 47.0893],
      [-21.4672, 47.0898], [-21.4695, 47.0904], [-21.4718, 47.0910],
      [-21.4742, 47.0916],
    ],
  },
  HAUTE_VILLE: {
    label: 'Montee Haute Ville',
    couleur: '#FBBF24',
    coords: [
      [-21.4510, 47.0852], [-21.4502, 47.0840], [-21.4494, 47.0827],
      [-21.4486, 47.0813], [-21.4477, 47.0800], [-21.4469, 47.0788],
      [-21.4460, 47.0776], [-21.4452, 47.0764], [-21.4443, 47.0752],
      [-21.4434, 47.0741], [-21.4425, 47.0730], [-21.4416, 47.0720],
      [-21.4407, 47.0710], [-21.4398, 47.0700], [-21.4389, 47.0690],
      [-21.4380, 47.0680],
    ],
  },
  GARE_MARCHE: {
    label: 'Axe Gare FCE — Marche',
    couleur: '#34D399',
    coords: [
      [-21.4550, 47.0924], [-21.4545, 47.0913], [-21.4540, 47.0902],
      [-21.4535, 47.0890], [-21.4530, 47.0878], [-21.4528, 47.0867],
      [-21.4526, 47.0857], [-21.4524, 47.0845], [-21.4522, 47.0833],
      [-21.4520, 47.0821], [-21.4516, 47.0808], [-21.4510, 47.0796],
      [-21.4505, 47.0783], [-21.4498, 47.0771],
    ],
  },
  ANJOMA_LOCAL: {
    label: 'Boucle Anjoma',
    couleur: '#A78BFA',
    coords: [
      [-21.4376, 47.0820], [-21.4382, 47.0809], [-21.4388, 47.0798],
      [-21.4394, 47.0787], [-21.4400, 47.0776], [-21.4408, 47.0787],
      [-21.4414, 47.0800], [-21.4412, 47.0813], [-21.4376, 47.0820],
    ],
  },
  TANAMBAO_INTERNE: {
    label: 'Tanambao Interieur',
    couleur: '#F87171',
    coords: [
      [-21.4575, 47.0872], [-21.4583, 47.0883], [-21.4592, 47.0894],
      [-21.4601, 47.0904], [-21.4610, 47.0914], [-21.4618, 47.0924],
      [-21.4625, 47.0934],
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Palette de couleurs selon la sévérité des anomalies
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE_SEVERITE = {
  critical: { clair: '#EF4444', sombre: '#F87171' },
  warning:  { clair: '#F59E0B', sombre: '#FBBF24' },
  info:     { clair: '#3B82F6', sombre: '#60A5FA' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Validation de position GPS — empêche tout crash Leaflet
// ─────────────────────────────────────────────────────────────────────────────

function positionSure(position) {
  try {
    let lat, lng;
    if (Array.isArray(position))               { [lat, lng] = position; }
    else if (position && typeof position === 'object') { ({ lat, lng } = position); }
    lat = Number(lat);
    lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90  || lat > 90)          return null;
    if (lng < -180 || lng > 180)         return null;
    return [lat, lng];
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructeur d'icône SVG pour les anomalies (sans react-dom/server)
// ─────────────────────────────────────────────────────────────────────────────

function construireIconeAnomalie(priorite, estSombre) {
  const palette = PALETTE_SEVERITE[priorite] ?? PALETTE_SEVERITE.info;
  const couleur = estSombre ? palette.sombre : palette.clair;
  const fond    = estSombre ? '#1E293B' : '#FFFFFF';

  return L.divIcon({
    className:   '',
    iconSize:    [30, 30],
    iconAnchor:  [15, 15],
    popupAnchor: [0, -18],
    html: `
      <div style="position:relative;width:30px;height:30px;">
        <span style="
          position:absolute;inset:-5px;border-radius:50%;
          border:2px solid ${couleur};opacity:.65;
          animation:pulseMlam 2.2s ease-in-out infinite;
          pointer-events:none;
        "></span>
        <div style="
          position:absolute;inset:0;
          display:flex;align-items:center;justify-content:center;
          border-radius:50%;
          background:${fond};
          border:1.5px solid ${couleur};
          box-shadow:0 2px 10px rgba(0,0,0,.3);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
            viewBox="0 0 24 24" fill="none" stroke="${couleur}"
            stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
      </div>`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FiltreModesSombre — applique le filtre CSS directement sur le pane des tuiles
// ─────────────────────────────────────────────────────────────────────────────

function FiltreModesSombre({ estSombre }) {
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
// CoucheCanvasVehicules
//
// Composant interne qui accède à l'instance Leaflet via useMap().
// Crée un canvas HTML2D dans un pane dédié et dessine tous les véhicules
// à chaque frame de requestAnimationFrame.
//
// Tooltip de survol :
//   On détecte le véhicule le plus proche de la souris par distance euclidienne
//   en coordonnées écran (pixels). Un div HTML positionné affiche les infos
//   sans passer par le système de popups Leaflet (incompatible avec le canvas).
// ─────────────────────────────────────────────────────────────────────────────

function CoucheCanvasVehicules({ simulationRef, estSombre }) {
  const carte    = useMap();
  const canvasEl = useRef(null);
  const tooltipEl = useRef(null);
  const rafId    = useRef(null);

  useEffect(() => {
    if (!carte) return;

    // Créer le pane dédié aux véhicules (z-index entre tuiles et contrôles)
    if (!carte.getPane('vehicules')) {
      const pane = carte.createPane('vehicules');
      pane.style.zIndex = '450';
    }

    const conteneur = carte.getContainer();

    // ── Créer le canvas ────────────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.width  = conteneur.offsetWidth;
    canvas.height = conteneur.offsetHeight;
    Object.assign(canvas.style, {
      position:       'absolute',
      top:            '0',
      left:           '0',
      pointerEvents:  'none',
      zIndex:         '450',
    });
    carte.getPane('vehicules').appendChild(canvas);
    canvasEl.current = canvas;

    // ── Créer le tooltip HTML ──────────────────────────────────────────────
    const tooltip = document.createElement('div');
    Object.assign(tooltip.style, {
      position:     'absolute',
      background:   'rgba(15,23,42,0.94)',
      color:        '#e2e8f0',
      fontSize:     '11px',
      fontFamily:   'Inter,system-ui,sans-serif',
      padding:      '8px 12px',
      borderRadius: '8px',
      border:       '1px solid rgba(148,163,184,0.2)',
      boxShadow:    '0 4px 18px rgba(0,0,0,.45)',
      pointerEvents:'none',
      whiteSpace:   'nowrap',
      display:      'none',
      zIndex:       '600',
      maxWidth:     '260px',
    });
    conteneur.appendChild(tooltip);
    tooltipEl.current = tooltip;

    // ── Adapter le canvas au redimensionnement ─────────────────────────────
    function surRedimensionnement() {
      if (!canvasEl.current) return;
      canvasEl.current.width  = conteneur.offsetWidth;
      canvasEl.current.height = conteneur.offsetHeight;
    }
    carte.on('resize', surRedimensionnement);

    // ── Repositionner le canvas lors du déplacement de la carte ───────────
    function surMouvement() {
      if (!canvasEl.current) return;
      const coinHautGauche = carte.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(canvasEl.current, coinHautGauche);
    }
    carte.on('move zoom moveend zoomend', surMouvement);

    // ── Boucle de dessin 60 FPS ────────────────────────────────────────────
    function dessiner() {
      const canvas    = canvasEl.current;
      const vehicules = simulationRef?.current?.vehicles;

      if (!canvas || !vehicules) {
        rafId.current = requestAnimationFrame(dessiner);
        return;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < vehicules.length; i++) {
        const v = vehicules[i];
        if (!v || !isFinite(v?.lat) || !isFinite(v?.lng)) continue;

        try {
          const point = carte.latLngToContainerPoint([v.lat, v.lng]);

          // Ignorer les véhicules hors de la vue visible (optimisation)
          if (
            point.x < -10 || point.x > canvas.width  + 10 ||
            point.y < -10 || point.y > canvas.height + 10
          ) continue;

          const rayon  = v.taille ?? 4;
          const couleur = v.arrete
            ? '#94A3B8'                               // Gris = arrêté
            : (v.chocDetecte ? '#EF4444' : (v.couleur ?? '#60A5FA'));

          // Halo lumineux pour les véhicules Secours
          if (v.typeKey === 'SECOURS') {
            ctx.beginPath();
            ctx.arc(point.x, point.y, rayon + 4, 0, Math.PI * 2);
            ctx.fillStyle = estSombre
              ? 'rgba(248,113,113,0.22)'
              : 'rgba(239,68,68,0.18)';
            ctx.fill();
          }

          // Corps du véhicule
          ctx.beginPath();
          ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
          ctx.fillStyle = couleur;
          ctx.fill();

          // Bordure pour lisibilité sur fond clair et sombre
          ctx.beginPath();
          ctx.arc(point.x, point.y, rayon, 0, Math.PI * 2);
          ctx.strokeStyle = estSombre
            ? 'rgba(15,23,42,0.85)'
            : 'rgba(255,255,255,0.92)';
          ctx.lineWidth   = 1.5;
          ctx.stroke();

        } catch { /* véhicule malformé — ignorer sans crash */ }
      }

      rafId.current = requestAnimationFrame(dessiner);
    }

    rafId.current = requestAnimationFrame(dessiner);

    // ── Tooltip de survol ──────────────────────────────────────────────────
    function surSouris(evenement) {
      const rect     = conteneur.getBoundingClientRect();
      const sourisX  = evenement.clientX - rect.left;
      const sourisY  = evenement.clientY - rect.top;
      const vehicules = simulationRef?.current?.vehicles ?? [];

      let plusProche = null;
      let distMin    = 14; // rayon de détection en pixels

      for (let i = 0; i < vehicules.length; i++) {
        const v = vehicules[i];
        if (!v || !isFinite(v?.lat) || !isFinite(v?.lng)) continue;
        try {
          const point = carte.latLngToContainerPoint([v.lat, v.lng]);
          const dist  = Math.hypot(point.x - sourisX, point.y - sourisY);
          if (dist < distMin) { distMin = dist; plusProche = v; }
        } catch { /* ignorer */ }
      }

      const tip = tooltipEl.current;
      if (!tip) return;

      if (plusProche) {
        const vitesse = Math.round(plusProche.vitesseKmh ?? 0);
        const statut  = plusProche.arrete ? 'Arrete' : `${vitesse} km/h`;
        const couleurStatut = plusProche.arrete ? '#F87171' : '#34D399';

        tip.style.display = 'block';
        tip.style.left    = `${sourisX + 16}px`;
        tip.style.top     = `${sourisY - 8}px`;
        tip.innerHTML = `
          <div style="font-weight:700;font-size:12px;color:#f1f5f9;margin-bottom:5px">
            ${plusProche.typeLabel ?? 'Vehicule'} — ${plusProche.labelRoute ?? ''}
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:10px">
            <span style="color:#94a3b8">Mission</span>
            <span style="color:#cbd5e1;max-width:200px;white-space:normal">
              ${plusProche.mission ?? 'N/A'}
            </span>
            <span style="color:#94a3b8">Destination</span>
            <span style="color:#e2e8f0">${plusProche.destination ?? 'N/A'}</span>
            <span style="color:#94a3b8">Statut</span>
            <span style="color:${couleurStatut};font-weight:600">${statut}</span>
            <span style="color:#94a3b8">ID</span>
            <span style="color:#64748b;font-family:monospace">VEH-${String(plusProche.id ?? 0).padStart(3,'0')}</span>
          </div>`;
      } else {
        tip.style.display = 'none';
      }
    }

    function surSortieSouris() {
      if (tooltipEl.current) tooltipEl.current.style.display = 'none';
    }

    conteneur.addEventListener('mousemove',  surSouris);
    conteneur.addEventListener('mouseleave', surSortieSouris);

    // ── Nettoyage ──────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId.current);
      carte.off('resize',               surRedimensionnement);
      carte.off('move zoom moveend zoomend', surMouvement);
      conteneur.removeEventListener('mousemove',  surSouris);
      conteneur.removeEventListener('mouseleave', surSortieSouris);
      if (canvas.parentNode)   canvas.parentNode.removeChild(canvas);
      if (tooltip.parentNode)  tooltip.parentNode.removeChild(tooltip);
    };
  }, [carte, simulationRef, estSombre]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// MarqueurAnomalie — react-leaflet Marker avec popup d'information complète
// ─────────────────────────────────────────────────────────────────────────────

function MarqueurAnomalie({ anomalie, estSombre }) {
  const latLng = useMemo(() => positionSure(anomalie?.position), [anomalie?.position]);
  const icone  = useMemo(
    () => construireIconeAnomalie(anomalie?.priority ?? 'info', estSombre),
    [anomalie?.priority, estSombre],
  );

  if (!latLng || !anomalie) return null;

  const heure = (() => {
    try {
      return new Date(anomalie.timestamp).toLocaleTimeString('fr-MG', {
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return anomalie.time ?? '--:--'; }
  })();

  const badgesCouleurs = {
    critical: { fond: '#FEE2E2', texte: '#991B1B', label: 'Critique' },
    warning:  { fond: '#FEF3C7', texte: '#92400E', label: 'Avertissement' },
    info:     { fond: '#DBEAFE', texte: '#1E40AF', label: 'Information' },
  };
  const badge = badgesCouleurs[anomalie.priority] ?? badgesCouleurs.info;

  return (
    <Marker position={latLng} icon={icone}>
      <Popup minWidth={240} maxWidth={310} className="popup-mlam">
        <div style={{ fontFamily: 'Inter,system-ui,sans-serif' }}>

          {/* En-tête */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748B' }}>
              Anomalie — Fianarantsoa
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: badge.fond, color: badge.texte }}>
              {badge.label}
            </span>
          </div>

          {/* Description */}
          <p style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.45 }}>
            {anomalie.description?.slice(0, 90) ?? 'Incident detecte'}
            {(anomalie.description?.length ?? 0) > 90 ? '...' : ''}
          </p>

          {/* Tableau de métadonnées */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              {[
                ['Capteur',   anomalie.sensor],
                ['Zone',      anomalie.zone],
                ['Reference', anomalie.id],
                ['Heure',     heure],
              ].map(([cle, valeur]) => (
                <tr key={cle}>
                  <td style={{ color: '#94A3B8', padding: '2px 0', width: '36%' }}>{cle}</td>
                  <td style={{ fontWeight: 600, color: '#334155' }}>{valeur ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Popup>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal — CityMap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CityMap
 *
 * Props :
 *   simulationRef  — ref vers { vehicles[] } lue par le canvas à 60 FPS
 *   anomalies      — tableau d'anomalies (React state depuis useCitySimulation)
 *   zoom           — zoom Leaflet initial (défaut 14)
 */
export default function CityMap({ simulationRef, anomalies, zoom = ZOOM_INITIAL }) {
  const { isDark } = useTheme();

  // Filtrage défensif : on ne passe à Leaflet que les anomalies avec position valide
  const anomaliesSures = useMemo(() =>
    (Array.isArray(anomalies) ? anomalies : [])
      .filter(a => a && positionSure(a.position))
      .slice(0, MAX_ANOMALIES),
    [anomalies],
  );

  return (
    <>
      {/* Styles globaux injectés une seule fois */}
      <style>{`
        @keyframes pulseMlam {
          0%,100% { opacity:.65; transform:scale(1);    }
          50%      { opacity:0;   transform:scale(1.65); }
        }
        .popup-mlam .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 6px 30px rgba(0,0,0,.18);
          border: 1px solid #E2E8F0;
          padding: 0;
        }
        .popup-mlam .leaflet-popup-content {
          margin: 13px 15px;
        }
        .popup-mlam a.leaflet-popup-close-button {
          font-size: 16px;
          color: #94A3B8;
          top: 6px;
          right: 8px;
        }
        .leaflet-tile { transition: filter .4s ease; }
      `}</style>

      <MapContainer
        center={CITY_CENTER}
        zoom={zoom}
        scrollWheelZoom
        className="w-full h-full"
        attributionControl={false}
      >
        {/* Filtre sombre sur le pane des tuiles */}
        <FiltreModesSombre estSombre={isDark} />

        {/* Tuiles OpenStreetMap */}
        <TileLayer url={URL_TUILES} maxZoom={19} />

        {/* Axes routiers — dessinés une seule fois, jamais re-rendus */}
        {Object.entries(POLYLIGNES).map(([cle, route]) => (
          <Polyline
            key={cle}
            positions={route.coords}
            pathOptions={{
              color:     route.couleur,
              weight:    2.5,
              opacity:   isDark ? 0.7 : 0.6,
              dashArray: '7 5',
            }}
          />
        ))}

        {/* Canvas des véhicules — 150+ agents, 60 FPS, zéro re-render React */}
        <CoucheCanvasVehicules simulationRef={simulationRef} estSombre={isDark} />

        {/* Marqueurs d'anomalies — react-leaflet standard (< 25 actifs) */}
        {anomaliesSures.map(a => (
          <MarqueurAnomalie key={a.id} anomalie={a} estSombre={isDark} />
        ))}
      </MapContainer>
    </>
  );
}
