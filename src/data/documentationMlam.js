// ═══════════════════════════════════════════════════════════════════════════
// EMPLACEMENT : src/App.jsx (ou src/data/documentationMlam.js si tu préfères
// l'isoler dans un fichier séparé et l'importer avec 
// dans SectionDocumentation).
// ═══════════════════════════════════════════════════════════════════════════

export const DOCUMENTATION_MLAM = {

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPITRE 1 — FONDEMENTS PHILOSOPHIQUES & CONTEXTE URBAIN
  // ─────────────────────────────────────────────────────────────────────────
  chapitre1: {
    numero: 1,
    titre: 'Fondements Philosophiques & Contexte Urbain',
    sousTitre: 'Branding, étymologie opérationnelle et objectifs stratégiques',
    sections: [
      {
        id: 'etymologie',
        titre: 'Étymologie opérationnelle',
        contenu: `Le nom "M'LAM" (Mikolo's Learned App Monitoring) n'est pas qu'un acronyme technique : il puise sa racine sémantique dans le terme malagasy "Milamina", qui désigne un état de calme, d'ordre et d'équilibre systémique. Cette étymologie n'est pas décorative — elle constitue le cadre conceptuel structurant l'ensemble de l'architecture applicative.

En ingénierie des systèmes urbains, la notion de "Milamina" se traduit par trois propriétés mesurables que la plateforme s'attache à modéliser, quantifier et restituer visuellement :

1. L'ORDRE (Fluidité de circulation) — traduit en Indicateur de Performance Clé (KPI) sous la forme du "Taux de Congestion Global" (%), calculé en temps réel à partir de la densité véhiculaire par segment routier.

2. LE CALME (Stabilité environnementale) — traduit en KPI sous la forme des concentrations de CO2 (ppm) et de particules fines PM2.5 (µg/m³), suivies par géofencing sur les polygones administratifs des quartiers de Fianarantsoa.

3. L'HARMONIE SYSTÉMIQUE (Prospérité soutenable) — traduit en KPI composite croisant le taux d'incidents critiques résolus, le délai moyen de transmission des rapports aux autorités compétentes, et la stabilité des seuils environnementaux dans le temps.

La devise institutionnelle de la plateforme — "Ho an'ny tanàna milamina sy mandroso" (Pour une ville harmonieuse et prospère) — synthétise cette philosophie : un système de supervision urbaine n'a de valeur que s'il transforme la donnée brute en une trajectoire mesurable vers l'harmonie collective, et non en simple accumulation de métriques.`,
      },
      {
        id: 'objectifs-strategiques',
        titre: 'Objectifs stratégiques',
        contenu: `M'LAM v1.0 répond à un enjeu de modélisation prédictive et réactive face à l'augmentation structurelle de la densité routière sur les axes névralgiques de Fianarantsoa, en particulier la Route Nationale 7 (RN7), artère de liaison inter-régionale, ainsi que les voies secondaires de desserte urbaine (Haute Ville, Tsianolondroa, Ampasambazaha, Talatamaty, Anjoma).

Trois objectifs stratégiques structurent le cahier des charges fonctionnel de la plateforme :

Objectif I — Résilience routière : anticiper et visualiser en temps réel les points de saturation du réseau afin de permettre une réaction opérationnelle proportionnée (déviation, régulation, intervention).

Objectif II — Vigilance sanitaire environnementale : établir une corrélation quantifiable et auditable entre l'intensité du trafic routier et la dégradation de la qualité de l'air par quartier, condition préalable à toute politique publique de réduction des émissions.

Objectif III — Gouvernance interinstitutionnelle : fournir aux autorités compétentes (centre de commandement municipal, Direction Régionale du Ministère de l'Environnement et du Développement Durable) des rapports structurés, horodatés et sécurisés, réduisant le délai entre détection d'anomalie et décision publique.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPITRE 2 — ARCHITECTURE LOGICIELLE & ÉCOSYSTÈME TECHNIQUE
  // ─────────────────────────────────────────────────────────────────────────
  chapitre2: {
    numero: 2,
    titre: 'Architecture Logicielle & Écosystème Technique',
    sousTitre: 'Pile technologique (Stack) et interconnexion des composants',
    sections: [
      {
        id: 'react',
        titre: 'React 18+ — Architecture modulaire descendante',
        contenu: `La couche de présentation applicative repose sur React 18, exploitant une architecture modulaire descendante (top-down component tree) dont la racine unique est le composant App.jsx. Ce composant orchestrateur centralise l'état global de l'application (état de simulation, préférences de personnalisation, sécurité, filtres de vue) et le propage par injection de props vers l'ensemble de l'arborescence de composants enfants (CityMap, Sidebar, Metrics, VueParametres).

La réactivité du système s'appuie sur le cycle de vie des Hooks React : useState pour l'état local synchrone, useEffect pour les effets de bord asynchrones (chargement des données géographiques, synchronisation des paramètres de simulation), useRef pour la persistance d'objets mutables hors du cycle de rendu (référence à la flotte de véhicules simulée, évitant une réconciliation DOM coûteuse à 60 images par seconde), et useMemo pour la mémoïsation des calculs dérivés (filtrage des anomalies par contexte de supervision actif).`,
      },
      {
        id: 'vite',
        titre: 'Vite — Assemblage à la volée et Hot Module Replacement',
        contenu: `L'environnement de développement et de production repose sur Vite, outil de build reposant sur les modules ECMAScript natifs du navigateur. Contrairement aux bundlers historiques opérant par empaquetage complet préalable, Vite exploite un mécanisme de compilation à la demande (on-demand compilation) : chaque module est transformé et servi individuellement lors de sa première requête par le navigateur, réduisant drastiquement le temps de démarrage du serveur de développement.

Le Hot Module Replacement (HMR) permet l'injection de modifications de code sans rechargement complet de la page, préservant l'état d'exécution de la simulation en cours (position des véhicules, indices de pollution accumulés) pendant les itérations de développement. En production, Vite délègue l'optimisation finale à Rollup, générant des bundles fractionnés (code-splitting) et minifiés, garantissant un temps de chargement initial optimisé pour un poste de supervision opérant en continu.`,
      },
      {
        id: 'tailwind',
        titre: 'Tailwind CSS — Design System atomique',
        contenu: `L'ensemble de la charte graphique de M'LAM repose sur Tailwind CSS, framework utilitaire appliquant un paradigme de design atomique : chaque classe CSS correspond à une propriété stylistique unique et composable, éliminant la duplication de règles CSS traditionnelles.

La direction artistique retenue — dénommée en interne "Blueprint / Ardoise mat" — s'appuie sur une palette de gris ardoise (slate-900 à slate-950) en fond, avec des accents de contraste élevé réservés exclusivement à la sémantique fonctionnelle (rouge pour le critique, ambre pour l'avertissement, émeraude pour le nominal). Cette charte est intentionnellement dépourvue de couleurs vives décoratives, conformément aux standards ergonomiques des postes de supervision opérant en continu (réduction de la fatigue visuelle, hiérarchisation immédiate de l'information critique). Un mode clair "papier technique" est disponible en alternative, reproduisant l'esthétique d'un cahier de plan d'architecte, avec inversion contrôlée du contraste texte/fond.`,
      },
      {
        id: 'leaflet',
        titre: 'React-Leaflet & Leaflet.js — Abstraction géographique',
        contenu: `La restitution cartographique s'appuie sur Leaflet.js, bibliothèque de cartographie interactive légère, encapsulée dans le paradigme déclaratif de React via React-Leaflet. Cette abstraction permet de représenter les couches cartographiques (TileLayer, Polyline, Marker) comme des composants React à part entière, synchronisés avec l'état applicatif.

La gestion des couches de tuiles (TileLayers) s'effectue de manière asynchrone via des requêtes HTTP vers des serveurs de tuiles distants (raster OpenStreetMap par défaut), avec gestion native de la mise en cache navigateur et du chargement progressif par niveau de zoom. Les tracés routiers (Polyline) et marqueurs d'anomalie (Marker) sont générés dynamiquement à partir des données de simulation, avec recalcul de projection géographique à chaque interaction utilisateur (pan, zoom).`,
      },
      {
        id: 'canvas',
        titre: 'HTML5 Canvas API — Rendu thermique des polluants',
        contenu: `La visualisation en temps réel des concentrations de polluants atmosphériques (nuages de chaleur par quartier) et des véhicules en mouvement repose sur l'API Canvas HTML5, exploitée en parallèle du rendu React-Leaflet sur des panes (calques) dédiés du conteneur cartographique.

Ce choix architectural délibéré évite la réconciliation du Virtual DOM React pour des éléments graphiques mutant à haute fréquence (jusqu'à 60 fois par seconde pour les véhicules) : la matrice de pixels du Canvas est directement manipulée via le contexte de rendu 2D (getContext('2d')), avec effacement et redessin complet à chaque frame (clearRect suivi de la boucle de rendu). Les zones de pollution par quartier sont projetées sous forme de dégradés radiaux (createRadialGradient) appliqués avec un filtre de flou gaussien (filter: blur), simulant visuellement la diffusion physique d'un nuage de particules dans l'atmosphère urbaine.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPITRE 3 — LE MOTEUR SIMULATEUR HYBRIDE & LOGIQUE DÉTERMINISTE
  // ─────────────────────────────────────────────────────────────────────────
  chapitre3: {
    numero: 3,
    titre: 'Le Moteur Simulateur Hybride & Logique Déterministe',
    sousTitre: 'Cycle de calcul, équation de cause à effet et rendu dynamique',
    sections: [
      {
        id: 'cycle-ticks',
        titre: 'Le Cycle des Ticks',
        contenu: `Le moteur de simulation M'LAM repose sur une architecture à deux flux temporels distincts, garantissant à la fois fluidité visuelle et stabilité des calculs métier.

Le flux rapide (rendu 60 images par seconde) est piloté par requestAnimationFrame, boucle native du navigateur synchronisée sur la fréquence de rafraîchissement de l'écran. Ce flux fait progresser chaque véhicule le long de son axe routier par interpolation linéaire (LERP) entre les points de coordonnées géographiques successifs, sans jamais déclencher de re-rendu React coûteux — la position des véhicules est mutée directement dans une référence mémoire (useRef) lue par le Canvas.

Le flux lent (tick applicatif, intervalle de 2,5 secondes) est encapsulé dans un hook useEffect combiné à une vérification temporelle interne (performance.now()). Ce cycle lent est responsable de la logique métier structurante : génération d'anomalies, ajustement de la congestion par axe, et mise à jour des métriques environnementales globales (CO2, PM2.5) affichées dans l'interface. Cette séparation des fréquences garantit que l'animation demeure fluide indépendamment de la complexité des calculs de simulation sous-jacents.`,
      },
      {
        id: 'equation-cause-effet',
        titre: 'Équation de Cause à Effet',
        contenu: `Le modèle mathématique de M'LAM établit une chaîne de causalité algorithmique déterministe entre paramètres de simulation et manifestations visuelles, structurée en cinq étapes séquentielles :

ÉTAPE 1 — Flux d'entrée : le paramètre "Véhicules simulés" (ajustable via slider dans le panneau Système) détermine le nombre d'entités injectées dans la simulation, réparties proportionnellement sur les axes routiers selon un système de pondération (l'axe RN7 recevant un coefficient de flux supérieur aux axes secondaires, reflétant sa fonction d'artère principale).

ÉTAPE 2 — Détermination de la densité routière locale : à chaque cycle de tick lent, le moteur calcule, pour chaque axe, le ratio de véhicules à l'arrêt ou en état d'alerte rapporté au nombre total de véhicules circulant sur ce segment.

ÉTAPE 3 — Mutation de l'état du segment : lorsque ce ratio dépasse un seuil de capacité critique d'absorption, l'axe bascule d'un état "Fluide" à un état "Critique / Embouteillage", déclenchant la génération d'une anomalie de type avertissement ou critique selon l'intensité mesurée.

ÉTAPE 4 — Activation du multiplicateur d'émissions : un segment en état d'embouteillage persistant active un facteur de génération de pollution proportionnel à la durée et à l'intensité de la congestion. Ce facteur alimente un indice de pollution normalisé (0 à 100) attaché à chaque route, avec accumulation amortie sur les axes saturés et dissipation progressive sur les axes redevenus fluides — reproduisant la dynamique physique réelle de diffusion et de résorption d'un nuage de pollution atmosphérique.

ÉTAPE 5 — Agrégation par géofencing quartier : les indices de pollution par axe sont pondérés par proximité géographique et cumulés sur les polygones administratifs des grands quartiers de Fianarantsoa (Centre-Ville, Tsianolondroa, Ampasambazaha, Talatamaty, Anjoma, Haute Ville), produisant les concentrations globales de CO2 (exprimées en parties par million, ppm) et de particules fines PM2.5 (exprimées en microgrammes par mètre cube, µg/m³) affichées au niveau agrégé de l'application.`,
      },
      {
        id: 'rendu-dynamique',
        titre: 'Rendu Dynamique — Recalcul graphique en temps réel',
        contenu: `La traduction visuelle de l'état du modèle mathématique s'effectue à chaque frame du Canvas de pollution : l'opacité (canal alpha) et le rayon du dégradé radial appliqué à chaque quartier sont recalculés proportionnellement à l'indice de pollution courant, avec une composante de pulsation sinusoïdale introduisant une variation temporelle organique évitant tout effet de rendu statique.

Le filtre de flou gaussien (Canvas 2D filter: blur) appliqué en surcouche du dégradé radial simule la diffusion physique des particules dans l'air ambiant, produisant un rendu visuellement cohérent avec la réalité observable d'un panache de pollution urbaine, tout en demeurant strictement dérivé de données numériques auditable et reproductibles.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPITRE 4 — PROTOCOLE DE GESTION DES ANOMALIES & RAPPORT IA
  // ─────────────────────────────────────────────────────────────────────────
  chapitre4: {
    numero: 4,
    titre: 'Protocole de Gestion des Anomalies & Rapport IA',
    sousTitre: 'Détection, classification et télétransmission institutionnelle',
    sections: [
      {
        id: 'algorithme-detection',
        titre: "Algorithme de Détection",
        contenu: `Le système de classification des anomalies repose sur une bascule automatisée à trois niveaux de criticité, appliquée de manière homogène aux domaines routier et environnemental :

Niveau INFORMATION — événement journalisé à titre de traçabilité, ne nécessitant aucune action immédiate (consignation au registre d'audit uniquement).

Niveau AVERTISSEMENT — seuil de tolérance dépassé sur un indicateur donné (congestion modérée sur un axe, dégradation notable de la qualité de l'air), déclenchant une surveillance renforcée et une notification aux opérateurs de terrain.

Niveau CRITIQUE — seuil de sécurité franchi (accident détecté, indice de pollution supérieur ou égal à 65 sur 100, concentration de PM2.5 dépassant le seuil configuré), déclenchant une procédure de transmission immédiate et prioritaire vers l'autorité compétente concernée.

Les seuils de déclenchement environnementaux (concentration critique de CO2 en ppm, concentration critique de PM2.5 en µg/m³) sont configurables en temps réel par l'opérateur habilité depuis le panneau Système & Simulation, permettant un ajustement fin de la sensibilité de détection selon le contexte opérationnel ou les recommandations sanitaires en vigueur.`,
      },
      {
        id: 'architecture-rapport-ia',
        titre: 'Architecture du Rapport IA et Télétransmission',
        contenu: `Lorsqu'une anomalie est sélectionnée par l'opérateur pour génération de rapport, le système exécute un processus structuré de parsing des métadonnées associées à l'événement : identifiant unique de référence, horodatage précis, coordonnées géographiques, capteur déclencheur, zone administrative concernée, et — pour les anomalies environnementales — indice de pollution mesuré, concentration estimée de PM2.5, et cause probable identifiée parmi un référentiel de facteurs causaux locaux (incinération de déchets à l'air libre, émissions industrielles diffuses, accumulation de gaz d'échappement en l'absence de vent).

Ces métadonnées structurées alimentent un moteur de génération de synthèse automatisée, produisant un document de rapport formaté selon un gabarit distinct en fonction de la nature de l'incident : les anomalies de circulation génèrent un rapport opérationnel adressé au centre de commandement, tandis que les anomalies environnementales génèrent un rapport explicitement adressé, dans son en-tête, à la Direction Régionale du Ministère de l'Environnement et du Développement Durable (MEDD), avec recommandations orientées politique publique (déploiement de capteurs fixes, campagnes de sensibilisation, régulation des zones industrielles proches des habitations).

La télétransmission de ce rapport est simulée selon un protocole de sécurité reproduisant les standards de chiffrement de bout en bout (AES-256) et de transport sécurisé (TLS 1.3), incluant une séquence d'accusé de réception : initialisation du canal chiffré, transmission des données, confirmation de réception par l'entité destinataire, puis validation d'enregistrement au registre d'audit interne de la plateforme, garantissant la traçabilité complète du cycle de vie de l'anomalie, de sa détection à sa prise en charge institutionnelle.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHAPITRE 5 — PROTOCOLE DE SÉCURITÉ, ACCÈS ET SOUVERAINETÉ DES DONNÉES
  // ─────────────────────────────────────────────────────────────────────────
  chapitre5: {
    numero: 5,
    titre: 'Protocole de Sécurité, Accès et Souveraineté des Données',
    sousTitre: 'Gouvernance RGPD, anonymisation et matrice des rôles',
    sections: [
      {
        id: 'gouvernance-rgpd',
        titre: 'Gouvernance RGPD / Confidentialité',
        contenu: `Conformément aux principes de protection des données personnelles applicables à la surveillance de flottes de véhicules en mouvement (notamment les Taxibes et véhicules privés circulant sur la voie publique), M'LAM intègre un module d'anonymisation cryptographique activable à la demande depuis le panneau Sécurité.

Ce module applique un hachage cryptographique (fonction SHA-256) sur les identifiants de plaques d'immatriculation avant toute persistance ou exportation de données, produisant un jeton anonymisé irréversible et non-corrélable à l'identité réelle du véhicule d'origine, tout en préservant la capacité analytique du système (suivi de trajectoires anonymisées, statistiques agrégées) sans exposition d'information personnelle identifiable. Cette fonctionnalité garantit la conformité du système avec les principes de minimisation des données et de protection de la vie privée dès la conception (privacy by design).`,
      },
      {
        id: 'matrice-roles',
        titre: 'Matrice des Rôles (RBAC)',
        contenu: `La gouvernance des accès à la plateforme M'LAM repose sur un modèle de contrôle d'accès basé sur les rôles (Role-Based Access Control), différenciant trois profils fonctionnels distincts :

Le profil OPÉRATEUR TRAFIC MUNICIPAL dispose d'un accès en supervision et intervention sur le domaine routier : consultation de la carte en temps réel, gestion des anomalies de circulation, génération de rapports opérationnels, sans accès aux fonctions de configuration système ou d'export réglementaire.

Le profil ADMINISTRATEUR SYSTÈME dispose de l'ensemble des privilèges de configuration : ajustement des paramètres de simulation, gestion des seuils d'alerte, personnalisation de l'affichage cartographique, activation des modules de sécurité, et gestion de la fréquence d'archivage des données.

Le profil AUDITEUR GOUVERNEMENTAL DU MINISTÈRE dispose d'un accès en lecture seule orienté conformité et reporting institutionnel : consultation des rapports environnementaux, export des bilans mensuels, vérification du registre d'audit des transmissions, sans capacité de modification des paramètres opérationnels de la plateforme.

Cette séparation stricte des privilèges garantit l'intégrité du processus de supervision urbaine, en isolant les responsabilités opérationnelles, techniques et de contrôle institutionnel, conformément aux principes de gouvernance des systèmes d'information critiques.`,
      },
    ],
  },

};

export default DOCUMENTATION_MLAM;
