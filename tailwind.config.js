/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],

  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // ── Nouvelle Architecture de Surfaces Haut de Gamme ──────────────────
        surface: {
          // Mode sombre par défaut (Noir Titane Organique & Obsidienne)
          // Mode clair géré via les variantes natives "light:bg-[#f0f9ff]" directement dans ton UI ou le CSS
          base:    '#05060B', // Noir ultra-profond tactique
          raised:  '#0C0E17', // Cartes sombres effet titane fumé
          overlay: '#121624', // Modales et tiroirs
          border:  '#1E243A', // Bordure fine acier
          muted:   '#0F1221', // Intérieurs d'inputs sombres
        },

        // ── Textes à Haut Contraste ─────────────────────────────────────────
        ink: {
          primary:   '#F1F5F9', // Blanc bleuté très propre
          secondary: '#64748B', // Gris ardoise pour métadonnées
          muted:     '#334155', // Texte désactivé
          inverse:   '#0F172A', // Texte noir d'encre (sur boutons clairs)
        },

        // ── Accent Global — Bleu Ciel Lumineux & Cobalt ───────────────────────
        accent: {
          subtle:  '#0C1E3A', // Fond de badge sombre
          muted:   '#0284C7', // Bordure bleu ciel
          default: '#0EA5E9', // Bleu ciel dominant signature
          bright:  '#38BDF8', // Version néon lumineuse pour hovers
          text:    '#7DD3FC', // Texte bleu ciel sur fond noir
        },

        // ── Statuts de Monitoring Épurés & Lumineux ──────────────────────────
        status: {
          ok: {
            bg:     '#022C22',
            border: '#064E3B',
            text:   '#10B981',
            dot:    '#34D399',
          },
          warn: {
            bg:     '#451A03',
            border: '#78350F',
            text:   '#F59E0B',
            dot:    '#FBBF24',
          },
          crit: {
            bg:     '#450A0A',
            border: '#7F1D1D',
            text:   '#EF4444',
            dot:    '#F87171',
          },
          info: {
            bg:     '#0C4A6E',
            border: '#0369A1',
            text:   '#38BDF8',
            dot:    '#7DD3FC',
          },
        },

        // ── Mode Clair d'Exception : "Aéro - Bleu Ciel Cristallin" ──────────
        // Ces classes s'activent avec le préfixe "light:" (ex: light:bg-light-surface-base)
        light: {
          'surface-base':    '#F0F9FF', // Fond de page bleu ciel cristallin très doux
          'surface-raised':  '#FFFFFF', // Cartes blanches pures effet verre dépoli
          'surface-overlay': '#FFFFFF',
          'surface-border':  '#BAE6FD', // Bordures fines bleu ciel azur
          'surface-muted':   '#E0F2FE', // Zones secondaires bleu ciel
          'ink-primary':     '#0F172A', // Texte bleu nuit/noir très lisible
          'ink-secondary':   '#0284C7', // Libellés bleu ciel saturés pro
          'ink-muted':       '#7DD3FC',
        }
      }
    },
  },

  plugins: [],
};