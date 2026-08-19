import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: '/poke-e-role/',

    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            // Added manifest.json to include assets so the Service Worker knows it exists
            includeAssets: ['pokeball.svg', 'favicon.ico', 'robots.txt', 'manifest.json'],
            manifest: {
                name: 'PokéRole Character Sheet',
                short_name: 'PokéRole',
                description: 'Offline-first PokéRole TTRPG Character Sheet & GM Toolkit',
                theme_color: '#b71c1c',
                background_color: '#1e1e1e',
                display: 'standalone',
                scope: '/poke-e-role/',
                start_url: '/poke-e-role/',
                icons: [
                    {
                        src: 'pokeball.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            },
            workbox: {
                // CRITICAL FIX: Added 'json' to the globPatterns!
                // Without this, your offline Pokemon/Move database will fail to load without internet.
                globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']
            }
        })
    ],

    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                rollLog: 'roll-log.html',
                initTracker: 'initiative-tracker.html'
            }
        }
    },

    server: {
        port: 5173,
        cors: true,
        host: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
            'X-Frame-Options': 'ALLOWALL'
        }
    }
});
