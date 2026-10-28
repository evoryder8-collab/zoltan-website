import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { port: 5183, host: true },
  preview: { port: 5184 },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      // the homepage, and /linkinbio: the page the social profiles link to (not linked from the site)
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        linkinbio: resolve(import.meta.dirname, 'linkinbio/index.html'),
      },
    },
  },
});
