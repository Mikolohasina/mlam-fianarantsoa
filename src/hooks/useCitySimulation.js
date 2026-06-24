/**
 * useCitySimulation.js  —  src/hooks/useCitySimulation.js
 * Système M'LAM — Supervision urbaine de Fianarantsoa, Madagascar
 *
 * Architecture performante à deux flux :
 *   - simulationRef.current.vehicles : état mutable, lu par le canvas à 60 FPS
 *     sans déclencher aucun re-render React.
 *   - useState (metrics, anomalies, kpis) : mis à jour toutes les 2.5 s
 *     uniquement, pour alimenter les panneaux latéraux.
 *
 * Les véhicules sont verrouillés sur leurs axes routiers via interpolation
 * linéaire (LERP) entre des waypoints haute densité espacés de 60 à 120 m.
 * La vitesse en km/h est convertie en degrés/seconde à chaque frame pour
 * garantir un avancement proportionnel au delta-temps réel.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ═════════════════════════════════════════════════════════════════════════════
// CONSTANTES DE LA VILLE
// ═════════════════════════════════════════════════════════════════════════════

/** Point central de Fianarantsoa — utilisé comme repère géographique. */
export const CITY_CENTER = [-21.4526, 47.0857];

/** Nombre maximum d'anomalies conservées dans le fil d'actualité. */
const MAX_ANOMALIES = 25;

/** Intervalle du tick lent (ms) — seul moment où React re-rend. */
const SLOW_TICK_MS = 2500;

/** 1 degré de latitude équivaut approximativement à 111 km. */
const DEG_PER_KM = 1 / 111;

// ═════════════════════════════════════════════════════════════════════════════
// DÉFINITION DES AXES ROUTIERS HAUTE DENSITÉ
//
// Chaque route est un tableau ordonné d'objets { nom, coords: [lat, lng] }.
// Les points sont espacés de 60 à 120 m pour coller aux vraies courbes des
// rues de Fianarantsoa visibles sur OpenStreetMap.
// ═════════════════════════════════════════════════════════════════════════════

const ROUTES = {

  /**
   * AXE A — RN7 Nord-Sud
   * Entre depuis la sortie Nord (direction Ambositra), traverse le quartier
   * Isada, longe Anjoma, passe par le rond-point d'Ampasambazaha, descend
   * vers Tanambao, Tsianolondroa et sort vers le Sud (direction Ambalavao).
   */
  RN7_NS: {
    label: 'RN7 — Axe Nord / Sud',
    waypoints: [
      { nom: 'Sortie Nord / Ambositra',      c: [-21.4192, 47.0785] },
      { nom: 'Entree Isada Nord',            c: [-21.4220, 47.0790] },
      { nom: 'Isada — Depot bus',            c: [-21.4248, 47.0796] },
      { nom: 'Isada Centre',                 c: [-21.4275, 47.0801] },
      { nom: 'Isada Sud',                    c: [-21.4302, 47.0806] },
      { nom: 'Debut Anjoma',                 c: [-21.4328, 47.0811] },
      { nom: 'Anjoma Nord',                  c: [-21.4352, 47.0815] },
      { nom: 'Carrefour Anjoma principal',   c: [-21.4376, 47.0820] },
      { nom: 'Anjoma Centre',                c: [-21.4398, 47.0824] },
      { nom: 'Anjoma Sud',                   c: [-21.4420, 47.0829] },
      { nom: 'Zone periurbaine',             c: [-21.4440, 47.0834] },
      { nom: 'Pont voie ferrée FCE',         c: [-21.4458, 47.0839] },
      { nom: 'Entree Ampasambazaha',         c: [-21.4476, 47.0843] },
      { nom: 'Ampasambazaha Nord',           c: [-21.4493, 47.0848] },
      { nom: 'Rond-point Ampasambazaha',     c: [-21.4510, 47.0852] },
      { nom: 'Ampasambazaha Sud',            c: [-21.4522, 47.0856] },
      { nom: 'Centre-Ville / Mairie',        c: [-21.4530, 47.0858] },
      { nom: 'Carrefour Prefecture',         c: [-21.4542, 47.0862] },
      { nom: 'Avenue de la Republique',      c: [-21.4558, 47.0867] },
      { nom: 'Tanambao Nord',                c: [-21.4575, 47.0872] },
      { nom: 'Tanambao — Marche',            c: [-21.4593, 47.0877] },
      { nom: 'Tanambao Centre',              c: [-21.4612, 47.0882] },
      { nom: 'Tanambao Sud',                 c: [-21.4630, 47.0888] },
      { nom: 'Tsianolondroa Nord',           c: [-21.4650, 47.0893] },
      { nom: 'Tsianolondroa Centre',         c: [-21.4672, 47.0898] },
      { nom: 'Tsianolondroa Sud',            c: [-21.4695, 47.0904] },
      { nom: 'Zone de sortie Sud',           c: [-21.4718, 47.0910] },
      { nom: 'Sortie Sud / Ambalavao',       c: [-21.4742, 47.0916] },
    ],
  },

  /**
   * AXE B — Montée vers la Haute Ville
   * Démarre au rond-point d'Ampasambazaha, emprunte les lacets escarpés
   * de la colline, passe par le quartier Ambozontany et arrive à la
   * Cathédrale Saint-Laurent et aux écoles de la Haute Ville.
   */
  HAUTE_VILLE: {
    label: 'Haute Ville — Montée / Descente',
    waypoints: [
      { nom: 'Rond-point Ampasambazaha',     c: [-21.4510, 47.0852] },
      { nom: 'Debut montee',                 c: [-21.4502, 47.0840] },
      { nom: 'Premier lacet Est',            c: [-21.4494, 47.0827] },
      { nom: 'Premier lacet Ouest',          c: [-21.4486, 47.0813] },
      { nom: 'Replat intermediaire',         c: [-21.4477, 47.0800] },
      { nom: 'Deuxieme virage Est',          c: [-21.4469, 47.0788] },
      { nom: 'Deuxieme virage Ouest',        c: [-21.4460, 47.0776] },
      { nom: 'Mi-montee',                    c: [-21.4452, 47.0764] },
      { nom: 'Troisieme lacet',              c: [-21.4443, 47.0752] },
      { nom: 'Quatrieme lacet',              c: [-21.4434, 47.0741] },
      { nom: 'Entree Ambozontany',           c: [-21.4425, 47.0730] },
      { nom: 'Rue Ambozontany principale',   c: [-21.4416, 47.0720] },
      { nom: 'Carrefour Cathedrale',         c: [-21.4407, 47.0710] },
      { nom: 'Cathedrale Saint-Laurent',     c: [-21.4398, 47.0700] },
      { nom: 'Ecoles de la Haute Ville',     c: [-21.4389, 47.0690] },
      { nom: 'Sommet Haute Ville',           c: [-21.4380, 47.0680] },
    ],
  },

  /**
   * AXE C — Ligne Est-Ouest (Gare FCE → Marché Central)
   * Part de la Gare des voyageurs FCE, longe la voie ferrée, passe par
   * le centre administratif et rejoint le marché central d'Anjoma.
   */
  GARE_MARCHE: {
    label: 'Axe Gare FCE — Marche',
    waypoints: [
      { nom: 'Gare FCE — Quai voyageurs',   c: [-21.4550, 47.0924] },
      { nom: 'Parvis Gare',                  c: [-21.4545, 47.0913] },
      { nom: 'Sortie Gare Ouest',            c: [-21.4540, 47.0902] },
      { nom: 'Rue longeant la voie',         c: [-21.4535, 47.0890] },
      { nom: 'Passage a niveau',             c: [-21.4530, 47.0878] },
      { nom: 'Rue du Stade',                 c: [-21.4528, 47.0867] },
      { nom: 'Carrefour Centre',             c: [-21.4526, 47.0857] },
      { nom: 'Avenue Principale Ouest',      c: [-21.4524, 47.0845] },
      { nom: 'Rue Commerce',                 c: [-21.4522, 47.0833] },
      { nom: 'Debut zone marche',            c: [-21.4520, 47.0821] },
      { nom: 'Entree Marche Anjoma',         c: [-21.4516, 47.0808] },
      { nom: 'Marche Anjoma — Hall Est',     c: [-21.4510, 47.0796] },
      { nom: 'Marche Anjoma — Hall Ouest',   c: [-21.4505, 47.0783] },
      { nom: 'Place du Marche',              c: [-21.4498, 47.0771] },
    ],
  },

  /**
   * AXE D — Boucle intérieure Anjoma
   * Dessert les rues intérieures du quartier résidentiel Anjoma.
   * Utilisée par les taxis locaux et les motos de livraison.
   */
  ANJOMA_LOCAL: {
    label: 'Boucle Anjoma',
    waypoints: [
      { nom: 'Carrefour RN7 / Anjoma',      c: [-21.4376, 47.0820] },
      { nom: 'Rue Interieure Anjoma Nord',   c: [-21.4382, 47.0809] },
      { nom: 'Anjoma — Ecole primaire',      c: [-21.4388, 47.0798] },
      { nom: 'Anjoma — Carrefour interieur', c: [-21.4394, 47.0787] },
      { nom: 'Anjoma Est',                   c: [-21.4400, 47.0776] },
      { nom: 'Anjoma Sud-Est',               c: [-21.4408, 47.0787] },
      { nom: 'Anjoma Sud',                   c: [-21.4414, 47.0800] },
      { nom: 'Anjoma — Retour RN7',          c: [-21.4412, 47.0813] },
      { nom: 'Carrefour RN7 / Anjoma',       c: [-21.4376, 47.0820] },
    ],
  },

  /**
   * AXE E — Axe Tanambao intérieur
   * Dessert les rues résidentielles de Tanambao, zone dense au sud du centre.
   */
  TANAMBAO_INTERNE: {
    label: 'Tanambao — Rues interieures',
    waypoints: [
      { nom: 'Entree Tanambao / RN7',        c: [-21.4575, 47.0872] },
      { nom: 'Rue Principale Tanambao',      c: [-21.4583, 47.0883] },
      { nom: 'Marche Tanambao Est',          c: [-21.4592, 47.0894] },
      { nom: 'Ecole Tanambao',               c: [-21.4601, 47.0904] },
      { nom: 'Tanambao Nord-Est',            c: [-21.4610, 47.0914] },
      { nom: 'Hopital Ivato',                c: [-21.4618, 47.0924] },
      { nom: 'Sortie Tanambao Est',          c: [-21.4625, 47.0934] },
    ],
  },

};

// ═════════════════════════════════════════════════════════════════════════════
// TYPES DE VÉHICULES
// ═════════════════════════════════════════════════════════════════════════════

const TYPES_VEHICULES = {
  TAXIBE: {
    label:       'Taxi-be',
    vitesseMin:  10,
    vitesseMax:  38,
    chocChance:  0.0012,
    arretChance: 0.07,   // S'arrête souvent aux arrêts
    taille:      5,
    couleur:     '#FBBF24',
  },
  TAXI: {
    label:       'Taxi',
    vitesseMin:  14,
    vitesseMax:  54,
    chocChance:  0.0022,
    arretChance: 0.035,
    taille:      4,
    couleur:     '#60A5FA',
  },
  MOTO: {
    label:       'Moto',
    vitesseMin:  18,
    vitesseMax:  72,
    chocChance:  0.005,
    arretChance: 0.012,  // Se faufile et s'arrête peu
    taille:      3,
    couleur:     '#34D399',
  },
  PARTICULIER: {
    label:       'Particulier',
    vitesseMin:  12,
    vitesseMax:  48,
    chocChance:  0.0028,
    arretChance: 0.025,
    taille:      4,
    couleur:     '#A78BFA',
  },
  SECOURS: {
    label:       'Secours',
    vitesseMin:  40,
    vitesseMax:  88,
    chocChance:  0.0004,
    arretChance: 0.004,
    taille:      5,
    couleur:     '#F87171',
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// BLUEPRINT DE LA FLOTTE — 157 véhicules
// ═════════════════════════════════════════════════════════════════════════════

const BLUEPRINT_FLOTTE = [
  // RN7 — axe principal, plus forte densité
  ...Array(14).fill({ type: 'TAXIBE',      route: 'RN7_NS',          prefix: 'A-TB' }),
  ...Array(14).fill({ type: 'TAXI',        route: 'RN7_NS',          prefix: 'A-TX' }),
  ...Array(18).fill({ type: 'MOTO',        route: 'RN7_NS',          prefix: 'A-MO' }),
  ...Array(10).fill({ type: 'PARTICULIER', route: 'RN7_NS',          prefix: 'A-PR' }),
  ...Array(4).fill({  type: 'SECOURS',     route: 'RN7_NS',          prefix: 'A-SC' }),

  // Haute Ville — montée escarpée
  ...Array(6).fill({  type: 'TAXIBE',      route: 'HAUTE_VILLE',     prefix: 'B-TB' }),
  ...Array(8).fill({  type: 'TAXI',        route: 'HAUTE_VILLE',     prefix: 'B-TX' }),
  ...Array(10).fill({ type: 'MOTO',        route: 'HAUTE_VILLE',     prefix: 'B-MO' }),
  ...Array(6).fill({  type: 'PARTICULIER', route: 'HAUTE_VILLE',     prefix: 'B-PR' }),
  ...Array(2).fill({  type: 'SECOURS',     route: 'HAUTE_VILLE',     prefix: 'B-SC' }),

  // Gare — Marche, axe Est-Ouest
  ...Array(8).fill({  type: 'TAXIBE',      route: 'GARE_MARCHE',     prefix: 'C-TB' }),
  ...Array(8).fill({  type: 'TAXI',        route: 'GARE_MARCHE',     prefix: 'C-TX' }),
  ...Array(12).fill({ type: 'MOTO',        route: 'GARE_MARCHE',     prefix: 'C-MO' }),
  ...Array(4).fill({  type: 'PARTICULIER', route: 'GARE_MARCHE',     prefix: 'C-PR' }),
  ...Array(2).fill({  type: 'SECOURS',     route: 'GARE_MARCHE',     prefix: 'C-SC' }),

  // Boucle Anjoma locale
  ...Array(6).fill({  type: 'TAXIBE',      route: 'ANJOMA_LOCAL',    prefix: 'D-TB' }),
  ...Array(6).fill({  type: 'TAXI',        route: 'ANJOMA_LOCAL',    prefix: 'D-TX' }),
  ...Array(8).fill({  type: 'MOTO',        route: 'ANJOMA_LOCAL',    prefix: 'D-MO' }),
  ...Array(3).fill({  type: 'SECOURS',     route: 'ANJOMA_LOCAL',    prefix: 'D-SC' }),

  // Tanambao interieur
  ...Array(4).fill({  type: 'TAXIBE',      route: 'TANAMBAO_INTERNE', prefix: 'E-TB' }),
  ...Array(4).fill({  type: 'TAXI',        route: 'TANAMBAO_INTERNE', prefix: 'E-TX' }),
  ...Array(6).fill({  type: 'MOTO',        route: 'TANAMBAO_INTERNE', prefix: 'E-MO' }),
  ...Array(3).fill({  type: 'PARTICULIER', route: 'TANAMBAO_INTERNE', prefix: 'E-PR' }),
];

// ═════════════════════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES PURES (hors du hook pour éviter les re-créations)
// ═════════════════════════════════════════════════════════════════════════════

/** Nombre aléatoire flottant dans [min, max]. */
function rnd(min, max) { return Math.random() * (max - min) + min; }

/** Nombre entier aléatoire dans [min, max]. */
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

/** Interpolation linéaire entre a et b au facteur t ∈ [0, 1]. */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Contrainte d'une valeur dans [min, max]. */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** Variation aléatoire autour d'une base, contrainte dans [min, max]. */
function jitter(base, delta, min, max) {
  return clamp(base + (Math.random() * 2 - 1) * delta, min, max);
}

/** Dérivation du statut à partir de seuils d'alerte. */
function calcStatut(valeur, seuilAlerte, seuilCritique) {
  if (valeur >= seuilCritique) return 'critical';
  if (valeur >= seuilAlerte)   return 'elevated';
  return 'ok';
}

/** Distance euclidienne approchée entre deux points [lat, lng] en degrés. */
function longueurSegment(a, b) {
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Retourne les coordonnées brutes [lat, lng] d'une route. */
function obtenirCoords(cleRoute) {
  return (ROUTES[cleRoute]?.waypoints ?? []).map(w => w.c);
}

/** Nom du waypoint à l'index donné dans une route. */
function nomWaypoint(cleRoute, index) {
  return ROUTES[cleRoute]?.waypoints?.[index]?.nom ?? 'Destination';
}

// ═════════════════════════════════════════════════════════════════════════════
// CONSTRUCTION DE L'ÉTAT INITIAL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Construit l'ensemble de la flotte en répartissant les véhicules de manière
 * homogène sur leurs routes respectives (aucun bunching au départ).
 */
function construireVehicules() {
  return BLUEPRINT_FLOTTE.map((bp, i) => {
    const type   = TYPES_VEHICULES[bp.type];
    const coords = obtenirCoords(bp.route);
    if (coords.length < 2) return null;

    const nbSegments = coords.length - 1;

    // Étalement : chaque véhicule commence à une position unique sur sa route.
    const progression = i / BLUEPRINT_FLOTTE.length;
    const positionBrute = progression * nbSegments;
    const segIdx = clamp(Math.floor(positionBrute), 0, nbSegments - 1);
    const segT   = positionBrute - segIdx;

    const a = coords[segIdx];
    const b = coords[Math.min(segIdx + 1, coords.length - 1)];

    const destinationNom = nomWaypoint(bp.route, coords.length - 1);

    return {
      id:          i,
      typeKey:     bp.type,
      typeLabel:   type.label,
      couleur:     type.couleur,
      taille:      type.taille,
      cleRoute:    bp.route,
      labelRoute:  ROUTES[bp.route]?.label ?? bp.route,

      // Paramètres LERP — la position réelle est l'interpolation de ces valeurs
      segIdx,
      segT: clamp(segT, 0, 1),
      avance: true,

      // Position GPS interpolée (mise à jour à chaque frame)
      lat: lerp(a[0], b[0], segT),
      lng: lerp(a[1], b[1], segT),

      // Vitesse en km/h — convertie en degrés/sec dans avancerVehicule()
      vitesseKmh:   rnd(type.vitesseMin, type.vitesseMax),
      arrete:       false,
      dureeArretMs: 0,
      chocDetecte:  false,

      mission:      `${type.label} : ${ROUTES[bp.route]?.label ?? bp.route} — direction ${destinationNom}`,
      destination:  destinationNom,
      phaseTrajet:  0,  // 0 = aller, 1 = retour
    };
  }).filter(Boolean);
}

function construireMetriquesInitiales() {
  return {
    co2: {
      id: 'co2', label: "Qualite de l'air", sublabel: 'CO2',
      valeur: 415, unite: 'ppm', max: 1000, fill: 42,
      statut: 'ok', updatedAt: new Date().toISOString(),
    },
    pm25: {
      id: 'pm25', label: 'Particules fines', sublabel: 'PM2.5',
      valeur: 13, unite: 'ug/m3', max: 75, fill: 17,
      statut: 'ok', updatedAt: new Date().toISOString(),
    },
    trafic: {
      id: 'traffic', label: 'Densite trafic', sublabel: 'Reseau',
      valeur: 58, unite: '%', max: 100, fill: 58,
      statut: 'ok', updatedAt: new Date().toISOString(),
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPTEUR D'ANOMALIES (module-level pour persister entre les ticks)
// ═════════════════════════════════════════════════════════════════════════════

let compteurAnomalie = 1;

function creerAnomalie(priorite, capteur, zone, description, lat, lng) {
  return {
    id:          `ALT-FKT-${String(compteurAnomalie++).padStart(3, '0')}`,
    priority:    priorite,
    time:        new Date().toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit' }),
    sensor:      capteur,
    zone,
    description,
    position:    [lat, lng],
    reported:    false,
    timestamp:   new Date().toISOString(),
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// MOTEUR D'AVANCEMENT — avancerVehicule()
//
// Avance un véhicule sur son rail par mutation directe (pas de copie d'objet).
// La mutation directe évite 150+ allocations mémoire par frame.
//
// Algorithme :
//   1. Calculer la distance à parcourir en degrés : v = (km/h) / (3600 * 111)
//   2. Diviser par la longueur du segment courant pour obtenir dT (incrément)
//   3. Si dT déborde [0,1], reporter le surplus sur le segment suivant
//   4. Interpoler la position finale (lat, lng) sur le segment résultant
// ═════════════════════════════════════════════════════════════════════════════

function avancerVehicule(v, deltaSecondes) {
  const coords     = obtenirCoords(v.cleRoute);
  const type       = TYPES_VEHICULES[v.typeKey] ?? TYPES_VEHICULES.PARTICULIER;
  const nbSegments = coords.length - 1;
  let anomalie     = null;

  if (nbSegments < 1) return null;

  // ── Gestion arrêt / mouvement ────────────────────────────────────────────
  if (!v.arrete) {
    // Événement de choc
    if (!v.chocDetecte && Math.random() < type.chocChance * deltaSecondes * 15) {
      v.chocDetecte  = true;
      v.arrete       = true;
      v.dureeArretMs = 0;
      anomalie = creerAnomalie(
        'critical',
        `CAP-TRF-${String(v.id % 99).padStart(2, '0')}`,
        v.labelRoute,
        `Accident detecte : ${v.typeLabel} — capteur de choc declenche. ` +
        `Vitesse avant impact : ${Math.round(v.vitesseKmh)} km/h. ` +
        `Mission : ${v.mission}. Axe : ${v.labelRoute}, Fianarantsoa.`,
        v.lat, v.lng,
      );
    // Arrêt normal (feu, passager, congestion)
    } else if (Math.random() < type.arretChance * deltaSecondes * 10) {
      v.arrete       = true;
      v.dureeArretMs = 0;
    }
  } else {
    v.dureeArretMs += deltaSecondes * 1000;

    // Durée d'arrêt : courte pour Taxi-be (arrêt voyageur), longue pour autres
    const dureeMax = type.arretChance > 0.05
      ? rnd(1200, 4000)
      : rnd(2500, 8000);

    if (v.dureeArretMs >= dureeMax) {
      // Reprise du mouvement
      v.arrete       = false;
      v.dureeArretMs = 0;
      v.chocDetecte  = false;
      v.vitesseKmh   = jitter(v.vitesseKmh, 8, type.vitesseMin, type.vitesseMax);
    } else {
      // Alerte embouteillage après 3 secondes d'immobilisation (hors Taxi-be)
      if (
        v.typeKey !== 'TAXIBE' &&
        v.dureeArretMs >= 3000 &&
        v.dureeArretMs < 3000 + deltaSecondes * 1000
      ) {
        anomalie = creerAnomalie(
          'warning',
          `CAP-TRF-${String(v.id % 99).padStart(2, '0')}`,
          v.labelRoute,
          `${v.typeLabel} immobilise depuis ${Math.round(v.dureeArretMs / 1000)} s. ` +
          `Embouteillage ou panne probable. Axe : ${v.labelRoute}, Fianarantsoa.`,
          v.lat, v.lng,
        );
      }
      return anomalie;  // Pas de mise à jour de position pendant l'arrêt
    }
  }

  // ── Avancement LERP sur le rail ──────────────────────────────────────────
  // Conversion vitesse : km/h → degrés/s (1 deg ≈ 111 km)
  const vitesseDegSec = (v.vitesseKmh * DEG_PER_KM) / 3600;

  // Plafond de sécurité : jamais plus d'1.5 segments par frame
  // (empêche la téléportation à très faible FPS)
  let distanceRestante = Math.min(
    vitesseDegSec * deltaSecondes,
    (nbSegments * 1.5) / 100,
  );

  let segIdx = v.segIdx;
  let segT   = v.segT;
  let avance = v.avance;

  // Boucle de report de surplus sur les segments suivants
  for (let iter = 0; iter < 4 && distanceRestante > 1e-10; iter++) {
    const iA = clamp(segIdx,     0, coords.length - 1);
    const iB = clamp(segIdx + 1, 0, coords.length - 1);
    const a  = coords[iA];
    const b  = coords[iB];
    if (!a || !b) break;

    const longueur = longueurSegment(a, b);
    if (longueur < 1e-10) {
      // Segment dégénéré (deux points identiques) — on passe au suivant
      segIdx = avance ? segIdx + 1 : segIdx - 1;
      segT   = avance ? 0 : 1;
      distanceRestante = 0;
      break;
    }

    // Incrément de t correspondant à la distance restante
    const dt = distanceRestante / longueur;

    if (avance) {
      segT += dt;
      if (segT >= 1) {
        distanceRestante = (segT - 1) * longueur;
        segT  = 0;
        segIdx++;
        if (segIdx >= nbSegments) {
          // Fin du trajet aller — demi-tour
          segIdx        = nbSegments - 1;
          segT          = 1;
          avance        = false;
          distanceRestante = 0;
          v.phaseTrajet = 1;
          v.destination = nomWaypoint(v.cleRoute, 0);
          v.mission     = `${v.typeLabel} : Retour — direction ${v.destination}`;
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
        if (segIdx < 0) {
          // Fin du retour — reprise du trajet aller
          segIdx        = 0;
          segT          = 0;
          avance        = true;
          distanceRestante = 0;
          v.phaseTrajet = 0;
          const dest    = nomWaypoint(v.cleRoute, coords.length - 1);
          v.destination = dest;
          v.mission     = `${v.typeLabel} : Reprise service — direction ${dest}`;
        }
      } else {
        distanceRestante = 0;
      }
    }
  }

  // ── Interpolation GPS finale — position UNIQUEMENT sur le segment ─────────
  const iAFinal = clamp(segIdx,     0, coords.length - 1);
  const iBFinal = clamp(segIdx + 1, 0, coords.length - 1);
  const aFinal  = coords[iAFinal];
  const bFinal  = coords[iBFinal];

  if (aFinal && bFinal) {
    const t  = clamp(segT, 0, 1);
    v.lat    = lerp(aFinal[0], bFinal[0], t);
    v.lng    = lerp(aFinal[1], bFinal[1], t);
  }

  // Mise à jour de l'état de mouvement
  v.segIdx     = clamp(segIdx, 0, nbSegments - 1);
  v.segT       = clamp(segT, 0, 1);
  v.avance     = avance;
  v.vitesseKmh = jitter(v.vitesseKmh, 0.4, type.vitesseMin, type.vitesseMax);

  return anomalie;
}

// ═════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

/**
 * useCitySimulation
 *
 * Retourne :
 *   simulationRef  — référence mutable lue par le canvas de CityMap à 60 FPS
 *   metrics        — tableau de métriques (React state, mis à jour toutes 2.5s)
 *   anomalies      — tableau d'alertes (React state, mis à jour à chaque événement)
 *   kpis           — compteurs synthétiques (React state)
 *
 * CityMap accède à simulationRef.current.vehicles directement dans sa boucle
 * canvas — AUCUN re-render React n'est déclenché par le mouvement des véhicules.
 */
export default function useCitySimulation() {

  // ── État mutable partagé avec le canvas ────────────────────────────────────
  const simulationRef = useRef(null);
  if (simulationRef.current === null) {
    simulationRef.current = {
      vehicles:  construireVehicules(),
      metriques: construireMetriquesInitiales(),
      anomalies: [],
    };
  }

  // ── État React (panneaux latéraux uniquement) ─────────────────────────────
  const [metrics,   setMetrics]   = useState(() =>
    Object.values(construireMetriquesInitiales()).map(m => ({
      ...m,
      value: m.valeur,
      status: m.statut,
    }))
  );
  const [anomalies, setAnomalies] = useState([]);
  const [kpis,      setKpis]      = useState({
    vehicles:   BLUEPRINT_FLOTTE.length,
    accidents:  0,
    congestion: 0,
  });

  // ── Références internes de la boucle rAF ──────────────────────────────────
  const anomaliesEnAttente = useRef([]);
  const dernierTickLent    = useRef(performance.now());
  const derniereFrame      = useRef(performance.now());
  const rafId              = useRef(null);

  // ── Boucle d'animation principale ─────────────────────────────────────────
  const animer = useCallback(() => {
    const maintenant = performance.now();
    const deltaSec   = clamp((maintenant - derniereFrame.current) / 1000, 0, 0.1);
    derniereFrame.current = maintenant;

    const sim = simulationRef.current;
    if (!sim) { rafId.current = requestAnimationFrame(animer); return; }

    // Avancer tous les véhicules sur leurs rails
    for (let i = 0; i < sim.vehicles.length; i++) {
      const anomalie = avancerVehicule(sim.vehicles[i], deltaSec);
      if (anomalie) anomaliesEnAttente.current.push(anomalie);
    }

    // ── Tick lent : mise à jour React toutes les 2.5 s ───────────────────────
    if (maintenant - dernierTickLent.current >= SLOW_TICK_MS) {
      dernierTickLent.current = maintenant;

      const picPolluant = Math.random() < 0.07;
      const m           = sim.metriques;
      const horodatage  = new Date().toISOString();

      const valCO2    = picPolluant ? jitter(m.co2.valeur, 92, 380, 920) : jitter(m.co2.valeur, 5, 380, 480);
      const valPM25   = picPolluant ? jitter(m.pm25.valeur, 18, 10, 68) : jitter(m.pm25.valeur, 2, 10, 28);
      const valTrafic = jitter(m.trafic.valeur, 4, 30, 92);

      sim.metriques = {
        co2: {
          ...m.co2,
          valeur: valCO2,
          value:  valCO2,
          fill:   Math.round((valCO2 / m.co2.max) * 100),
          statut: calcStatut(valCO2, 450, 700),
          status: calcStatut(valCO2, 450, 700),
          updatedAt: horodatage,
        },
        pm25: {
          ...m.pm25,
          valeur: valPM25,
          value:  valPM25,
          fill:   Math.round((valPM25 / m.pm25.max) * 100),
          statut: calcStatut(valPM25, 25, 50),
          status: calcStatut(valPM25, 25, 50),
          updatedAt: horodatage,
        },
        trafic: {
          ...m.trafic,
          valeur: valTrafic,
          value:  valTrafic,
          fill:   valTrafic,
          statut: calcStatut(valTrafic, 65, 85),
          status: calcStatut(valTrafic, 65, 85),
          updatedAt: horodatage,
        },
      };

      // Anomalie de pic de pollution
      if (picPolluant && valCO2 > 500) {
        const zones = ['Centre-Ville', 'Gare FCE', 'Tanambao', 'Anjoma', 'Haute Ville', 'Tsianolondroa'];
        const zone  = zones[rndInt(0, zones.length - 1)];
        anomaliesEnAttente.current.push(creerAnomalie(
          valCO2 > 700 ? 'critical' : 'warning',
          `CAP-ENV-${rndInt(10, 99)}`,
          zone,
          `Pic de pollution atmospherique : CO2 ${valCO2.toFixed(0)} ppm, PM2.5 ${valPM25.toFixed(1)} ug/m3. ` +
          `Secteur : ${zone}, Fianarantsoa.`,
          ...CITY_CENTER,
        ));
      }

      // Fusion et publication des anomalies
      if (anomaliesEnAttente.current.length > 0) {
        sim.anomalies = [...anomaliesEnAttente.current, ...sim.anomalies].slice(0, MAX_ANOMALIES);
        anomaliesEnAttente.current = [];
        setAnomalies([...sim.anomalies]);
      }

      // Comptage des incidents récents pour les KPI
      const recents    = sim.anomalies.slice(0, 12);
      const accidents  = recents.filter(a => a.priority === 'critical').length;
      const congestion = recents.filter(a => a.priority === 'warning').length;

      // Conversion vers le format attendu par Metrics.jsx
      setMetrics(Object.values(sim.metriques).map(m => ({
        id:        m.id,
        label:     m.label,
        sublabel:  m.sublabel,
        value:     Math.round(m.valeur * 10) / 10,
        unit:      m.unite,
        max:       m.max,
        fill:      m.fill,
        status:    m.statut,
        updatedAt: m.updatedAt,
      })));

      setKpis({
        vehicles:   sim.vehicles.length,
        accidents,
        congestion,
      });
    }

    rafId.current = requestAnimationFrame(animer);
  }, []);

  // ── Cycle de vie du hook ───────────────────────────────────────────────────
  useEffect(() => {
    derniereFrame.current = performance.now();
    rafId.current = requestAnimationFrame(animer);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [animer]);

  return { simulationRef, metrics, anomalies, kpis };
}
