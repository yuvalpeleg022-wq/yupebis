import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    // The 3D runtime (three + R3F + drei) is one lazily-loaded chunk of ~360 kB gzip.
    chunkSizeWarningLimit: 1400,
  },
});
