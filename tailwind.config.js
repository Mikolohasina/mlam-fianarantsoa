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
        // M'LAM status palette — used for anomaly badges and gauge fills
        status: {
          ok:             '#2EA043',
          'ok-dark':      '#3FB950',
          warning:        '#D29922',
          'warning-dark': '#E3B341',
          danger:         '#CF222E',
          'danger-dark':  '#F85149',
        },
      },
    },
  },

  plugins: [],
};
