import { defineConfig } from "vite";

export default defineConfig({
  // This base path is required for GitHub Pages deployment!
  base: '/poke-e-role/',
  server: {
    cors: true,
  },
});