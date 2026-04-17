import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/poke-e-role/',

    plugins: [react()],

    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                rollLog: 'roll-log.html'
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
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        }
    }
});
