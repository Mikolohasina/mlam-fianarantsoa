/**
 * useCitySimulation.js  —  src/hooks/useCitySimulation.js
 * M'LAM M'ikolo's Learned App Monitoring — Fianarantsoa, Madagascar
 *
 * Routes chargees dynamiquement depuis /public/data/routes_output.json
 * via fetch au montage. Tant que le chargement est en cours, la simulation
 * tourne avec une flotte vide — aucun crash, aucun re-render bloquant.
 *
 * Architecture a deux flux (inchangee depuis la version precedente) :
 *   simulationRef.current.vehicles — mute a 60 FPS via requestAnimationFrame,
 *   jamais copie dans useState. Lu directement par le canvas de CityMap.jsx.
 *
 *   metrics / anomalies / kpis — React state, commit toutes les 2.5 s.
 */

import { useState, useEffect, useRef, useCallback } from 'react';


/** Statuts possibles d'un vehicule. */
const STATUT_DRIVING = 'DRIVING';
const STATUT_PARKED  = 'PARKED';

const TYPES_MISSION = {
  SCHOOL_DROP:      { label: 'Depose scolaire',            dureeMin: 15,  dureeMax: 40  },
  WORK_COMMUTE:     { label: 'Trajet domicile-travail',    dureeMin: 180, dureeMax: 480 },
  MEDICAL_VISIT:    { label: 'Visite medicale',            dureeMin: 60,  dureeMax: 150 },
  MARKET_STOP:      { label: 'Arret marche',               dureeMin: 20,  dureeMax: 60  },
  PASSENGER_PICKUP: { label: 'Prise en charge passager',   dureeMin: 5,   dureeMax: 15  },
  HOME_RETURN:      { label: 'Retour domicile',            dureeMin: 240, dureeMax: 600 },
  PATROL:           { label: 'Patrouille',                 dureeMin: 10,  dureeMax: 30  },
  SERVICE_STOP:     { label: 'Arret de service',           dureeMin: 30,  dureeMax: 90  },
};

const SEQUENCE_MISSIONS_PAR_TYPE = {
  TAXIBE:      ['SERVICE_STOP', 'PASSENGER_PICKUP'],
  TAXI:        ['PASSENGER_PICKUP', 'MARKET_STOP', 'MEDICAL_VISIT'],
  MOTO:        ['PASSENGER_PICKUP', 'MARKET_STOP'],
  PARTICULIER: ['SCHOOL_DROP', 'WORK_COMMUTE', 'MARKET_STOP', 'HOME_RETURN'],
  SECOURS:     ['PATROL', 'SERVICE_STOP'],
};

function rndInt2(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genererMission(typeVehicule, seqIdx) {
  const sequence    = SEQUENCE_MISSIONS_PAR_TYPE[typeVehicule] ?? ['SERVICE_STOP'];
  const idx         = seqIdx % sequence.length;
  const missionType = sequence[idx];
  const config      = TYPES_MISSION[missionType] ?? TYPES_MISSION.SERVICE_STOP;
  return {
    missionType,
    label:          config.label,
    duree:          rndInt2(config.dureeMin, config.dureeMax),
    prochainSeqIdx: idx + 1,
  };
}

function choisirProchainAxe(routesDict, cleRouteActuelle) {
  const cles = Object.keys(routesDict ?? {}).filter(
    cle => Array.isArray(routesDict[cle]) && routesDict[cle].length >= 2
  );
  if (cles.length <= 1) return cleRouteActuelle;
  const autresCles = cles.filter(c => c !== cleRouteActuelle);
  return autresCles[rndInt2(0, autresCles.length - 1)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

export const CITY_CENTER                    = [-21.4526, 47.0857];
const URL_ROUTES                            = '/data/routes_output.json';
const DEG_PAR_KM                            = 1 / 111;
const INTERVALLE_TICK_LENT_MS               = 2500;
const MAX_ANOMALIES                         = 25;
const COULEUR_NEUTRE                        = '#94A3B8';
const COULEUR_ALERTE_CRITIQUE               = '#EF4444';
const COULEUR_ALERTE_WARNING                = '#F97316';

const PROBABILITE_ACCIDENT_PAR_TICK         = 0.05;
const MAX_ACCIDENTS_SIMULTANES              = 1;
const DUREE_ACCIDENT_MIN_MS                 = 8000;
const DUREE_ACCIDENT_MAX_MS                 = 15000;

const CONGESTION_NIVEAU_MAX                     = 8;
const AJUSTEMENT_CONGESTION_INTERVALLE_MIN_MS   = 10000;
const AJUSTEMENT_CONGESTION_INTERVALLE_MAX_MS   = 15000;

const INTERVALLE_POLLUTION_MIN_MS           = 30000;
const INTERVALLE_POLLUTION_MAX_MS           = 45000;
const TAUX_ACCUMULATION_POLLUTION           = 0.30;
const TAUX_DISSIPATION_POLLUTION            = 0.12;
const SEUIL_POLLUTION_ANOMALIE              = 65;
const CAUSES_POLLUTION = [
  "Incinération sauvage d'ordures ménagères et déchets plastiques dans le quartier.",
  "Émissions industrielles diffuses et fumées d'ateliers de briqueterie/combustion.",
  "Accumulation de gaz d'échappement (vieux moteurs Diesel et gaz de Taxibe) couplée à une absence de vent.",
  "Embouteillage persistant generant une accumulation prolongee de gaz d'echappement.",
];

function tirerCausePollution() {
  return CAUSES_POLLUTION[rndInt2(0, CAUSES_POLLUTION.length - 1)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Types de vehicules
// ─────────────────────────────────────────────────────────────────────────────

const TYPES_VEHICULES = {
  TAXIBE:      { label: 'Taxi-be',     vitesseMin: 10, vitesseMax: 38, chocChance: 0.0012, arretChance: 0.07,  taille: 5, couleur: '#FBBF24' },
  TAXI:        { label: 'Taxi',        vitesseMin: 15, vitesseMax: 54, chocChance: 0.0022, arretChance: 0.035, taille: 4, couleur: '#60A5FA' },
  MOTO:        { label: 'Moto',        vitesseMin: 18, vitesseMax: 72, chocChance: 0.005,  arretChance: 0.012, taille: 3, couleur: '#34D399' },
  PARTICULIER: { label: 'Particulier', vitesseMin: 12, vitesseMax: 48, chocChance: 0.0028, arretChance: 0.025, taille: 4, couleur: '#A78BFA' },
  SECOURS:     { label: 'Secours',     vitesseMin: 40, vitesseMax: 88, chocChance: 0.0004, arretChance: 0.004, taille: 5, couleur: '#F87171' },
};

const TYPE_KEYS = Object.keys(TYPES_VEHICULES);

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires pures
// ─────────────────────────────────────────────────────────────────────────────

function rnd(min, max)        { return Math.random() * (max - min) + min; }
function rndInt(min, max)     { return Math.floor(rnd(min, max + 1)); }
function lerp(a, b, t)        { return a + (b - a) * t; }
function clamp(v, min, max)   { return Math.max(min, Math.min(max, v)); }
function jitter(base, delta, min, max) { return clamp(base + (Math.random() * 2 - 1) * delta, min, max); }
function calcStatut(v, warn, crit)     { return v >= crit ? 'critical' : v >= warn ? 'elevated' : 'ok'; }

function longueurSegment(a, b) {
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function calculerFacteurRalentissement(cleRoute, segIdx, indexSegmentsImpactes) {
  if (!indexSegmentsImpactes || !indexSegmentsImpactes[cleRoute]) return 1.0;
  if (indexSegmentsImpactes[cleRoute].includes(segIdx)) return 0.25;
  return 1.0;
}

function normaliserRoutes(data) {
  const sortie = {};
  if (!data || typeof data !== 'object') return sortie;

  if (Array.isArray(data.rn7) && data.rn7.length > 0) {
    sortie.RN7 = data.rn7;
  }

  if (data.axes_secondaires && !Array.isArray(data.axes_secondaires)) {
    Object.entries(data.axes_secondaires).forEach(([cle, coords]) => {
      if (Array.isArray(coords) && coords.length >= 2) {
        sortie[cle.toUpperCase()] = coords;
      }
    });
  }

  if (Array.isArray(data.axes_secondaires)) {
    data.axes_secondaires.forEach((coords, i) => {
      if (Array.isArray(coords) && coords.length >= 2) {
        sortie[`AXE_SEC_${i + 1}`] = coords;
      }
    });
  }

  Object.entries(data).forEach(([cle, valeur]) => {
    if (cle === 'rn7' || cle === 'axes_secondaires') return;
    if (Array.isArray(valeur) && valeur.length >= 2 && Array.isArray(valeur[0])) {
      sortie[cle.toUpperCase()] = valeur;
    }
  });

  return sortie;
}

function nomDestination(cleRoute, dernierPoint) {
  const labels = {
    RN7:                'Terminus RN7',
    N42:                'Terminus N42',
    HAUTE_VILLE:        'Cathedrale Saint-Laurent',
    GARE_TSIANOLONDROA: 'Tsianolondroa',
    BERAVINA:           'Zone Beravina',
    ROUTE_CIRCULAIRE:   'Boucle Circulaire',
  };
  return labels[cleRoute] ?? `Point ${dernierPoint?.[0]?.toFixed(3) ?? ''}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialisation des métriques
// ─────────────────────────────────────────────────────────────────────────────

function construireMetriques() {
  const horodatage = new Date().toISOString();
  return {
    co2: {
      id: 'co2', name: 'Dioxyde de carbone',
      value: 400, max: 800, unit: 'ppm', fill: 50, status: 'ok', updatedAt: horodatage,
    },
    pm25: {
      id: 'pm25', name: 'Particules fines PM2.5',
      value: 12.0, max: 50, unit: 'µg/m³', fill: 24, status: 'ok', updatedAt: horodatage,
    },
    traffic: {
      id: 'traffic', name: 'Taux de Congestion',
      value: 35, max: 100, unit: '%', fill: 35, status: 'ok', updatedAt: horodatage,
    },
  };
}

function construireVehicules(routesDict, nombreTotal = 150) {
  const clesValides = Object.keys(routesDict).filter(
    cle => Array.isArray(routesDict[cle]) && routesDict[cle].length >= 2
  );
  if (clesValides.length === 0) return [];

  const vehicules  = [];
  let idCompteur   = 0;
  const poids      = clesValides.map(cle => (cle === 'RN7' ? 3 : 1));
  const poidsTotal = poids.reduce((a, b) => a + b, 0);

  clesValides.forEach((cleRoute, idxAxe) => {
    const coords     = routesDict[cleRoute];
    const nbSegments = coords.length - 1;
    if (nbSegments < 1) return;

    const partVehicules = Math.max(3, Math.round((poids[idxAxe] / poidsTotal) * nombreTotal));

    for (let i = 0; i < partVehicules; i++) {
      const typeKey    = TYPE_KEYS[rndInt2(0, TYPE_KEYS.length - 1)];
      const type       = TYPES_VEHICULES[typeKey];
      const progression = i / partVehicules;
      const posBrute    = progression * nbSegments;
      const segIdx      = clamp(Math.floor(posBrute), 0, nbSegments - 1);
      const segT        = clamp(posBrute - segIdx, 0, 1);
      const a           = coords[segIdx];
      const b           = coords[Math.min(segIdx + 1, coords.length - 1)];
      const mission0    = genererMission(typeKey, 0);

      vehicules.push({
        id:           idCompteur++,
        typeKey,
        typeLabel:    type.label,
        couleur:      COULEUR_NEUTRE,
        couleurBase:  COULEUR_NEUTRE,
        enAlerte:     null,
        taille:       type.taille,
        cleRoute,
        labelRoute:   cleRoute.replace(/_/g, ' '),
        segIdx,
        segT,
        avance:       true,
        lat:          lerp(a[0], b[0], segT),
        lng:          lerp(a[1], b[1], segT),
        vitesseKmh:   rnd(type.vitesseMin, type.vitesseMax),
        arrete:       false,
        dureeArretMs: 0,
        chocDetecte:  false,
        status:       STATUT_DRIVING,
        missionSeqIdx: mission0.prochainSeqIdx,
        currentMission: {
          type:                  mission0.missionType,
          durationAtDestination: mission0.duree,
          parkingTimer:          0,
        },
        mission:     `${type.label} : ${mission0.label} — ${cleRoute.replace(/_/g, ' ')}`,
        destination: nomDestination(cleRoute, coords[coords.length - 1]),
        phaseTrajet: 0,
      });
    }
  });

  return vehicules;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fabrique d'anomalies
// ─────────────────────────────────────────────────────────────────────────────

let compteurAnomalie = 1;

function creerAnomalie(priorite, capteur, zone, description, lat, lng) {
  return {
    id:        `ALT-FKT-${String(compteurAnomalie++).padStart(3, '0')}`,
    priority:  priorite,
    time:      new Date().toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit' }),
    sensor:    capteur,
    zone,
    description,
    position:  [lat, lng],
    reported:  false,
    timestamp: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Moteur d'avancement LERP
// ─────────────────────────────────────────────────────────────────────────────

function avancerVehicule(v, deltaSecondes, routesDict, indexSegmentsImpactes) {

  // ── ETAT PARKED ───────────────────────────────────────────────────────────
  if (v.status === STATUT_PARKED) {
    v.currentMission.parkingTimer += deltaSecondes;
    if (v.currentMission.parkingTimer >= v.currentMission.durationAtDestination) {
      const type    = TYPES_VEHICULES[v.typeKey] ?? TYPES_VEHICULES.PARTICULIER;
      const mission = genererMission(v.typeKey, v.missionSeqIdx);
      const nouvelAxe = choisirProchainAxe(routesDict, v.cleRoute);
      const coords    = routesDict?.[nouvelAxe];

      if (Array.isArray(coords) && coords.length >= 2) {
        v.cleRoute   = nouvelAxe;
        v.labelRoute = nouvelAxe.replace(/_/g, ' ');
        v.segIdx     = 0;
        v.segT       = 0;
        v.avance     = true;
        v.lat        = coords[0][0];
        v.lng        = coords[0][1];
        v.destination = nomDestination(nouvelAxe, coords[coords.length - 1]);
      }

      v.missionSeqIdx  = mission.prochainSeqIdx;
      v.currentMission = {
        type:                  mission.missionType,
        durationAtDestination: mission.duree,
        parkingTimer:          0,
      };
      v.mission    = `${type.label} : ${mission.label} — ${v.labelRoute}`;
      v.status     = STATUT_DRIVING;
      v.vitesseKmh = rnd(type.vitesseMin, type.vitesseMax);
      v.arrete     = false;
    }
    return null;
  }

  // ── ETAT DRIVING ──────────────────────────────────────────────────────────
  const coords = routesDict?.[v?.cleRoute];
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const type       = TYPES_VEHICULES[v.typeKey] ?? TYPES_VEHICULES.PARTICULIER;
  const nbSegments = coords.length - 1;

  if (!v.arrete) {
    if (Math.random() < type.arretChance * deltaSecondes * 3) {
      v.arrete       = true;
      v.dureeArretMs = 0;
    }
  } else {
    v.dureeArretMs += deltaSecondes * 1000;
    const dureeMax = v.enAlerte === 'critical'
      ? rnd(DUREE_ACCIDENT_MIN_MS, DUREE_ACCIDENT_MAX_MS)
      : (type.arretChance > 0.05 ? rnd(1200, 4000) : rnd(2500, 8000));

    if (v.dureeArretMs >= dureeMax) {
      v.arrete       = false;
      v.dureeArretMs = 0;
      v.chocDetecte  = false;
      if (v.enAlerte) { v.enAlerte = null; v.couleur = v.couleurBase; }
      v.vitesseKmh = jitter(v.vitesseKmh, 8, type.vitesseMin, type.vitesseMax);
    } else {
      return null;
    }
  }

  const facteurRalentissement = calculerFacteurRalentissement(v.cleRoute, v.segIdx, indexSegmentsImpactes);
  const vitesseEffectiveKmh   = v.vitesseKmh * facteurRalentissement;
  const vitesseDegSec         = (vitesseEffectiveKmh * DEG_PAR_KM) / 3600;

  let distanceRestante = Math.min(vitesseDegSec * deltaSecondes, (nbSegments * 1.5) / 100);
  let segIdx = v.segIdx;
  let segT   = v.segT;
  let avance = v.avance;

  for (let iter = 0; iter < 4 && distanceRestante > 1e-10; iter++) {
    const iA = clamp(segIdx,     0, coords.length - 1);
    const iB = clamp(segIdx + 1, 0, coords.length - 1);
    const a  = coords[iA];
    const b  = coords[iB];
    if (!a || !b) break;

    const longueur = longueurSegment(a, b);
    if (longueur < 1e-10) {
      segIdx = avance ? segIdx + 1 : segIdx - 1;
      segT   = avance ? 0 : 1;
      break;
    }

    const dt = distanceRestante / longueur;

    if (avance) {
      segT += dt;
      if (segT >= 1) {
        distanceRestante = (segT - 1) * longueur;
        segT   = 0;
        segIdx++;
        if (segIdx >= nbSegments) {
          segIdx = nbSegments - 1;
          segT   = 1;
          v.lat  = coords[coords.length - 1][0];
          v.lng  = coords[coords.length - 1][1];
          v.status  = STATUT_PARKED;
          v.arrete  = true;
          v.segIdx  = segIdx;
          v.segT    = segT;
          v.mission = `${v.typeLabel} : Gare — ${v.destination}`.trim();
          return null;
        }
      } else {
        distanceRestante = 0;
      }
    } else {
      segT -= dt;
      if (segT <= 0) {
        distanceRestante = Math.abs(segT) * longueur;
        segT   = 1;
        segIdx--;
        if (segIdx < 0) { segIdx = 0; segT = 0; avance = true; distanceRestante = 0; }
      } else {
        distanceRestante = 0;
      }
    }
  }

  const iAFinal = clamp(segIdx,     0, coords.length - 1);
  const iBFinal = clamp(segIdx + 1, 0, coords.length - 1);
  const aFinal  = coords[iAFinal];
  const bFinal  = coords[iBFinal];

  if (aFinal && bFinal) {
    const t = clamp(segT, 0, 1);
    v.lat   = lerp(aFinal[0], bFinal[0], t);
    v.lng   = lerp(aFinal[1], bFinal[1], t);
  }

  v.segIdx     = clamp(segIdx, 0, nbSegments - 1);
  v.segT       = clamp(segT, 0, 1);
  v.avance     = avance;
  v.vitesseKmh = jitter(v.vitesseKmh, 0.4, type.vitesseMin, type.vitesseMax);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulateurs centralises
// ─────────────────────────────────────────────────────────────────────────────

function verifierAccidentRare(sim) {
  const actifs = sim.vehicles.filter(v => v.enAlerte === 'critical').length;
  if (actifs >= MAX_ACCIDENTS_SIMULTANES) return null;
  if (Math.random() >= PROBABILITE_ACCIDENT_PAR_TICK) return null;

  const candidats = sim.vehicles.filter(v => v.status === STATUT_DRIVING && !v.enAlerte);
  if (candidats.length === 0) return null;

  const v = candidats[rndInt2(0, candidats.length - 1)];
  v.enAlerte     = 'critical';
  v.couleur      = COULEUR_ALERTE_CRITIQUE;
  v.arrete       = true;
  v.dureeArretMs = 0;
  v.chocDetecte  = true;

  return creerAnomalie(
    'critical',
    `CAP-TRF-${String(v.id % 99).padStart(2, '0')}`,
    v.labelRoute,
    `Accident detecte : ${v.typeLabel} — choc enregistre par capteur embarque. ` +
    `Vitesse avant impact : ${Math.round(v.vitesseKmh)} km/h. ` +
    `Mission : ${v.mission}. Axe : ${v.labelRoute}, Fianarantsoa.`,
    v.lat, v.lng,
  );
}

function ajusterCongestion(sim, maintenant, refs) {
  const intervalleCible = rnd(AJUSTEMENT_CONGESTION_INTERVALLE_MIN_MS, AJUSTEMENT_CONGESTION_INTERVALLE_MAX_MS);
  if (maintenant - refs.dernierAjustementCongestion.current < intervalleCible) return null;
  refs.dernierAjustementCongestion.current = maintenant;

  const direction   = Math.random() < 0.5 ? -1 : 1;
  const niveauAvant = refs.congestionNiveau.current;
  refs.congestionNiveau.current = clamp(niveauAvant + direction, 0, CONGESTION_NIVEAU_MAX);
  const augmente = refs.congestionNiveau.current > niveauAvant;

  const vehiculesEnWarning = sim.vehicles.filter(v => v.enAlerte === 'warning');

  if (augmente) {
    const bassinPrioritaire = sim.vehicles.filter(v => v.status === STATUT_DRIVING && v.arrete && !v.enAlerte);
    const bassin = bassinPrioritaire.length > 0
      ? bassinPrioritaire
      : sim.vehicles.filter(v => v.status === STATUT_DRIVING && !v.enAlerte);

    if (bassin.length === 0) return null;

    const v = bassin[rndInt2(0, bassin.length - 1)];
    v.enAlerte = 'warning';
    v.couleur  = COULEUR_ALERTE_WARNING;
    if (!v.arrete) { v.arrete = true; v.dureeArretMs = 0; }

    return creerAnomalie(
      'warning',
      `CAP-TRF-${String(v.id % 99).padStart(2, '0')}`,
      v.labelRoute,
      `${v.typeLabel} immobilise — accumulation de trafic. Axe : ${v.labelRoute}, Fianarantsoa.`,
      v.lat, v.lng,
    );
  }

  if (vehiculesEnWarning.length > 0) {
    const v = vehiculesEnWarning[rndInt2(0, vehiculesEnWarning.length - 1)];
    v.enAlerte     = null;
    v.couleur      = v.couleurBase;
    v.arrete       = false;
    v.dureeArretMs = 0;
  }

  return null;
}

function ajusterPollutionParAxe(sim) {
  const routesDict = sim.routes ?? {};
  const vehicules  = sim.vehicles ?? [];

  const statsParAxe = {};
  for (const v of vehicules) {
    if (!v?.cleRoute) continue;
    const s = statsParAxe[v.cleRoute] ?? (statsParAxe[v.cleRoute] = { total: 0, bloques: 0, alertes: 0 });
    s.total++;
    if (v.arrete)   s.bloques++;
    if (v.enAlerte) s.alertes++;
  }

  let axeLePlusPollue = null;
  let indiceMax       = -1;

  for (const cle of Object.keys(routesDict)) {
    const coords = routesDict[cle];
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const s            = statsParAxe[cle] ?? { total: 0, bloques: 0, alertes: 0 };
    const ratioBloques = s.total > 0 ? s.bloques / s.total : 0;
    const bonusAlerte  = s.total > 0 ? (s.alertes / s.total) * 0.5 : 0;
    const cible        = clamp((ratioBloques + bonusAlerte) * 100, 0, 100);

    const actuel = coords.pollutionIndex ?? 0;
    const delta  = cible > actuel
      ? (cible - actuel) * TAUX_ACCUMULATION_POLLUTION
      : (cible - actuel) * TAUX_DISSIPATION_POLLUTION;

    coords.pollutionIndex = clamp(actuel + delta, 0, 100);

    if (coords.pollutionIndex > indiceMax) {
      indiceMax       = coords.pollutionIndex;
      axeLePlusPollue = cle;
    }
  }

  return { axeLePlusPollue, indiceMax: Math.max(0, indiceMax) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export default function useCitySimulation() {

  // ✅ FIX RACINE — le tick DOIT être déclaré ICI, à l'intérieur du hook
  const [tick, setTick] = useState(0);

  const congestionNiveau            = useRef(0);
  const dernierAjustementCongestion = useRef(performance.now());
  const dernierAjustementPollution  = useRef(performance.now());
  const intervalleProchainPollution = useRef(rnd(INTERVALLE_POLLUTION_MIN_MS, INTERVALLE_POLLUTION_MAX_MS));

  const simulationRef = useRef(null);
  if (simulationRef.current === null) {
    simulationRef.current = {
      vehicles:  [],
      routes:    {},
      metriques: construireMetriques(),
      anomalies: [],
    };
  }

  const [metrics,   setMetrics]   = useState(() => Object.values(construireMetriques()));
  const [anomalies, setAnomalies] = useState([]);
  const [kpis,      setKpis]      = useState({ vehicles: 0, accidents: 0, congestion: 0 });
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);

  const anomaliesEnAttente = useRef([]);
  const dernierTickLent    = useRef(performance.now());
  const derniereFrame      = useRef(performance.now());
  const rafId              = useRef(null);

  useEffect(() => {
    let annule = false;
    fetch(URL_ROUTES)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => {
        if (annule) return;
        const routesDict = normaliserRoutes(data);
        const nbAxes = Object.keys(routesDict).length;
        if (nbAxes === 0) {
          setLoadError('Aucun axe valide trouve dans routes_output.json.');
          setLoading(false);
          return;
        }
        const vehicules = construireVehicules(routesDict, 150);
        simulationRef.current.routes   = routesDict;
        simulationRef.current.vehicles = vehicules;
        setKpis({ vehicles: vehicules.length, accidents: 0, congestion: 0 });
        setLoading(false);
      })
      .catch(err => {
        if (!annule) {
          setLoadError(`Echec du chargement des routes : ${err.message}`);
          setLoading(false);
        }
      });
    return () => { annule = true; };
  }, []);

  // ── Boucle d'animation 60 FPS — TOURNE EN PERMANENCE, indépendante de l'onglet ──
  const animer = useCallback(() => {
    const maintenant = performance.now();
    const deltaSec    = clamp((maintenant - derniereFrame.current) / 1000, 0, 0.1);
    derniereFrame.current = maintenant;

    const sim = simulationRef.current;

    if (sim?.vehicles?.length > 0) {
      for (let i = 0; i < sim.vehicles.length; i++) {
        avancerVehicule(sim.vehicles[i], deltaSec, sim.routes);
      }
      // Signal léger 60 FPS — le canvas lit simulationRef directement (mutation),
      // ce tick sert uniquement à forcer React à re-render les composants CityMap
      // qui reçoivent `tick` en prop (utile pour les popups/tooltips React-Leaflet).
      setTick(t => (t + 1) & 0xFFFFFF);
    }

    if (maintenant - dernierTickLent.current >= INTERVALLE_TICK_LENT_MS) {
      dernierTickLent.current = maintenant;

      const m          = sim.metriques;
      const horodatage = new Date().toISOString();

      const anomalieAccident = verifierAccidentRare(sim);
      if (anomalieAccident) anomaliesEnAttente.current.push(anomalieAccident);

      const anomalieCongestion = ajusterCongestion(sim, maintenant, {
        congestionNiveau, dernierAjustementCongestion,
      });
      if (anomalieCongestion) anomaliesEnAttente.current.push(anomalieCongestion);

      let valCO2  = m.co2.value;
      let valPM25 = m.pm25.value;

      if (maintenant - dernierAjustementPollution.current >= intervalleProchainPollution.current) {
        dernierAjustementPollution.current  = maintenant;
        intervalleProchainPollution.current = rnd(INTERVALLE_POLLUTION_MIN_MS, INTERVALLE_POLLUTION_MAX_MS);

        const { axeLePlusPollue, indiceMax } = ajusterPollutionParAxe(sim);

        const cibleCO2  = 395 + (indiceMax / 100) * 220;
        const ciblePM25 = 10  + (indiceMax / 100) * 65;

        valCO2  = jitter(m.co2.value,  6, cibleCO2  - 15, cibleCO2  + 15);
        valPM25 = jitter(m.pm25.value, 2, ciblePM25 - 5,  ciblePM25 + 5);

        if (axeLePlusPollue && indiceMax >= SEUIL_POLLUTION_ANOMALIE) {
          const coordsAxe = sim.routes[axeLePlusPollue];
          const ptMilieu  = coordsAxe?.[Math.floor(coordsAxe.length / 2)] ?? CITY_CENTER;
          const cause     = tirerCausePollution(); // ✅ cause aléatoire diversifiée
        
          const anomaliePollution = creerAnomalie(
            indiceMax >= 85 ? 'critical' : 'warning',
            `CAP-ENV-${rndInt(10, 99)}`,
            axeLePlusPollue.replace(/_/g, ' '),
            `Pic de pollution localise sur l'axe ${axeLePlusPollue.replace(/_/g, ' ')} : ` +
            `indice ${Math.round(indiceMax)}/100, PM2.5 estime ${Math.round(ciblePM25)} µg/m3. ` +
            `Cause : ${cause}`,
            ptMilieu[0], ptMilieu[1],
          );
          anomaliePollution.pollutionIndex = Math.round(indiceMax);
          anomaliePollution.pm25Valeur     = Math.round(ciblePM25);
          anomaliePollution.causePollution = cause; // ✅ champ dédié, réutilisable par le rapport IA
        
          anomaliesEnAttente.current.push(anomaliePollution);
        }
      }

      const valTrafic = jitter(m.traffic.value, 4, 28, 90);

      sim.metriques = {
        co2:     { ...m.co2,     value: Math.round(valCO2),  fill: Math.round((valCO2 / m.co2.max) * 100),  status: calcStatut(valCO2, 450, 600),  updatedAt: horodatage },
        pm25:    { ...m.pm25,    value: parseFloat(valPM25.toFixed(1)), fill: Math.round((valPM25 / m.pm25.max) * 100), status: calcStatut(valPM25, 15, 30), updatedAt: horodatage },
        traffic: { ...m.traffic, value: Math.round(valTrafic), fill: Math.round(valTrafic), status: calcStatut(valTrafic, 65, 85), updatedAt: horodatage },
      };

      setMetrics(Object.values(sim.metriques));

      const accidentsActifs = sim.vehicles.filter(v => v.enAlerte === 'critical').length;
      setKpis({
        vehicles:   sim.vehicles.length,
        accidents:  accidentsActifs,
        congestion: sim.anomalies.filter(a => a.priority === 'warning').length,
      });

      if (anomaliesEnAttente.current.length > 0) {
        sim.anomalies = [...anomaliesEnAttente.current, ...sim.anomalies].slice(0, MAX_ANOMALIES);
        anomaliesEnAttente.current = [];
        setAnomalies([...sim.anomalies]);
      }
    }

    rafId.current = requestAnimationFrame(animer);
  }, []);

  useEffect(() => {
    derniereFrame.current = performance.now();
    rafId.current = requestAnimationFrame(animer);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [animer]);

  return { simulationRef, tick, metrics, anomalies, kpis, loading, loadError };
}
