import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/poke-e-role/',
    plugins: [react()],
    server: {
        cors: {
            origin: 'https://www.owlbear.rodeo'
        }
    }
});
