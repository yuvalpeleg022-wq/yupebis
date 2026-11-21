import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built site works from any sub-path (Netlify, GitHub Pages, a dealer CMS folder…).
// Three.js / R3F are only reached through dynamic imports, so Rollup keeps them out of the initial bundle.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1300,
  },
});
