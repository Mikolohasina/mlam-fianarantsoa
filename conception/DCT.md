Markdown
# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT OFFICIEL : DOSSIER DE CONCEPTION TECHNIQUE (DCT)
# PROJET            : M'LAM — Système de Supervision Urbaine Intelligente
# NORMATIVITÉ       : Modélisation Relationnelle (Merise) & Cinématique (UML)
# VERSION           : 1.0 (Juillet 2026)
# statut            : VALIDÉ
# ─────────────────────────────────────────────────────────────────────────────

## 1. ARCHITECTURE INTERNE ET DÉCOUPAGE MODULAIRE (SOC)

Pour respecter les standards internationaux de génie logiciel, l'application M'LAM applique le principe de **Séparation des Responsabilités** (Separation of Concerns). Le système est segmenté en trois modules autonomes :

1.  **La Couche Présentation (Vues et IHM - App.jsx)** : Reçoit les actions utilisateurs, orchestre l'affichage du tableau de bord (thèmes, compteurs environnementaux) et gère le cycle de vie de la modale de rapports.
2.  **La Couche Métier (Moteur Physique et Simulation - useCitySimulation.js)** : Module autonome gérant l'horloge système, les lois physiques de déplacement des véhicules à Fianarantsoa, le calcul matriciel des ralentissements, et la mutation de l'état des infractions.
3.  **La Couche Infrastructure (Accès Données et IA - aiService.js)** : Encapsule les requêtes HTTP asynchrones sortantes vers le cloud de Google, isole la clé API et implémente la logique d'exécution dégradée en cas de rupture réseau.

---

## 2. MODÉLISATION STATIQUE DES DONNÉES

Le dictionnaire des données structurelles de l'application repose sur deux entités clés, assurant un typage rigoureux lors des flux de données internes.

### 2.1 Spécification de l'Entité : VEHICULE (Vehicle)
Représente l'ensemble des agents mobiles supervisés en temps réel sur la carte de la ville.

| Attribut | Type de Donnée | Description / Énumération |
| :--- | :--- | :--- |
| `id` | Chaîne (String) | Identifiant unique et immuable du véhicule. |
| `type` | Énumération | Catégorie de l'agent : `car`, `truck`, `motorcycle`. |
| `vitesseActuelle`| Flottant (Float) | Vitesse de l'agent calculée en temps réel (km/h). |
| `status` | Énumération | État cinématique : `MOVING`, `PARKED`. |
| `legalStatus` | Énumération | Statut de conformité légale : `CLEAN`, `SANCTIONNED`, `CRITICAL_ACCIDENT`. |

### 2.2 Spécification de l'Entité : ANOMALIE (Anomaly)
Représente un incident capturé sur la voie publique par le réseau de capteurs urbains.

| Attribut | Type de Donnée | Description / Énumération |
| :--- | :--- | :--- |
| `id` | Chaîne (String) | Code de référence de l'alerte générée. |
| `priority` | Énumération | Niveau d'urgence : `critical`, `warning`, `info`. |
| `sensor` | Chaîne (String) | Nom de la balise ou du capteur à l'origine du signal. |
| `zone` | Chaîne (String) | Axe ou quartier de Fianarantsoa concerné par l'incident. |
| `time` | Chaîne (String) | Horodatage de l'événement (Format ISO/HH:MM:SS). |
| `description` | Chaîne (String) | Résumé textuel factuel des paramètres de l'anomalie. |

---

## 3. MODÉLISATION DYNAMIQUE : DIAGRAMME DE TRAITEMENT ASYNCHRONE

Le schéma ci-dessous modélise la cinématique d'exécution séquentielle mise en œuvre pour le traitement de la génération de rapport IA, garantissant la fluidité du Front-End (non-blocage de la boucle principale à 60 FPS).



[ ÉVÉNEMENT : Clic Opérateur sur Générer Rapport ]
│
▼
┌───────────────────────────┐
│ Activation Vue de Rendue │
│ • ouvert : true │
│ • chargement : true │
└─────────────┬─────────────┘
│
▼
[ APPEL ASYNCHRONE (Promise) ]
aiService.js -> generateUrbanReport()
│
┌─────────────┴─────────────┐
▼ ▼
[ Clé API Valide & Réseau OK ] [ Clé Absente / HTTP Error / Timeout ]
│ │
▼ ▼
┌──────────────────┐ ┌───────────────────────────┐
│ Requête REST │ │ Traitement de Secours │
│ Google Gemini │ │ Algorithme Local │
└────────┬─────────┘ └─────────────┬─────────────┘
│ │
└─────────────┬─────────────────┘
│
▼
┌───────────────────────────┐
│ Résolution de Promesse │
│ • rapport : Texte Brut │
│ • erreur : null │
│ • chargement : false │
└─────────────┬─────────────┘
│
▼
[ AFFICHAGE DU COMPTE-RENDU ]



---

## 4. STRATÉGIE DE RENDU ET D'ANIMATION HAUTE PERFORMANCE

Pour maintenir l'affichage à un taux strict de **60 images par seconde (FPS)**, l'application contourne le cycle de rafraîchissement standard de React. 

* **Problématique** : L'utilisation de l'état local (`useState`) pour stocker les coordonnées des véhicules provoquerait un re-rendu complet du DOM à chaque frame, causant un crash de performance immédiat.
* **Solution Technique** : L'arborescence des objets `Vehicule` est maintenue en mémoire vive brute au sein d'une référence React immuable (`useRef`). Le dessin géométrique est géré directement via l'API HTML5 Canvas 2D. La synchronisation se fait au pixel près à chaque pulsation de l'horloge native du navigateur via l'appel récursif à `requestAnimationFrame`.


