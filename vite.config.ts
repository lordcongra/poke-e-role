import { defineConfig } from "vite";

export default defineConfig({
  base: 'poke-e-role',
  server: {
    cors: {
      origin: "https://www.owlbear.rodeo",
    },
  },
});