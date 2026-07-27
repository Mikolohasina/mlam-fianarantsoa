// src/services/aiService.js
// M'LAM Urban Monitoring System — Fianarantsoa, Madagascar

const GEMINI_MODEL   = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─────────────────────────────────────────────────────────────────────────────
// Générateur de rapport de secours — jamais de crash, toujours un résultat
// ─────────────────────────────────────────────────────────────────────────────

function generateFallbackReport(anomalie) {
  const zone     = anomalie?.zone        ?? 'Zone inconnue';
  const priorite = anomalie?.priority    ?? 'info';
  const capteur  = anomalie?.sensor      ?? 'N/A';
  const desc     = anomalie?.description ?? 'Incident detecte sur le reseau.';
  const heure    = anomalie?.time        ?? new Date().toLocaleTimeString('fr-MG', { hour: '2-digit', minute: '2-digit' });
  const estEnvironnemental = capteur.startsWith('CAP-ENV');

  // ── Branche POLLUTION — destinataire MEDD, aucune mention Police Municipale ──
  if (estEnvironnemental) {
    const niveauxPollution = {
      critical: {
        statut:  'CRITIQUE — Seuil sanitaire dépassé.',
        actions: [
          `Déployer une unité mobile de mesure de la qualité de l'air sur ${zone}.`,
          "Lancer une campagne de sensibilisation contre le brûlage des déchets à l'air libre dans le secteur.",
          "Évaluer la mise en place d'une régulation temporaire des zones industrielles/artisanales proches des habitations.",
        ],
      },
      warning: {
        statut:  "AVERTISSEMENT — Dégradation notable de la qualité de l'air.",
        actions: [
          `Renforcer la surveillance de l'indice de pollution sur ${zone}.`,
          "Installer des capteurs fixes de surveillance de l'air dans le secteur concerné.",
          "Sensibiliser les riverains et artisans locaux aux bonnes pratiques de combustion.",
        ],
      },
      info: {
        statut:  'INFORMATION — Niveau sous observation.',
        actions: [
          `Consigner la mesure dans le registre environnemental de ${zone}.`,
          "Maintenir la surveillance automatisée des capteurs environnementaux.",
          'Programmer une vérification de routine dans les 30 prochaines minutes.',
        ],
      },
    };

    const niveau = niveauxPollution[priorite] ?? niveauxPollution.info;
    const cause  = anomalie?.causePollution ?? 'Cause non déterminée.';

    return [
      `RAPPORT ENVIRONNEMENTAL AUTOMATISÉ — M'LAM FIANARANTSOA`,
      `DESTINATAIRE : Direction Régionale du Ministère de l'Environnement et du Développement Durable (MEDD)`,
      `Référence : ${anomalie?.id ?? 'ALT-XXX'} | Heure : ${heure}`,
      `Capteur déclencheur : ${capteur}`,
      `Secteur concerné : ${zone}`,
      `Indice de pollution : ${anomalie?.pollutionIndex ?? 'N/A'}/100`,
      `PM2.5 estimé : ${anomalie?.pm25Valeur ?? 'N/A'} µg/m³`,
      `Cause identifiée : ${cause}`,
      ``,
      `STATUT : ${niveau.statut}`,
      ``,
      `DESCRIPTION`,
      desc,
      ``,
      `RECOMMANDATIONS DE POLITIQUE PUBLIQUE`,
      ...niveau.actions.map((a, i) => `  ${i + 1}. ${a}`),
      ``,
      `──────────────────────────────────────────────`,
      `Rapport généré par le moteur local M'LAM.`,
      `Transmission recommandée à la Direction Régionale du MEDD pour suivi.`,
    ].join('\n');
  }

  // ── Branche TRAFIC — inchangée ──
  const niveauxTrafic = {
    critical: {
      statut:  'CRITIQUE — Intervention immédiate requise.',
      actions: [
        `Déployer une unité de régulation sur ${zone} dans les 5 minutes.`,
        'Activer le protocole de déviation de trafic sur les axes secondaires.',
        'Notifier le centre de commandement et les services de secours compétents.',
      ],
    },
    warning: {
      statut:  'AVERTISSEMENT — Surveillance renforcée activée.',
      actions: [
        `Surveiller l'évolution de la situation sur ${zone}.`,
        'Préparer une unité mobile en standby pour intervention rapide.',
        'Informer les opérateurs de terrain via le canal radio sécurisé.',
      ],
    },
    info: {
      statut:  'INFORMATION — Aucune action immédiate requise.',
      actions: [
        `Consigner l'événement dans le registre d'incidents de ${zone}.`,
        'Maintenir la surveillance automatisée par les capteurs actifs.',
        'Programmer une vérification de routine dans les 30 prochaines minutes.',
      ],
    },
  };

  const niveau = niveauxTrafic[priorite] ?? niveauxTrafic.info;

  return [
    `RAPPORT D'INCIDENT AUTOMATISÉ — M'LAM FIANARANTSOA`,
    `Référence : ${anomalie?.id ?? 'ALT-XXX'} | Heure : ${heure}`,
    `Capteur déclencheur : ${capteur}`,
    `Zone concernée : ${zone}`,
    ``,
    `STATUT : ${niveau.statut}`,
    ``,
    `DESCRIPTION`,
    desc,
    ``,
    `ACTIONS RECOMMANDÉES`,
    ...niveau.actions.map((a, i) => `  ${i + 1}. ${a}`),
    ``,
    `──────────────────────────────────────────────`,
    `Rapport généré par le moteur local M'LAM.`,
    `Validation superviseur recommandée avant diffusion.`,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Construction du prompt
// ─────────────────────────────────────────────────────────────────────────────

function construirePrompt(anomalie) {
  const zone     = anomalie?.zone        ?? 'Zone inconnue';
  const priorite = anomalie?.priority    ?? 'info';
  const capteur  = anomalie?.sensor      ?? 'N/A';
  const desc     = anomalie?.description ?? 'Aucune description disponible.';
  const heure    = anomalie?.time        ?? '--:--';
  const estEnvironnemental = capteur.startsWith('CAP-ENV');

  if (estEnvironnemental) {
    const indice = anomalie?.pollutionIndex   ?? 'N/A';
    const pm25   = anomalie?.pm25Valeur       ?? 'N/A';
    const cause  = anomalie?.causePollution   ?? 'Non déterminée';

    return `Tu es l'assistant IA du système de supervision environnementale M'LAM pour la ville de Fianarantsoa, Madagascar.

Un pic de pollution atmosphérique vient d'être détecté. Voici les données brutes du capteur environnemental :

  - Référence         : ${anomalie?.id ?? 'N/A'}
  - Heure              : ${heure}
  - Secteur            : ${zone}
  - Capteur            : ${capteur}
  - Priorité           : ${priorite.toUpperCase()}
  - Indice pollution   : ${indice}/100
  - PM2.5 estimé       : ${pm25} µg/m³
  - Cause identifiée   : ${cause}
  - Description        : ${desc}

Rédige un rapport environnemental structuré en français, destiné à la Direction Régionale du Ministère de l'Environnement et du Développement Durable (MEDD). Ne mentionne à aucun moment la police municipale ou des forces de l'ordre. Le rapport doit contenir :
1. En première ligne : "DESTINATAIRE : Direction Régionale du Ministère de l'Environnement et du Développement Durable (MEDD)".
2. Un diagnostic factuel en 2 phrases maximum, expliquant l'origine du pic (cause identifiée).
3. Une évaluation de l'impact sanitaire potentiel pour les riverains du secteur.
4. Exactement 3 recommandations de politique publique environnementale, numérotées (ex : capteurs fixes de surveillance, campagnes de sensibilisation contre le brûlage de déchets, régulation des zones industrielles proches des habitations).

Réponds uniquement avec le contenu du rapport, sans introduction ni commentaire supplémentaire.`;
  }

  return `Tu es l'assistant IA du système de supervision urbaine M'LAM pour la ville de Fianarantsoa, Madagascar.

Un incident vient d'être détecté sur le réseau de transport. Voici les données brutes du capteur :

  - Référence    : ${anomalie?.id ?? 'N/A'}
  - Heure        : ${heure}
  - Zone         : ${zone}
  - Capteur      : ${capteur}
  - Priorité     : ${priorite.toUpperCase()}
  - Description  : ${desc}

Rédige un rapport administratif d'incident structuré en français, destiné au superviseur du centre de commandement. Le rapport doit contenir :
1. Un résumé factuel de la situation en 2 phrases maximum.
2. Une évaluation du niveau de risque pour la circulation et les riverains.
3. Exactement 3 actions opérationnelles concrètes et immédiates, numérotées.

Réponds uniquement avec le contenu du rapport, sans introduction ni commentaire supplémentaire.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonction principale exportée
// ─────────────────────────────────────────────────────────────────────────────

/**
 * generateUrbanReport
 *
 * Tente de générer un rapport via l'API Gemini.
 * Bascule automatiquement sur le moteur local si la clé est absente,
 * si la réponse HTTP n'est pas 200, ou si une exception est levée.
 *
 * @param {object} anomalie
 * @returns {Promise<{
 *   success: boolean,
 *   report:  string,
 *   source:  'gemini' | 'simulation',
 *   error:   string | null,
 * }>}
 */
export async function generateUrbanReport(anomalie) {
  const apiKey = import.meta.env?.VITE_GEMINI_API_KEY ?? '';

  // Pas de clé → fallback immédiat, sans tentative réseau
  if (!apiKey.trim()) {
    return {
      success: true,
      report:  generateFallbackReport(anomalie),
      source:  'simulation',
      error:   null,
    };
  }

  try {
    // ── Corps de requête conforme à l'API Gemini v1beta ───────────────────
    const body = {
      contents: [
        {
          parts: [
            { text: construirePrompt(anomalie) }
          ]
        }
      ],
      generationConfig: {
        temperature:     0.4,
        maxOutputTokens: 600,
        topP:            0.9,
      },
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

    // ── Réponse non-200 → fallback sans crash ────────────────────────────
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        detail = errJson?.error?.message ?? detail;
      } catch { /* réponse non-JSON, on garde le code HTTP */ }

      return {
        success: true,
        report:  generateFallbackReport(anomalie),
        source:  'simulation',
        error:   detail,
      };
    }

    // ── Extraction sécurisée du texte généré ─────────────────────────────
    const data  = await response.json();
    const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!texte) {
      const raison = data?.candidates?.[0]?.finishReason ?? 'UNKNOWN';
      return {
        success: true,
        report:  generateFallbackReport(anomalie),
        source:  'simulation',
        error:   `Contenu vide — finishReason : ${raison}`,
      };
    }

    return {
      success: true,
      report:  texte,
      source:  'gemini',
      error:   null,
    };

  } catch (err) {
    // ── Exception réseau ou parsing → fallback garanti ───────────────────
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: true,
      report:  generateFallbackReport(anomalie),
      source:  'simulation',
      error:   message,
    };
  }
}