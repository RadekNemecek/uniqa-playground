import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Na GitHub Pages žije aplikace v podadresáři podle názvu repozitáře.
  // Lokálně nebo jinde se dá přepsat proměnnou VITE_BASE.
  base: process.env.VITE_BASE ?? '/uniqa-playground/',

  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      workbox: {
        // Aplikace se po prvním načtení uloží do prohlížeče. Když na
        // školení vypadne síť nebo firemní firewall blokne github.io,
        // hra i tak naběhne.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Mučírna: školicí hry',
        short_name: 'Mučírna',
        description: 'Interaktivní hry pro školení týmů. Vlastní otázky, hraje se na plátno.',
        lang: 'cs',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        // Na šířku se promítá, ale hráč drží telefon na výšku. Zámek
        // orientace by mu obrazovku otočil na bok.
        orientation: 'any',
        background_color: '#001A31',
        theme_color: '#001A31',
        categories: ['education', 'games'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  build: {
    target: 'es2022',
    cssTarget: 'chrome111',
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase je velký a načítá se jen tam, kde je nakonfigurovaný.
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
})
