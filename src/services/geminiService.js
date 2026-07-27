/**
 * geminiService.js  —  src/services/geminiService.js
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Service d'analyse predictive globale via Google Gemini.
 * Distinct de aiService.js (rapports d'anomalie individuels) :
 * ce module produit une analyse synthetique de l'etat global du reseau,
 * avec recommandations operationnelles sous forme de liste.
 *
 * Configuration :
 *   Creer .env.local a la racine avec :
 *   VITE_GEMINI_API_KEY=AIzaSy_votre_cle_ici
 *   Cle gratuite : https://aistudio.google.com/app/apikey
 *
 * Comportement de secours :
 *   Si la cle est absente, invalide, ou si l'appel reseau echoue, le service
 *   bascule automatiquement sur une analyse generee localement a partir des
 *   memes donnees — aucun crash, aucune interruption de la demonstration.
 */

const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION =
  "Tu es l'IA de supervision urbaine du systeme M'LAM pour la ville de Fianarantsoa, Madagascar. " +
  "Tu es un expert en urbanisme et en regulation du trafic. " +
  "Reponds uniquement en texte brut, sans Markdown (pas de **, pas de #). " +
  "Pour les listes d'actions, utilise des tirets simples suivis d'un espace, un par ligne. " +
  "Reste factuel, concis et oriente action. Longueur maximale : 200 mots.";

// ─────────────────────────────────────────────────────────────────────────────
// Construction du prompt a partir des donnees de simulation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formate les metriques et anomalies en un prompt precis pour Gemini.
 *
 * @param {Array}  metrics    — tableau de metriques (co2, pm25, traffic)
 * @param {Array}  anomalies  — anomalies actives
 * @returns {string}
 */
function construirePrompt(metrics, anomalies) {
  const m = Object.fromEntries((metrics ?? []).map(item => [item.id, item]));

  const co2     = m.co2?.value     ?? 'N/A';
  const pm25    = m.pm25?.value    ?? 'N/A';
  const trafic  = m.traffic?.value ?? 'N/A';

  const listeAnomalies = (anomalies ?? []).slice(0, 10);
  const nbCritiques    = listeAnomalies.filter(a => a?.priority === 'critical').length;
  const nbAvertiss     = listeAnomalies.filter(a => a?.priority === 'warning').length;

  const detailAnomalies = listeAnomalies.length > 0
    ? listeAnomalies.map(a =>
        `  - [${(a.priority ?? 'info').toUpperCase()}] ${a.zone ?? 'Zone inconnue'} : ${a.description ?? 'Aucune description'}`
      ).join('\n')
    : '  - Aucune anomalie active actuellement.';

  return `ETAT ACTUEL DE LA SUPERVISION URBAINE — FIANARANTSOA :

QUALITE DE L'AIR :
  - CO2 : ${co2} ppm
  - PM2.5 : ${pm25} µg/m3

TRAFIC :
  - Densite globale du reseau : ${trafic}%
  - Anomalies critiques : ${nbCritiques}
  - Anomalies d'avertissement : ${nbAvertiss}

DETAIL DES ANOMALIES ACTIVES :
${detailAnomalies}

CONSIGNE :
Analyse la situation actuelle de la circulation sur la RN7 et des axes secondaires de Fianarantsoa.
Propose exactement 3 actions immediates de regulation, sous forme de 3 lignes commencant
chacune par un tiret suivi d'un espace. Chaque action doit etre concrete, executable
immediatement par le centre de supervision, et adaptee aux donnees ci-dessus.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyse de secours — generee localement si l'API est indisponible
// ─────────────────────────────────────────────────────────────────────────────

function genererAnalyseSecours(metrics, anomalies) {
  const m = Object.fromEntries((metrics ?? []).map(item => [item.id, item]));
  const co2    = m.co2?.value     ?? 0;
  const trafic = m.traffic?.value ?? 0;

  const listeAnomalies = (anomalies ?? []).slice(0, 10);
  const nbCritiques    = listeAnomalies.filter(a => a?.priority === 'critical').length;
  const accidents      = listeAnomalies.filter(a => a?.type === 'accident');
  const embouteillages = listeAnomalies.filter(a => a?.type === 'embouteillage');

  const constat = nbCritiques > 0
    ? `Situation tendue sur le reseau de Fianarantsoa : ${nbCritiques} anomalie(s) critique(s) active(s), densite de trafic a ${trafic}%.`
    : trafic > 70
      ? `Trafic dense sur le reseau (${trafic}%), mais aucune anomalie critique active. Surveillance preventive recommandee.`
      : `Reseau de Fianarantsoa globalement fluide. Densite de trafic a ${trafic}%, qualite de l'air stable (${co2} ppm CO2).`;

  const actions = [];

  if (accidents.length > 0) {
    actions.push(`- Deployer une unite de regulation sur ${accidents[0].zone ?? "l'axe concerne"} pour degager le segment accidente.`);
  } else {
    actions.push(`- Maintenir la surveillance automatisee sur l'ensemble des axes, sans intervention immediate requise.`);
  }

  if (embouteillages.length > 0) {
    actions.push(`- Activer un itineraire de deviation temporaire sur ${embouteillages[0].zone ?? 'la RN7'} pour fluidifier la circulation.`);
  } else if (trafic > 70) {
    actions.push(`- Anticiper une regulation des feux de signalisation sur la RN7 en cas de hausse continue du trafic.`);
  } else {
    actions.push(`- Poursuivre la collecte de donnees pour affiner les previsions de trafic des prochaines heures.`);
  }

  if (co2 > 500) {
    actions.push(`- Renforcer les capteurs environnementaux dans les secteurs a forte pollution et informer les autorites sanitaires.`);
  } else {
    actions.push(`- Continuer le monitoring environnemental standard, aucune action corrective requise pour la qualite de l'air.`);
  }

  return `${constat}\n\n${actions.join('\n')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction publique — analyzeUrbanStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * analyzeUrbanStatus
 *
 * Envoie l'etat courant de la simulation a Gemini pour obtenir une analyse
 * et des recommandations operationnelles. Bascule automatiquement sur une
 * analyse locale si l'API est indisponible — ne leve jamais d'exception.
 *
 * @param {Array} metrics   — metriques environnementales et trafic
 * @param {Array} anomalies — anomalies actives
 * @returns {Promise<{
 *   success: boolean,
 *   analysis: string,
 *   source: 'gemini' | 'simulation',
 *   error: string | null,
 * }>}
 */
export async function analyzeUrbanStatus(metrics, anomalies) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY ?? '';

  if (!apiKey.trim()) {
    return {
      success:  true,
      analysis: genererAnalyseSecours(metrics, anomalies),
      source:   'simulation',
      error:    null,
    };
  }

  try {
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: construirePrompt(metrics, anomalies) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 500, topP: 0.85 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try { const e = await response.json(); detail = e?.error?.message ?? detail; } catch { /* non-JSON */ }
      return {
        success:  true,
        analysis: genererAnalyseSecours(metrics, anomalies),
        source:   'simulation',
        error:    detail,
      };
    }

    const data     = await response.json();
    const texte    = (data?.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? '').join('').trim();

    if (!texte) {
      const raison = data?.candidates?.[0]?.finishReason ?? 'UNKNOWN';
      return {
        success:  true,
        analysis: genererAnalyseSecours(metrics, anomalies),
        source:   'simulation',
        error:    `Contenu bloque (${raison})`,
      };
    }

    return { success: true, analysis: texte, source: 'gemini', error: null };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success:  true,
      analysis: genererAnalyseSecours(metrics, anomalies),
      source:   'simulation',
      error:    message,
    };
  }
}
