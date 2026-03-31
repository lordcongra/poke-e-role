import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    // We remove the 'base' property for local development so it serves from the root
    plugins: [react()],
    server: {
        port: 5173,
        cors: {
            origin: 'https://www.owlbear.rodeo',
            methods: ['GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
        }
    }
});
