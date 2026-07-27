/**
 * anomalyEngine.js  —  src/hooks/anomalyEngine.js
 * M'LAM Mikolo's Learned App Monitoring — Fianarantsoa, Madagascar
 *
 * Module dedie a la generation d'anomalies geo-localisees par segment
 * et au calcul de leur impact sur la vitesse des vehicules.
 *
 * Concept cle : segmentId
 *   Chaque anomalie est rattachee a un identifiant unique de segment :
 *   `${cleRoute}#${segIdx}` (ex: "RN7#42").
 *   Un vehicule subit le ralentissement si son segIdx courant correspond
 *   au segment de l'anomalie active, sur le meme axe.
 *
 * A importer dans useCitySimulation.js :
 *   import {
 *     tenterDeclenchementAnomalie,
 *     calculerFacteurRalentissement,
 *     nettoyerAnomaliesExpirees,
 *     getSimulationReport,
 *   } from './anomalyEngine';
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Probabilite de declenchement d'une anomalie aleatoire par tick lent (2.5s). */
const PROBABILITE_DECLENCHEMENT = 0.18;

/** Diviseur de vitesse applique aux vehicules sur un segment impacte. */
const DIVISEUR_VITESSE_IMPACT = 4;

/** Duree de vie d'une anomalie active avant expiration automatique (ms). */
const DUREE_VIE_ANOMALIE_MS = 45_000;

/** Capteurs et zones realistes pour Fianarantsoa, associes par type d'axe. */
const SCENARIOS_PAR_AXE = {
  RN7: [
    { type: 'embouteillage', label: 'Embouteillage majeur',        priorite: 'critical', sensorPrefix: 'CAP-TRF' },
    { type: 'embouteillage', label: 'Ralentissement pres Gare FCE', priorite: 'warning',  sensorPrefix: 'CAP-TRF' },
    { type: 'accident',      label: 'Collision signalee',           priorite: 'critical', sensorPrefix: 'CAP-TRF' },
  ],
  N42: [
    { type: 'embouteillage', label: 'Trafic dense N42',             priorite: 'warning',  sensorPrefix: 'CAP-TRF' },
    { type: 'pollution',     label: 'Pic de pollution zone Anjoma',  priorite: 'warning',  sensorPrefix: 'CAP-ENV' },
  ],
  HAUTE_VILLE: [
    { type: 'embouteillage', label: 'File de vehicules en montee',  priorite: 'warning',  sensorPrefix: 'CAP-TRF' },
  ],
  GARE_TSIANOLONDROA: [
    { type: 'embouteillage', label: 'Affluence Gare FCE',           priorite: 'warning',  sensorPrefix: 'CAP-TRF' },
    { type: 'pollution',     label: 'Pic de pollution industrielle', priorite: 'warning',  sensorPrefix: 'CAP-ENV' },
  ],
  BERAVINA: [
    { type: 'pollution',     label: 'Pic de pollution zone Beravina', priorite: 'info',    sensorPrefix: 'CAP-ENV' },
  ],
  DEFAULT: [
    { type: 'embouteillage', label: 'Ralentissement local',          priorite: 'warning',  sensorPrefix: 'CAP-TRF' },
    { type: 'pollution',     label: 'Niveau de pollution eleve',     priorite: 'info',     sensorPrefix: 'CAP-ENV' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires
// ─────────────────────────────────────────────────────────────────────────────

function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/** Construit l'identifiant unique d'un segment : "RN7#42". */
export function construireSegmentId(cleRoute, segIdx) {
  return `${cleRoute}#${segIdx}`;
}

let compteurAlerte = 1;

function fabriquerAlerte(scenario, cleRoute, segmentId, position) {
  return {
    id:          `ALT-FKT-${String(compteurAlerte++).padStart(3, '0')}`,
    priority:    scenario.priorite,
    type:        scenario.type,
    time:        new Date().toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit' }),
    sensor:      `${scenario.sensorPrefix}-${rndInt(10, 99)}`,
    zone:        cleRoute.replace(/_/g, ' '),
    description: `${scenario.label} detecte sur l'axe ${cleRoute.replace(/_/g, ' ')}, Fianarantsoa. ` +
                 (scenario.type === 'embouteillage' || scenario.type === 'accident'
                   ? `Vitesse de circulation reduite sur le segment ${segmentId}.`
                   : `Surveillance environnementale renforcee dans le secteur.`),
    position,
    segmentId,        // Cle technique : lie l'anomalie a un segment precis
    reported:    false,
    timestamp:   new Date().toISOString(),
    expireAt:    Date.now() + DUREE_VIE_ANOMALIE_MS,  // Expiration automatique
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Generateur d'anomalies aleatoires
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tente de declencher une anomalie aleatoire sur l'un des axes disponibles.
 * Appele a chaque tick lent (toutes les 2.5 s) — probabilite faible par appel.
 *
 * @param {object} routesDict — { cleRoute: [[lat,lng], ...], ... }
 * @returns {object|null} — nouvelle anomalie ou null si rien ne se declenche
 */
export function tenterDeclenchementAnomalie(routesDict) {
  if (Math.random() >= PROBABILITE_DECLENCHEMENT) return null;

  const cles = Object.keys(routesDict ?? {}).filter(
    cle => Array.isArray(routesDict[cle]) && routesDict[cle].length >= 2
  );
  if (cles.length === 0) return null;

  const cleRoute = cles[rndInt(0, cles.length - 1)];
  const coords   = routesDict[cleRoute];
  const segIdx   = rndInt(0, coords.length - 2); // segment entre [segIdx, segIdx+1]
  const position = coords[segIdx];

  const scenarios = SCENARIOS_PAR_AXE[cleRoute] ?? SCENARIOS_PAR_AXE.DEFAULT;
  const scenario  = scenarios[rndInt(0, scenarios.length - 1)];

  const segmentId = construireSegmentId(cleRoute, segIdx);

  return fabriquerAlerte(scenario, cleRoute, segmentId, position);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Impact sur le trafic — calcul du facteur de ralentissement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Construit un index rapide { segmentId: anomalie } a partir de la liste
 * d'anomalies actives. A reconstruire une fois par tick (pas par vehicule)
 * pour eviter un .find() en O(n) sur chaque vehicule a chaque frame.
 *
 * @param {Array} anomalies — liste des anomalies actives (non expirees)
 * @returns {Map<string, object>}
 */
export function construireIndexSegmentsImpactes(anomalies) {
  const index = new Map();
  (anomalies ?? []).forEach(a => {
    if (!a?.segmentId) return;
    if (a.type !== 'embouteillage' && a.type !== 'accident') return; // pollution n'affecte pas la vitesse
    index.set(a.segmentId, a);
  });
  return index;
}

/**
 * Calcule le facteur multiplicatif de vitesse pour un vehicule donne.
 * Retourne 1.0 si aucun impact, ou 1 / DIVISEUR_VITESSE_IMPACT si le vehicule
 * se trouve actuellement sur un segment impacte par une anomalie active.
 *
 * @param {string} cleRoute — axe du vehicule (v.cleRoute)
 * @param {number} segIdx   — segment courant du vehicule (v.segIdx)
 * @param {Map}    indexSegmentsImpactes — issu de construireIndexSegmentsImpactes()
 * @returns {number} — facteur dans [1/DIVISEUR_VITESSE_IMPACT, 1]
 */
export function calculerFacteurRalentissement(cleRoute, segIdx, indexSegmentsImpactes) {
  if (!indexSegmentsImpactes || indexSegmentsImpactes.size === 0) return 1;
  const segmentId = construireSegmentId(cleRoute, segIdx);
  return indexSegmentsImpactes.has(segmentId) ? 1 / DIVISEUR_VITESSE_IMPACT : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nettoyage des anomalies expirees
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtre les anomalies dont la duree de vie est depassee.
 * A appeler a chaque tick lent avant de recalculer l'index des segments.
 *
 * @param {Array} anomalies
 * @returns {Array} — anomalies encore actives
 */
export function nettoyerAnomaliesExpirees(anomalies) {
  const maintenant = Date.now();
  return (anomalies ?? []).filter(a => {
    // Anomalies sans expireAt (creees avant cette fonctionnalite) restent actives
    if (!a?.expireAt) return true;
    return a.expireAt > maintenant;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Snapshot textuel pour l'IA — getSimulationReport()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compile un resume textuel brut de l'etat courant de la simulation,
 * destine a etre envoye en entree du service Gemini (aiService.js).
 *
 * Format volontairement dense et factuel — pas de mise en forme Markdown,
 * pour rester compatible avec le prompt systeme M'LAM deja en place.
 *
 * @param {object} sim — simulationRef.current { vehicles[], anomalies[], metriques }
 * @returns {string}
 */
export function getSimulationReport(sim) {
  if (!sim) return 'Aucune donnee de simulation disponible.';

  const vehicules  = Array.isArray(sim.vehicles)  ? sim.vehicles  : [];
  const anomalies  = Array.isArray(sim.anomalies) ? sim.anomalies : [];
  const metriques  = sim.metriques ?? {};

  const nbVehicules   = vehicules.length;
  const nbArretes     = vehicules.filter(v => v?.arrete).length;
  const nbChocs       = vehicules.filter(v => v?.chocDetecte).length;

  // Regroupement des anomalies actives par type et par axe
  const embouteillages = anomalies.filter(a => a.type === 'embouteillage');
  const accidents       = anomalies.filter(a => a.type === 'accident');
  const pollutions       = anomalies.filter(a => a.type === 'pollution');

  const axesEmbouteilles = [...new Set(embouteillages.map(a => a.zone))].join(', ') || 'aucun';
  const axesAccidentes   = [...new Set(accidents.map(a => a.zone))].join(', ') || 'aucun';
  const axesPollues      = [...new Set(pollutions.map(a => a.zone))].join(', ') || 'aucun';

  const co2  = metriques.co2?.value  ?? 'N/A';
  const pm25 = metriques.pm25?.value ?? 'N/A';
  const traf = metriques.traffic?.value ?? 'N/A';

  return [
    `RAPPORT INSTANTANE — M'LAM Fianarantsoa, ${new Date().toLocaleString('fr-MG')}`,
    ``,
    `TRAFIC : ${nbVehicules} vehicules actifs sur le reseau. ${nbArretes} immobilises, ${nbChocs} en alerte choc.`,
    `DENSITE TRAFIC GLOBALE : ${traf}%.`,
    ``,
    `ANOMALIES ACTIVES : ${anomalies.length} au total.`,
    `- Embouteillages : ${embouteillages.length} detecte(s) — axes concernes : ${axesEmbouteilles}.`,
    `- Accidents : ${accidents.length} detecte(s) — axes concernes : ${axesAccidentes}.`,
    `- Pics de pollution : ${pollutions.length} detecte(s) — secteurs concernes : ${axesPollues}.`,
    ``,
    `QUALITE DE L'AIR : CO2 ${co2} ppm, PM2.5 ${pm25} µg/m3.`,
  ].join('\n');
}
