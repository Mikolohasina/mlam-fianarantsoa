/**
 * main.jsx  —  src/main.jsx
 * M'LAM Urban Monitoring System — Point d'entrée de l'application
 *
 * Ordre d'importation CSS (impératif — ne pas modifier) :
 *   1. leaflet/dist/leaflet.css  — styles structurels de la carte
 *   2. ./index.css               — couches Tailwind + surcharges M'LAM
 *
 * Leaflet doit être chargé en premier pour que Tailwind ne remplace pas
 * accidentellement ses règles de positionnement des tuiles et popups.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'leaflet/dist/leaflet.css';
import './index.css';

import App from './App';

const conteneur = document.getElementById('root');

if (!conteneur) {
  throw new Error(
    "[M'LAM] Point de montage introuvable. " +
    "Verifiez que index.html contient <div id=\"root\"></div>."
  );
}

createRoot(conteneur).render(
  <StrictMode>
    <App />
  </StrictMode>
);
