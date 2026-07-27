// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host:       true,
    port:       5173,
    strictPort: true,
  },

  // ✅ dedupe SANS alias — plus fiable, Vite trouve lui-même le bon chemin
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react-leaflet',
      'leaflet',
    ],
    // Force le re-bundling même si le cache dit "à jour"
    force: true,
  },
});