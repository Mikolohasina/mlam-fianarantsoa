/**
 * useCitySimulation.js  —  src/hooks/useCitySimulation.js
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Moteur de simulation IoT pour 157 vehicules sur 5 axes reels de Fianarantsoa.
 *
 * Architecture a deux flux de donnees :
 *
 *   [Flux temps reel 60 FPS]
 *   simulationRef.current.vehicles  — positions mutees directement via rAF,
 *   jamais copiees dans useState. La carte canvas lit ce tableau a chaque frame
 *   sans declencher le moindre re-render React.
 *
 *   [Flux lent 2.5s — React state]
 *   metrics, anomalies, kpis — mis a jour toutes les 2.5 secondes uniquement,
 *   pour alimenter les panneaux Metrics.jsx et Sidebar.jsx.
 *
 * Algorithme LERP :
 *   Chaque vehicule maintient (segIdx, segT). A chaque frame delta-t :
 *     distance = vitesse_km_h / (3600 * 111) * delta_s
 *     segT    += distance / longueur_segment
 *   Si segT >= 1, on passe au segment suivant (boucle de report).
 *   La position GPS = lerp(coordA, coordB, segT).
 *   Les segments etant espaces de 60 a 120 m, aucun saut diagonal n'est visible.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// CONSTANTES GEOGRAPHIQUES
// =============================================================================

/** Centre cartographique de Fianarantsoa. Export utilise par CityMap.jsx. */
export const CITY_CENTER = [-21.4526, 47.0857];

/** 1 degre de latitude = environ 111 km. Sert a convertir km/h en deg/s. */
const DEG_PAR_KM = 1 / 111;

/** Intervalle du tick lent (ms) — seul moment ou React effectue un re-render. */
const INTERVALLE_TICK_LENT_MS = 2500;

/** Nombre maximum d'anomalies conservees dans le fil d'actualite. */
const MAX_ANOMALIES = 25;

/** Seuil de vitesse en km/h en dessous duquel un vehicule est considere arrete. */
const SEUIL_ARRET_KMH = 3;

// =============================================================================
// DEFINITION DES 5 AXES ROUTIERS REELS — FIANARANTSOA
// Points espaces de 60 a 120 m pour coller aux vraies courbes des rues OSM.
// =============================================================================

const AXES = {

  /**
   * AXE 1 — RN7 Nord-Sud
   * Entre par Ambositra, traverse Isada, Anjoma, le rond-point Ampasambazaha,
   * descend vers Tanambao et sort vers Ambalavao au Sud.
   */
  RN7: {
    cle:   'RN7',
    label: 'RN7 — Axe Nord / Sud',
    points: [
      [-21.4192, 47.0785], [-21.4215, 47.0789], [-21.4238, 47.0793],
      [-21.4260, 47.0797], [-21.4283, 47.0801], [-21.4305, 47.0805],
      [-21.4328, 47.0809], [-21.4350, 47.0813], [-21.4372, 47.0817],
      [-21.4394, 47.0821], [-21.4414, 47.0825], [-21.4433, 47.0830],
      [-21.4451, 47.0835], [-21.4468, 47.0839], [-21.4484, 47.0843],
      [-21.4499, 47.0848], [-21.4512, 47.0852], [-21.4522, 47.0855],
      [-21.4528, 47.0857], [-21.4537, 47.0860], [-21.4548, 47.0863],
      [-21.4560, 47.0867], [-21.4574, 47.0871], [-21.4589, 47.0875],
      [-21.4604, 47.0879], [-21.4620, 47.0884], [-21.4636, 47.0888],
      [-21.4652, 47.0892], [-21.4668, 47.0896], [-21.4685, 47.0901],
      [-21.4702, 47.0905], [-21.4720, 47.0910], [-21.4738, 47.0914],
      [-21.4756, 47.0919],
    ],
  },

  /**
   * AXE 2 — Boucle Haute Ville
   * Demarre au rond-point Ampasambazaha, grimpe les lacets escarpes vers
   * la Cathedrale Saint-Laurent, puis redescend cote Est.
   */
  HAUTE_VILLE: {
    cle:   'HAUTE_VILLE',
    label: 'Boucle Haute Ville — Cathedrale',
    points: [
      [-21.4512, 47.0852], [-21.4505, 47.0841], [-21.4497, 47.0829],
      [-21.4489, 47.0816], [-21.4481, 47.0803], [-21.4473, 47.0791],
      [-21.4464, 47.0779], [-21.4456, 47.0768], [-21.4447, 47.0757],
      [-21.4438, 47.0747], [-21.4429, 47.0737], [-21.4420, 47.0727],
      [-21.4411, 47.0718], [-21.4402, 47.0709], [-21.4393, 47.0700],
      [-21.4384, 47.0692], [-21.4375, 47.0684],
      // Sommet — Cathedrale Saint-Laurent
      [-21.4368, 47.0677],
      // Descente cote Est
      [-21.4375, 47.0690], [-21.4383, 47.0703], [-21.4392, 47.0715],
      [-21.4401, 47.0726], [-21.4411, 47.0737], [-21.4420, 47.0748],
      [-21.4430, 47.0759], [-21.4440, 47.0769], [-21.4450, 47.0779],
      [-21.4460, 47.0789], [-21.4470, 47.0799], [-21.4480, 47.0809],
      [-21.4490, 47.0819], [-21.4500, 47.0829], [-21.4510, 47.0840],
      [-21.4512, 47.0852],
    ],
  },

  /**
   * AXE 3 — Gare FCE vers Tsianolondroa
   * Part de la gare des voyageurs FCE, longe la voie ferree, traverse le
   * marche central et rejoint le quartier Tsianolondroa a l'Est.
   */
  GARE_TSIANOLONDROA: {
    cle:   'GARE_TSIANOLONDROA',
    label: 'Axe Gare FCE — Tsianolondroa',
    points: [
      [-21.4548, 47.0922], [-21.4543, 47.0910], [-21.4538, 47.0898],
      [-21.4533, 47.0886], [-21.4528, 47.0874], [-21.4526, 47.0862],
      [-21.4524, 47.0850], [-21.4522, 47.0838], [-21.4520, 47.0826],
      [-21.4518, 47.0814], [-21.4516, 47.0802], [-21.4514, 47.0790],
      [-21.4512, 47.0778], [-21.4510, 47.0766], [-21.4509, 47.0754],
      [-21.4508, 47.0742], [-21.4508, 47.0730],
      // Quartier Tsianolondroa
      [-21.4510, 47.0718], [-21.4514, 47.0706],
    ],
  },

  /**
   * AXE 4 — Axe Beravina
   * Traverse le quartier residentiel de Beravina, entre le centre-ville
   * et la zone administrative de Fianarantsoa.
   */
  BERAVINA: {
    cle:   'BERAVINA',
    label: 'Axe Beravina',
    points: [
      [-21.4528, 47.0857], [-21.4535, 47.0870], [-21.4542, 47.0883],
      [-21.4549, 47.0895], [-21.4556, 47.0907], [-21.4561, 47.0919],
      [-21.4564, 47.0931], [-21.4565, 47.0943], [-21.4563, 47.0955],
      [-21.4559, 47.0967], [-21.4554, 47.0978], [-21.4548, 47.0989],
      [-21.4541, 47.0999], [-21.4533, 47.1008], [-21.4524, 47.1016],
    ],
  },

  /**
   * AXE 5 — Axe Talatamaty
   * Dessert le quartier periurbain de Talatamaty au Nord-Est de Fianarantsoa,
   * relie au centre par une route secondaire bordant des zones residentielles.
   */
  TALATAMATY: {
    cle:   'TALATAMATY',
    label: 'Axe Talatamaty',
    points: [
      [-21.4400, 47.0823], [-21.4407, 47.0835], [-21.4414, 47.0847],
      [-21.4421, 47.0859], [-21.4428, 47.0871], [-21.4435, 47.0883],
      [-21.4440, 47.0895], [-21.4443, 47.0907], [-21.4444, 47.0919],
      [-21.4443, 47.0931], [-21.4440, 47.0942], [-21.4435, 47.0953],
      [-21.4428, 47.0963], [-21.4419, 47.0971], [-21.4409, 47.0977],
      [-21.4399, 47.0982], [-21.4389, 47.0985],
    ],
  },
};

const LISTE_AXES = Object.values(AXES);

// =============================================================================
// TYPES DE VEHICULES — vitesses et comportements
// =============================================================================

const TYPES_VEHICULES = {
  TAXIBE: {
    label:       'Taxi-be',
    vitesseMin:  10,
    vitesseMax:  38,
    chocChance:  0.0012,
    arretChance: 0.07,
    taille:      5,
    couleur:     '#FBBF24',
  },
  TAXI: {
    label:       'Taxi',
    vitesseMin:  15,
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
    arretChance: 0.012,
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

// =============================================================================
// GABARIT DE FLOTTE — 157 vehicules repartis sur 5 axes
// =============================================================================

const GABARIT_FLOTTE = [
  // RN7 — axe le plus charge (62 vehicules)
  ...Array(14).fill({ type: 'TAXIBE',      axe: 'RN7',                mission: 'Taxi-be Ligne 1 — Anjoma / Tanambao'             }),
  ...Array(14).fill({ type: 'TAXI',        axe: 'RN7',                mission: 'Taxi course RN7 — Ambositra / Ambalavao'          }),
  ...Array(18).fill({ type: 'MOTO',        axe: 'RN7',                mission: 'Livraison express — Axe RN7 Fianarantsoa'         }),
  ...Array(10).fill({ type: 'PARTICULIER', axe: 'RN7',                mission: 'Trajet domicile — bureau Ampasambazaha'           }),
  ...Array(6).fill({  type: 'SECOURS',     axe: 'RN7',                mission: 'Patrouille RN7 — intervention rapide'             }),

  // Haute Ville (32 vehicules)
  ...Array(7).fill({  type: 'TAXIBE',      axe: 'HAUTE_VILLE',        mission: 'Taxi-be boucle Haute Ville — Cathedrale'          }),
  ...Array(8).fill({  type: 'TAXI',        axe: 'HAUTE_VILLE',        mission: 'Taxi montee Haute Ville — Depose scolaire'        }),
  ...Array(10).fill({ type: 'MOTO',        axe: 'HAUTE_VILLE',        mission: 'Coursier Haute Ville — livraison rapide'          }),
  ...Array(5).fill({  type: 'PARTICULIER', axe: 'HAUTE_VILLE',        mission: 'Particulier : Depose eleve Ecole Haute Ville'     }),
  ...Array(2).fill({  type: 'SECOURS',     axe: 'HAUTE_VILLE',        mission: 'Secours : Surveillance Haute Ville'               }),

  // Gare FCE — Tsianolondroa (28 vehicules)
  ...Array(7).fill({  type: 'TAXIBE',      axe: 'GARE_TSIANOLONDROA', mission: 'Taxi-be Ligne 2 — Gare FCE / Tsianolondroa'       }),
  ...Array(7).fill({  type: 'TAXI',        axe: 'GARE_TSIANOLONDROA', mission: 'Taxi Gare — Marche Central Fianarantsoa'          }),
  ...Array(9).fill({  type: 'MOTO',        axe: 'GARE_TSIANOLONDROA', mission: 'Moto livraison — Quartier Tsianolondroa'          }),
  ...Array(3).fill({  type: 'PARTICULIER', axe: 'GARE_TSIANOLONDROA', mission: 'Particulier : Trajet travail — zone administrative'}),
  ...Array(2).fill({  type: 'SECOURS',     axe: 'GARE_TSIANOLONDROA', mission: 'Secours : Axe Gare — intervention'                }),

  // Axe Beravina (20 vehicules)
  ...Array(5).fill({  type: 'TAXIBE',      axe: 'BERAVINA',           mission: 'Taxi-be Beravina — Ligne locale'                  }),
  ...Array(5).fill({  type: 'TAXI',        axe: 'BERAVINA',           mission: 'Taxi course Beravina — Centre ville'              }),
  ...Array(6).fill({  type: 'MOTO',        axe: 'BERAVINA',           mission: 'Moto zone residentielle Beravina'                 }),
  ...Array(3).fill({  type: 'PARTICULIER', axe: 'BERAVINA',           mission: 'Particulier : Courses quartier Beravina'          }),
  ...Array(1).fill({  type: 'SECOURS',     axe: 'BERAVINA',           mission: 'Secours : Surveillance Beravina'                  }),

  // Axe Talatamaty (15 vehicules)
  ...Array(4).fill({  type: 'TAXIBE',      axe: 'TALATAMATY',         mission: 'Taxi-be Ligne 3 — Talatamaty / Centre'            }),
  ...Array(4).fill({  type: 'TAXI',        axe: 'TALATAMATY',         mission: 'Taxi periurbain — Talatamaty'                     }),
  ...Array(5).fill({  type: 'MOTO',        axe: 'TALATAMATY',         mission: 'Moto livraison zone Talatamaty'                   }),
  ...Array(2).fill({  type: 'PARTICULIER', axe: 'TALATAMATY',         mission: 'Particulier : Navette Talatamaty — bureau'        }),
];

// =============================================================================
// FONCTIONS UTILITAIRES PURES — definies hors du hook pour eviter la recreation
// =============================================================================

/** Nombre aleatoire flottant dans [min, max]. */
function rnd(min, max) { return Math.random() * (max - min) + min; }

/** Nombre entier aleatoire dans [min, max] inclus. */
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

/** Interpolation lineaire entre a et b au facteur t ∈ [0, 1]. */
function lerp(a, b, t) { return a + (b - a) * t; }

/** Contrainte d'une valeur dans [min, max]. */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** Variation aleatoire bornee autour d'une base. */
function jitter(base, delta, min, max) {
  return clamp(base + (Math.random() * 2 - 1) * delta, min, max);
}

/** Distance euclidienne entre deux points [lat, lng] en degres. */
function longueurSegment(a, b) {
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** Derivation du statut textuel selon deux seuils. */
function calcStatut(valeur, seuilAlerte, seuilCritique) {
  if (valeur >= seuilCritique) return 'critical';
  if (valeur >= seuilAlerte)   return 'elevated';
  return 'ok';
}

/** Retourne le nom du dernier waypoint d'un axe (destination finale). */
function derniereDestination(cleAxe) {
  const points = AXES[cleAxe]?.points ?? [];
  if (points.length === 0) return 'Terminus';
  // Utilise les labels de zone fixes par axe
  const destinations = {
    RN7:                'Terminus Sud / Ambalavao',
    HAUTE_VILLE:        'Cathedrale Saint-Laurent',
    GARE_TSIANOLONDROA: 'Tsianolondroa',
    BERAVINA:           'Zone Administrative Beravina',
    TALATAMATY:         'Talatamaty',
  };
  return destinations[cleAxe] ?? 'Terminus';
}

// =============================================================================
// CONSTRUCTION DE L'ETAT INITIAL
// =============================================================================

/**
 * Construit le tableau initial de 157 vehicules.
 * Les vehicules sont repartis de maniere homogene sur leurs axes respectifs
 * pour eviter le "bunching" (tous au meme endroit au demarrage).
 */
function construireVehicules() {
  // Compte des vehicules par axe pour l'etalement
  const compteParAxe = {};
  GABARIT_FLOTTE.forEach(bp => {
    compteParAxe[bp.axe] = (compteParAxe[bp.axe] ?? 0) + 1;
  });

  const indexParAxe = {};

  return GABARIT_FLOTTE.map((bp, i) => {
    const type   = TYPES_VEHICULES[bp.type] ?? TYPES_VEHICULES.PARTICULIER;
    const axe    = AXES[bp.axe];
    const points = axe?.points ?? [];

    if (points.length < 2) return null;

    const nbSegments = points.length - 1;
    const total      = compteParAxe[bp.axe] ?? 1;

    // Incremente l'index pour cet axe
    indexParAxe[bp.axe] = (indexParAxe[bp.axe] ?? 0);
    const positionEtalee = indexParAxe[bp.axe] / total;
    indexParAxe[bp.axe]++;

    // Position initiale etalee sur l'axe
    const positionBrute = positionEtalee * nbSegments;
    const segIdx        = Math.min(Math.floor(positionBrute), nbSegments - 1);
    const segT          = clamp(positionBrute - segIdx, 0, 1);

    const a = points[segIdx];
    const b = points[Math.min(segIdx + 1, points.length - 1)];

    return {
      id:           i,
      typeKey:      bp.type,
      typeLabel:    type.label,
      couleur:      type.couleur,
      taille:       type.taille,
      axeCle:       bp.axe,
      axeLabel:     axe?.label ?? bp.axe,
      mission:      bp.mission,
      destination:  derniereDestination(bp.axe),
      phaseTrajet:  0,            // 0 = aller, 1 = retour

      // Parametres LERP — position = lerp(points[segIdx], points[segIdx+1], segT)
      segIdx,
      segT:         clamp(segT, 0, 1),
      avance:       true,

      // Position GPS courante (mise a jour a chaque frame)
      lat:          lerp(a[0], b[0], segT),
      lng:          lerp(a[1], b[1], segT),

      // Dynamique de vitesse
      vitesseKmh:   rnd(type.vitesseMin, type.vitesseMax),
      arrete:       false,
      dureeArretMs: 0,
      chocDetecte:  false,

      // Severite pour le rendu canvas (couleur du point)
      severite:     'low',
    };
  }).filter(Boolean);
}

/**
 * Construit les metriques initiales calibrees sur Fianarantsoa.
 * CO2 : 390-420 ppm (ville de taille moyenne, altitude 1200 m)
 * PM2.5 : 8-15 µg/m3 (pas d'industrie lourde, feux de biomasse occasionnels)
 */
function construireMetriques() {
  return {
    co2: {
      id:        'co2',
      label:     "Qualite de l'air",
      sublabel:  'CO2',
      value:     405,
      unit:      'ppm',
      max:       800,
      fill:      51,
      status:    'ok',
      reference: 'Ref. Fianarantsoa : 390-420 ppm',
      updatedAt: new Date().toISOString(),
    },
    pm25: {
      id:        'pm25',
      label:     'Particules fines',
      sublabel:  'PM2.5',
      value:     11,
      unit:      'µg/m3',
      max:       75,
      fill:      15,
      status:    'ok',
      reference: 'Seuil OMS : 15 µg/m3',
      updatedAt: new Date().toISOString(),
    },
    trafic: {
      id:        'traffic',
      label:     'Densite trafic',
      sublabel:  'RN7',
      value:     52,
      unit:      '%',
      max:       100,
      fill:      52,
      status:    'ok',
      reference: 'Axe principal RN7 Fianarantsoa',
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Construit le tableau initial des anomalies fixes.
 * Ces anomalies sont geo-localisees sur des points reels des axes.
 * Les vehicules qui s'approchent voient leur vitesse reduite.
 */
function construireAnomaliesInitiales() {
  return [
    {
      id:          'ANO-FIXE-001',
      priority:    'warning',
      time:        '08:15',
      sensor:      'CAP-TRF-01',
      zone:        'Anjoma — RN7',
      description: 'Ralentissement habituel Anjoma — heure de pointe matinale sur la RN7 Nord.',
      position:    [-21.4376, 47.0820],
      reported:    false,
      timestamp:   new Date(Date.now() - 45 * 60000).toISOString(),
      rayon:       0.003,  // Rayon d'influence en degres (~330m)
    },
    {
      id:          'ANO-FIXE-002',
      priority:    'info',
      time:        '07:50',
      sensor:      'CAP-ENV-03',
      zone:        'Ampasambazaha',
      description: 'Niveau CO2 eleve pres du rond-point Ampasambazaha : trafic matinal dense.',
      position:    [-21.4512, 47.0852],
      reported:    false,
      timestamp:   new Date(Date.now() - 70 * 60000).toISOString(),
      rayon:       0.002,
    },
    {
      id:          'ANO-FIXE-003',
      priority:    'info',
      time:        '07:30',
      sensor:      'CAP-ACO-02',
      zone:        'Gare FCE',
      description: 'Affluence detectee Gare FCE : depart train vers Manakara prevu 08h00.',
      position:    [-21.4548, 47.0922],
      reported:    true,
      timestamp:   new Date(Date.now() - 90 * 60000).toISOString(),
      rayon:       0.002,
    },
  ];
}

// =============================================================================
// MOTEUR D'AVANCEMENT LERP — avancerVehicule()
//
// Mutation directe de l'objet vehicule (pas de copie) pour limiter
// les allocations memoire a 157 creations d'objets par frame.
//
// Algorithme de progression :
//   1. Convertir vitesse km/h en degres/s via DEG_PAR_KM
//   2. Calculer dT = (vitesse_deg/s * delta_s) / longueur_segment_courant
//   3. Ajouter dT a segT — si debordement, reporter le surplus au segment suivant
//   4. Detecter la fin de route : inverser (demi-tour) ou reprendre depuis debut
//   5. Interpoler lat/lng depuis les deux extremites du segment courant
//
// La boucle de report garantit qu'un vehicule rapide ne saute jamais de segment,
// meme a tres faible FPS (cap a 100ms de delta impose en entree).
// =============================================================================

/**
 * Fait avancer un vehicule d'exactement `deltaSecondes` secondes sur son axe.
 * Retourne une anomalie si un evenement est detecte, null sinon.
 * @param {object} v                 — vehicule a muter
 * @param {number} deltaSecondes     — temps ecoule depuis la derniere frame
 * @param {Array}  anomaliesCourantes — liste des anomalies actives
 * @returns {object|null}            — nouvelle anomalie generee ou null
 */
function avancerVehicule(v, deltaSecondes, anomaliesCourantes) {
  const axe    = AXES[v?.axeCle];
  const points = axe?.points ?? [];
  if (points.length < 2) return null;

  const type       = TYPES_VEHICULES[v?.typeKey] ?? TYPES_VEHICULES.PARTICULIER;
  const nbSegments = points.length - 1;
  let   anomalie   = null;

  // ── Reduction de vitesse si proche d'une anomalie active ─────────────────
  let facteurVitesse = 1.0;
  (anomaliesCourantes ?? []).forEach(a => {
    if (!a?.position) return;
    const dLat = v.lat - a.position[0];
    const dLng = v.lng - a.position[1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < (a.rayon ?? 0.002)) {
      facteurVitesse = Math.min(facteurVitesse, 0.35);
    }
  });

  // ── Dynamique d'arret et de reprise ──────────────────────────────────────
  if (!v.arrete) {
    // Evenement de choc (accident)
    if (!v.chocDetecte && Math.random() < type.chocChance * deltaSecondes * 15) {
      v.chocDetecte  = true;
      v.arrete       = true;
      v.dureeArretMs = 0;
      v.severite     = 'high';
      anomalie = creerAnomalie(
        'critical',
        `CAP-TRF-${String(v.id % 99).padStart(2, '0')}`,
        v.axeLabel,
        `Accident detecte : ${v.typeLabel} — choc enregistre par capteur embarque. ` +
        `Vitesse avant impact : ${Math.round(v.vitesseKmh)} km/h. Mission : ${v.mission}. ` +
        `Axe : ${v.axeLabel}, Fianarantsoa.`,
        v.lat,
        v.lng,
      );
    // Arret normal (feu rouge, passager, embouteillage)
    } else if (Math.random() < type.arretChance * deltaSecondes * 10 * (1 / facteurVitesse)) {
      v.arrete       = true;
      v.dureeArretMs = 0;
      v.severite     = 'medium';
    }
  } else {
    v.dureeArretMs += deltaSecondes * 1000;

    // Duree d'arret : courte pour Taxi-be (arret voyageur), longue pour autres
    const dureeMax = type.arretChance > 0.05
      ? rnd(1200, 4000)
      : rnd(2500, 8000);

    if (v.dureeArretMs >= dureeMax) {
      // Reprise du mouvement
      v.arrete       = false;
      v.dureeArretMs = 0;
      v.chocDetecte  = false;
      v.severite     = 'low';
      v.vitesseKmh   = jitter(v.vitesseKmh, 8, type.vitesseMin, type.vitesseMax);
    } else {
      // Alerte embouteillage apres 3s d'immobilisation (hors Taxi-be)
      if (
        v.typeKey !== 'TAXIBE' &&
        v.dureeArretMs >= 3000 &&
        v.dureeArretMs < 3000 + deltaSecondes * 1000
      ) {
        anomalie = creerAnomalie(
          'warning',
          `CAP-TRF-${String(v.id % 99).padStart(2, '0')}`,
          v.axeLabel,
          `${v.typeLabel} immobilise depuis ${Math.round(v.dureeArretMs / 1000)} s. ` +
          `Embouteillage ou panne sur l'axe ${v.axeLabel}, Fianarantsoa.`,
          v.lat,
          v.lng,
        );
      }
      // Pas de mise a jour de position pendant l'arret
      return anomalie;
    }
  }

  // ── Calcul de la distance a parcourir ce delta ───────────────────────────
  // Vitesse effective = vitesse de base * facteur de proximite anomalie
  const vitesseEffective = v.vitesseKmh * facteurVitesse;

  // Conversion km/h → deg/s
  const vitesseDegSec = (vitesseEffective * DEG_PAR_KM) / 3600;

  // Plafond de securite : jamais plus de 2 segments par frame
  // (protege contre les gros deltas, ex: onglet mis en veille)
  const distanceMax = (nbSegments * 2) / Math.max(nbSegments, 1);
  let   distRest    = Math.min(vitesseDegSec * deltaSecondes, distanceMax);

  let segIdx = v.segIdx;
  let segT   = v.segT;
  let avance = v.avance;

  // ── Boucle de report de surplus entre segments ───────────────────────────
  for (let iter = 0; iter < 5 && distRest > 1e-10; iter++) {
    const iA = clamp(segIdx,     0, points.length - 1);
    const iB = clamp(segIdx + 1, 0, points.length - 1);
    const pA = points[iA];
    const pB = points[iB];
    if (!pA || !pB) break;

    const longueur = longueurSegment(pA, pB);
    if (longueur < 1e-10) {
      // Segment degenere — on passe directement au suivant
      segIdx = avance ? segIdx + 1 : segIdx - 1;
      segT   = avance ? 0 : 1;
      break;
    }

    const dT = distRest / longueur;

    if (avance) {
      segT += dT;
      if (segT >= 1) {
        distRest  = (segT - 1) * longueur;
        segT      = 0;
        segIdx++;
        if (segIdx >= nbSegments) {
          // Fin du trajet aller — demi-tour
          segIdx        = nbSegments - 1;
          segT          = 1;
          avance        = false;
          distRest      = 0;
          v.phaseTrajet = 1;
          v.destination = AXES[v.axeCle]?.points?.[0] ? 'Depart initial' : v.destination;
          v.mission     = v.mission.replace(/—.*$/, `— Retour`);
        }
      } else {
        distRest = 0;
      }
    } else {
      segT -= dT;
      if (segT <= 0) {
        distRest  = Math.abs(segT) * longueur;
        segT      = 1;
        segIdx--;
        if (segIdx < 0) {
          // Fin du retour — reprise du trajet aller
          segIdx        = 0;
          segT          = 0;
          avance        = true;
          distRest      = 0;
          v.phaseTrajet = 0;
          v.destination = derniereDestination(v.axeCle);
          v.mission     = v.mission.replace(/— Retour$/, `— En service`);
        }
      } else {
        distRest = 0;
      }
    }
  }

  // ── Interpolation GPS finale — position sur le segment resultant ──────────
  const iAFinal = clamp(segIdx,     0, points.length - 1);
  const iBFinal = clamp(segIdx + 1, 0, points.length - 1);
  const pAFinal = points[iAFinal];
  const pBFinal = points[iBFinal];

  if (pAFinal && pBFinal) {
    const t  = clamp(segT, 0, 1);
    v.lat    = lerp(pAFinal[0], pBFinal[0], t);
    v.lng    = lerp(pAFinal[1], pBFinal[1], t);
  }

  // Persistance de l'etat de navigation
  v.segIdx     = clamp(segIdx, 0, nbSegments - 1);
  v.segT       = clamp(segT, 0, 1);
  v.avance     = avance;

  // Legere variation de vitesse pour un rendu organique
  v.vitesseKmh = jitter(v.vitesseKmh, 0.5, type.vitesseMin, type.vitesseMax);

  return anomalie;
}

// =============================================================================
// FABRIQUE D'ANOMALIES
// =============================================================================

let compteurAnomalie = 1;

/**
 * Cree un objet anomalie normalise.
 * @param {'critical'|'warning'|'info'} priorite
 * @param {string} capteur   — code du capteur declencheur
 * @param {string} zone      — libelle de la zone geographique
 * @param {string} desc      — description technique
 * @param {number} lat       — latitude du point d'incident
 * @param {number} lng       — longitude du point d'incident
 * @returns {object}
 */
function creerAnomalie(priorite, capteur, zone, desc, lat, lng) {
  return {
    id:          `ALT-FKT-${String(compteurAnomalie++).padStart(3, '0')}`,
    priority:    priorite,
    time:        new Date().toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit' }),
    sensor:      capteur,
    zone,
    description: desc,
    position:    [lat, lng],
    reported:    false,
    timestamp:   new Date().toISOString(),
    rayon:       0.002,   // Rayon d'influence (~220m)
  };
}

// =============================================================================
// HOOK PRINCIPAL — useCitySimulation
// =============================================================================

/**
 * useCitySimulation
 *
 * Retourne :
 *   simulationRef  {React.MutableRefObject} — reference vers l'etat mutable
 *                   simulationRef.current.vehicles : tableau de 157 vehicules
 *                   lu par CityMap.jsx canvas a 60 FPS sans re-render.
 *
 *   metrics        {Array<MetriqueEnv>}  — mis a jour toutes les 2.5s
 *   anomalies      {Array<Anomalie>}     — accumule les evenements detectes
 *   kpis           {object}             — { vehicles, accidents, congestion }
 */
export default function useCitySimulation() {

  // ── Etat mutable partage avec le canvas — jamais dans useState ───────────
  const simulationRef = useRef(null);
  if (simulationRef.current === null) {
    simulationRef.current = {
      vehicles:   construireVehicules(),
      metriques:  construireMetriques(),
      anomalies:  construireAnomaliesInitiales(),
    };
  }

  // ── Etat React — uniquement pour les panneaux lateraux ───────────────────
  const [metrics, setMetrics] = useState(() =>
    Object.values(simulationRef.current.metriques)
  );
  const [anomalies, setAnomalies] = useState(
    () => [...simulationRef.current.anomalies]
  );
  const [kpis, setKpis] = useState({
    vehicles:   GABARIT_FLOTTE.length,
    accidents:  0,
    congestion: 0,
  });

  // ── References internes de la boucle rAF ─────────────────────────────────
  const anomaliesEnAttente = useRef([]);
  const dernierTickLent    = useRef(performance.now());
  const derniereFrame      = useRef(performance.now());
  const rafId              = useRef(null);

  // ── Boucle d'animation principale a 60 FPS ───────────────────────────────
  const animer = useCallback(() => {
    const maintenant = performance.now();
    // Cap a 100ms pour eviter les gros sauts apres mise en veille de l'onglet
    const deltaSec   = clamp((maintenant - derniereFrame.current) / 1000, 0, 0.1);
    derniereFrame.current = maintenant;

    const sim = simulationRef.current;
    if (!sim) {
      rafId.current = requestAnimationFrame(animer);
      return;
    }

    // Avancer tous les vehicules sur leurs rails
    for (let i = 0; i < (sim.vehicles?.length ?? 0); i++) {
      const v = sim.vehicles[i];
      if (!v) continue;
      const anomalie = avancerVehicule(v, deltaSec, sim.anomalies);
      if (anomalie) anomaliesEnAttente.current.push(anomalie);
    }

    // ── Tick lent — mise a jour React toutes les 2.5 s ────────────────────
    if (maintenant - dernierTickLent.current >= INTERVALLE_TICK_LENT_MS) {
      dernierTickLent.current = maintenant;

      const picPolluant = Math.random() < 0.08;
      const m           = sim.metriques;
      const ts          = new Date().toISOString();

      // Simulation des metriques calibrees Fianarantsoa
      // CO2 : base 390-420 ppm, pic possible jusqu'a 650 (feux de biomasse)
      const valCO2 = picPolluant
        ? jitter(m.co2.value, 100, 380, 650)
        : jitter(m.co2.value, 4,   390, 430);

      // PM2.5 : base 8-15, pic possible jusqu'a 45 (brulage agricole)
      const valPM25 = picPolluant
        ? jitter(m.pm25.value, 15, 10, 45)
        : jitter(m.pm25.value, 1.5, 8, 15);

      const valTrafic = jitter(m.trafic.value, 4, 28, 90);

      sim.metriques = {
        co2: {
          ...m.co2,
          value:     Math.round(valCO2),
          fill:      Math.round((valCO2 / m.co2.max) * 100),
          status:    calcStatut(valCO2, 450, 600),
          updatedAt: ts,
        },
        pm25: {
          ...m.pm25,
          value:     parseFloat(valPM25.toFixed(1)),
          fill:      Math.round((valPM25 / m.pm25.max) * 100),
          status:    calcStatut(valPM25, 15, 30),
          updatedAt: ts,
        },
        trafic: {
          ...m.trafic,
          value:     Math.round(valTrafic),
          fill:      Math.round(valTrafic),
          status:    calcStatut(valTrafic, 65, 85),
          updatedAt: ts,
        },
      };

      // Anomalie de pic de pollution
      if (picPolluant && valCO2 > 480) {
        const zones = [
          'Anjoma — RN7',
          'Ampasambazaha',
          'Haute Ville',
          'Tanambao',
          'Gare FCE',
          'Beravina',
          'Talatamaty',
        ];
        const zone = zones[rndInt(0, zones.length - 1)];
        anomaliesEnAttente.current.push(creerAnomalie(
          valCO2 > 580 ? 'critical' : 'warning',
          `CAP-ENV-${rndInt(10, 99)}`,
          zone,
          `Pic de pollution atmospherique : CO2 ${Math.round(valCO2)} ppm, ` +
          `PM2.5 ${valPM25.toFixed(1)} µg/m3. ` +
          `Origine probable : feux de biomasse ou trafic dense. ` +
          `Secteur : ${zone}, Fianarantsoa.`,
          ...CITY_CENTER,
        ));
      }

      // Fusion des anomalies accumulees
      if (anomaliesEnAttente.current.length > 0) {
        sim.anomalies = [
          ...anomaliesEnAttente.current,
          ...sim.anomalies,
        ].slice(0, MAX_ANOMALIES);
        anomaliesEnAttente.current = [];
        setAnomalies([...sim.anomalies]);
      }

      // Comptage des incidents recents pour les KPI
      const recents    = (sim.anomalies ?? []).slice(0, 12);
      const accidents  = recents.filter(a => a?.priority === 'critical').length;
      const congestion = recents.filter(a => a?.priority === 'warning').length;

      // Publication vers React
      setMetrics(Object.values(sim.metriques));
      setKpis({
        vehicles:   (sim.vehicles?.length ?? 0),
        accidents,
        congestion,
      });
    }

    rafId.current = requestAnimationFrame(animer);
  }, []);

  // ── Cycle de vie — demarrage et nettoyage ─────────────────────────────────
  useEffect(() => {
    derniereFrame.current = performance.now();
    rafId.current = requestAnimationFrame(animer);

    return () => {
      // Annulation propre — empeche les mises a jour sur composant demonte
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [animer]);

  return {
    /**
     * simulationRef — reference mutable vers { vehicles[], metriques, anomalies[] }
     * A lire dans CityMap.jsx via simulationRef.current.vehicles dans la boucle canvas.
     * NE PAS passer cette ref a useState — cela annulerait le gain de performance.
     */
    simulationRef,

    /**
     * metrics — Array<MetriqueEnv>
     * Chaque element : { id, label, sublabel, value, unit, max, fill, status, reference, updatedAt }
     * Compatible avec les props attendues par Metrics.jsx.
     */
    metrics,

    /**
     * anomalies — Array<Anomalie>
     * Chaque element : { id, priority, time, sensor, zone, description, position, reported, timestamp }
     * Compatible avec les props attendues par Sidebar.jsx et CityMap.jsx.
     */
    anomalies,

    /**
     * kpis — { vehicles: number, accidents: number, congestion: number }
     * Compteurs synthetiques pour les cartes KPI de Metrics.jsx.
     */
    kpis,
  };
}
