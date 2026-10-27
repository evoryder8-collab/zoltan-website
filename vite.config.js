import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5183, host: true },
  preview: { port: 5184 },
  build: { target: 'es2020', chunkSizeWarningLimit: 1400 },
});
