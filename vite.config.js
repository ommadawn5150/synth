import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/synth/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'SYNTH',
        short_name: 'SYNTH',
        description: 'Web Synthesizer — dual OSC, filter, LFO, FX, sequencer',
        theme_color: '#FF6B35',
        background_color: '#1A1918',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/synth/',
        scope: '/synth/',
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'external', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
});
