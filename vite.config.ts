import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // This allows Owlbear Rodeo's iframe to fetch your local React files!
    cors: {
      origin: "https://www.owlbear.rodeo",
      methods: ["GET", "OPTIONS", "PATCH", "POST", "PUT"],
    },
  },
})