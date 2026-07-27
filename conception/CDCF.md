

Markdown
# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT OFFICIEL : CAHIER DES CHARGES FONCTIONNEL (CDCF)
# PROJET            : M'LAM — M'Learned App Monitoring
# LOCALISATION      : Fianarantsoa, Madagascar
# VERSION           : 1.0 (Juillet 2026)
# statut            : EN COURS
# ─────────────────────────────────────────────────────────────────────────────

## 1. CONTEXTE ET OBJECTIFS STRATÉGIQUES

Le projet M'LAM s'inscrit dans l'initiative de modernisation technologique de la commune urbaine de Fianarantsoa. Face à la densification du trafic, à l'augmentation des risques d'accidents et aux besoins de réactivité des forces de l'ordre, M'LAM centralise les données de capteurs urbains simulés pour offrir une interface de contrôle unifiée et intelligente.

### 1.1 Objectif Principal
Développer une application web de supervision en temps réel (Dashboard) capable de cartographier la dynamique de la ville, de détecter automatiquement les anomalies de circulation, et d'assister les opérateurs via une Intelligence Artificielle générative pour la rédaction instantanée de rapports administratifs officiels.

---

## 2. PÉRIMÈTRE ET EXPRESSION DES BESOINS FONCTIONNELS

Le système doit répondre à cinq exigences fonctionnelles majeures, classées par ordre de priorité :

### [SF-01] Cartographie et Rendu Haute Performance (60 FPS)
*   **Description** : Affichage d'une carte vectorielle ou matricielle interactive de Fianarantsoa mettant en scène les flux de véhicules.
*   **Critère de succès** : Les animations de déplacement doivent s'exécuter à un taux constant de 60 images par seconde (FPS) sans verrouiller ou figer l'interface utilisateur.

### [SF-02] Détection et Cycle de Vie des Anomalies
*   **Description** : Capture en direct des incidents urbains (embouteillages, excès de vitesse, arrêts dangereux).
*   **Critère de succès** : Chaque incident génère une fiche d'anomalie structurelle comportant un niveau de priorité précis (`critical`, `warning`, `info`), un horodatage géolocalisé et un identifiant de capteur.

### [SF-03] Rédaction de Rapports Administratifs par IA
*   **Description** : Interrogation d'un grand modèle de langage (LLM) pour transformer les données brutes d'une anomalie en un compte-rendu officiel rigoureux.
*   **Contrainte stricte** : Le rapport doit adopter un registre formel, être structuré en 5 sections en MAJUSCULES, et être exempt de tout formatage Markdown (pas de puces, pas de gras) ou emoji. Longueur maximale : 280 mots.

### [SF-04] Résilience et Tolérance aux Pannes (Graceful Degradation)
*   **Description** : En cas de coupure réseau, d'erreur HTTP ou d'absence de clé d'activation API, le système ne doit pas bloquer l'opérateur.
*   **Critère de succès** : Bascule automatique et invisible vers un générateur algorithmique local qui injecte un rapport de simulation structurellement identique à la production de l'IA.

### [SF-05] Classification Légale des Véhicules
*   **Description** : Attribution et mise à jour en temps réel d'un indicateur de conformité sur chaque entité mobile de la simulation.
*   **Statuts requis** :
    *   `CLEAN` : Véhicule circulant selon les règles nominales.
    *   `SANCTIONNED` : Véhicule en infraction flagrante (ex: excès de vitesse).
    *   `CRITICAL_ACCIDENT` : Véhicule immobilisé suite à un choc, déclenchant instantanément un appel de détresse automatisé vers la centrale de secours.

---

## 3. CONTRAINTES TECHNIQUES ET ARCHITECTURALES



┌─────────────────────────────────────────────────────────────────────────┐
│ M'LAM FRONT-END SPA │
│ (React 18+ / Vite / Tailwind CSS / Thème Dynamique Light-Dark) │
└────────────────────────────────────┬────────────────────────────────────┘
│
┌───────────────────┴───────────────────┐
▼ ▼
┌──────────────────────────┐ ┌──────────────────────────┐
│ MOTEUR DE FLUX │ │ COUCHES INFRA (IA) │
│ Canvas API 2D Externe │ │ Google Gemini API REST │
│ (Mémoire par useRef) │ │ (gemini-2.0-flash) │
└──────────────────────────┘ └──────────────────────────┘



*   **Environnement d'exécution** : Application Web Monopage (SPA) compatible avec tous les navigateurs modernes (Chromium, Firefox, Safari).
*   **Sûreté des Clés** : Chargement des variables d'environnement via le gestionnaire sécurisé de Vite (`import.meta.env.VITE_GEMINI_API_KEY`) à partir d'un fichier local isolé `.env.local`.
*   **Gestion de l'état graphique** : Limitation stricte des rafraîchissements d'état React (`useState`) au profit de références directes (`useRef`) pour le stockage des structures mutables complexes (vecteurs de positions des véhicules).
x).
