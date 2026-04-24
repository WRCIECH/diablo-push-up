import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Diablo Push-Up',
        short_name: 'DiabloPU',
        description: 'Push-up training — Diablo style',
        theme_color: '#0a0605',
        background_color: '#0a0605',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ],
  server: {
    host: true,   // listen on 0.0.0.0 so phones on the same Wi-Fi can connect
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
