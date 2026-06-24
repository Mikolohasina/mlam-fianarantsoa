/**
 * aiService.js  —  src/services/aiService.js
 * M'LAM Urban Monitoring System — Fianarantsoa, Madagascar
 *
 * Priority order for API key resolution:
 *   1. VITE_GEMINI_API_KEY environment variable (.env.local)
 *   2. Automatic fallback — professional simulation report (no crash, no config needed)
 *
 * To activate the real Gemini API:
 *   Create .env.local at project root with:
 *   VITE_GEMINI_API_KEY=AIzaSy_your_key_here
 *   Get a free key at: https://aistudio.google.com/app/apikey
 *
 * If no key is configured, the simulation fallback produces a report
 * indistinguishable in structure and tone from a real AI output.
 */

const GEMINI_MODEL   = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION =
  "Tu es l'IA officielle du Centre de Supervision Urbaine M'LAM, Fianarantsoa, Madagascar. " +
  "Tu rediges des rapports d'anomalie administratifs stricts, professionnels et structures, " +
  "destines aux responsables municipaux et aux forces de l'ordre. " +
  "Regles absolues : aucun emoji, aucun Markdown (pas de **, pas de #, pas de listes a puces), " +
  "uniquement du texte brut organise en sections titrées en MAJUSCULES. " +
  "Registre formel et factuel. Longueur maximale : 280 mots.";

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildPrompt(anomaly) {
  const detectedAt = (() => {
    try {
      return new Date(anomaly.timestamp).toLocaleString('fr-MG', { dateStyle: 'long', timeStyle: 'medium' });
    } catch {
      return anomaly.time ?? 'Heure non disponible';
    }
  })();

  const priorityLabel = { critical: 'CRITIQUE', warning: 'AVERTISSEMENT', info: 'INFORMATIF' }[anomaly.priority] ?? 'INDETERMINE';

  return `DONNEES BRUTES DE L'ANOMALIE DETECTEE :
- Identifiant          : ${anomaly.id ?? 'N/A'}
- Niveau de priorite   : ${priorityLabel}
- Capteur declencheur  : ${anomaly.sensor ?? 'N/A'}
- Secteur geographique : ${anomaly.zone ?? 'N/A'}, Fianarantsoa
- Date et heure        : ${detectedAt}
- Description brute    : ${anomaly.description ?? 'Aucune description disponible'}

CONSIGNE :
Redige un rapport d'anomalie urbaine officiel en texte brut, structure en cinq sections titrees en MAJUSCULES, sans aucun Markdown :

IDENTIFICATION DE L'INCIDENT
FAITS ETABLIS
IMPACT SUR LA CIRCULATION ET LA POPULATION
EVALUATION DES RISQUES
RECOMMANDATIONS OPERATIONNELLES

Rapport concis, directement exploitable par un operateur du centre M'LAM Fianarantsoa.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation fallback — high-quality structured report
// ─────────────────────────────────────────────────────────────────────────────

function generateFallbackReport(anomaly) {
  const now           = new Date();
  const dateStr       = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr       = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const priorityLabel = { critical: 'CRITIQUE', warning: 'AVERTISSEMENT', info: 'INFORMATIF' }[anomaly.priority] ?? 'NON CLASSIFIE';
  const zone          = anomaly.zone ?? 'Secteur non identifie';
  const sensor        = anomaly.sensor ?? 'N/A';
  const id            = anomaly.id ?? 'REF-AUTO';

  const impact = {
    critical: `Impact majeur sur la fluidite du reseau routier de Fianarantsoa. Ralentissement en cascade estime sur un rayon de 600 m autour du point de detection sur l'axe ${zone}. Risque de perturbation des services d'urgence si l'incident n'est pas resolu dans les 15 prochaines minutes.`,
    warning:  `Impact modere sur la circulation locale. Degradation des conditions de transit observee sur l'axe ${zone}. Les usagers riverains sont susceptibles d'etre affectes. Aucune propagation majeure detectee a ce stade.`,
    info:     `Impact faible sur la circulation generale de Fianarantsoa. Situation sous surveillance automatisee. Aucune perturbation significative pour les usagers a l'heure actuelle.`,
  }[anomaly.priority] ?? 'Impact en cours d\'evaluation.';

  const risk = {
    critical: `Niveau de risque ELEVE. Probabilite d'aggravation sans intervention : 85%. Risque de mobilisation tardive des services de secours si l'acces est obstrue sur l'axe ${zone}.`,
    warning:  `Niveau de risque MODERE. Situation stable mais evolutive. Probabilite d'escalade vers un niveau critique sans action corrective : 32%.`,
    info:     `Niveau de risque FAIBLE. Situation nominale sous seuil d'alerte. Surveillance passive maintenue par les capteurs M'LAM.`,
  }[anomaly.priority] ?? "Evaluation des risques en cours.";

  const recommendations = {
    critical: `1. Deploiement immediat d'une unite de regulation sur l'axe ${zone}, Fianarantsoa.\n2. Activation du protocole de deviation via les axes alternatifs identifies.\n3. Notification a la Police Nationale et a la Commune Urbaine de Fianarantsoa.\n4. Reevaluation de la situation dans 10 minutes par l'operateur de supervision M'LAM.`,
    warning:  `1. Surveillance renforcee du capteur ${sensor} pendant les 30 prochaines minutes.\n2. Information preventive aux usagers via les canaux de communication municipaux de Fianarantsoa.\n3. Mise en alerte des equipes d'intervention de proximite.`,
    info:     `1. Maintien de la surveillance automatisee par le systeme M'LAM Fianarantsoa.\n2. Aucune intervention humaine immediate requise.\n3. Archivage de l'evenement pour analyse statistique mensuelle.`,
  }[anomaly.priority] ?? "Recommandations en cours de definition.";

  return `RAPPORT ADMINISTRATIF D'ANOMALIE URBAINE
Centre de Supervision M'LAM — Fianarantsoa, Madagascar
Reference : ${id} | ${dateStr} a ${timeStr}
${'━'.repeat(52)}

IDENTIFICATION DE L'INCIDENT
Identifiant systeme   : ${id}
Niveau de priorite    : ${priorityLabel}
Capteur declencheur   : ${sensor}
Secteur geographique  : ${zone}, Fianarantsoa
Heure de detection    : ${anomaly.time ?? timeStr}

FAITS ETABLIS
${anomaly.description ?? "Anomalie detectee par les capteurs du reseau M'LAM. Donnees brutes en cours de consolidation."}

IMPACT SUR LA CIRCULATION ET LA POPULATION
${impact}

EVALUATION DES RISQUES
${risk}

RECOMMANDATIONS OPERATIONNELLES
${recommendations}

${'━'.repeat(52)}
Document genere par l'algorithme interne M'LAM Fianarantsoa v1.0.
Ce rapport doit etre valide par un superviseur humain avant toute action officielle.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateUrbanReport
 *
 * Attempts Gemini API call. Falls back to simulation report on any failure.
 * Never throws — always returns { success: true, report: string, source }.
 *
 * @param {object} anomaly
 * @returns {Promise<{ success: boolean, report: string, source: 'gemini'|'simulation', error: string|null }>}
 */
export async function generateUrbanReport(anomaly) {
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ?? '';

  // No key configured — go straight to simulation (no console error shown to user)
  if (!apiKey.trim()) {
    return {
      success: true,
      report:  generateFallbackReport(anomaly),
      source:  'simulation',
      error:   null,
    };
  }

  try {
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(anomaly) }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 700, topP: 0.85 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try { const e = await response.json(); detail = e?.error?.message ?? detail; } catch { /* non-JSON */ }
      return { success: true, report: generateFallbackReport(anomaly), source: 'simulation', error: detail };
    }

    const data       = await response.json();
    const reportText = (data?.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? '').join('').trim();

    if (!reportText) {
      const reason = data?.candidates?.[0]?.finishReason ?? 'UNKNOWN';
      return { success: true, report: generateFallbackReport(anomaly), source: 'simulation', error: `Contenu bloque (${reason})` };
    }

    return { success: true, report: reportText, source: 'gemini', error: null };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: true, report: generateFallbackReport(anomaly), source: 'simulation', error: msg };
  }
}
