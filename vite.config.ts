import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
    base: '/poke-e-role/',

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },

    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['pokeball-token.svg', 'manifest.json'],
            manifest: {
                name: 'PokéRole Character Sheet',
                short_name: 'PokéRole',
                description: 'Offline-first PokéRole TTRPG Character Sheet & GM Toolkit',
                theme_color: '#121212',
                background_color: '#121212',
                display: 'standalone',
                scope: '/poke-e-role/',
                start_url: '/poke-e-role/',
                icons: [
                    {
                        src: 'pokeball-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'pokeball-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'pokeball-token.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    }
                ]
            },
            workbox: {
                globPatterns: [
                    '**/*.{js,css,html,svg,png}',
                    'manifest.json',
                    'dataset/index.json',
                    'dataset/moves-lookup.json',
                    'dataset/pokedex-lookup.json'
                ],
                runtimeCaching: [
                    {
                        urlPattern: /\/poke-e-role\/dataset\/.*\.json$/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'dataset-json-cache',
                            expiration: {
                                maxEntries: 500,
                                maxAgeSeconds: 60 * 60 * 24 * 30
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        }),
        visualizer({
            filename: 'stats.html',
            gzipSize: true,
            brotliSize: true,
            open: false
        })
    ],

    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                rollLog: 'roll-log.html',
                initTracker: 'initiative-tracker.html',
                battleOrganizer: 'battle-organizer.html'
            }
        }
    },

    server: {
        port: 5173,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
            'X-Frame-Options': 'ALLOWALL'
        }
    }
});
