import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { gbmAliasList } from '../../gbm-aliases.ts';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: gbmAliasList },
  base: './',
  server: { port: 5174, strictPort: true },
  build: { outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 2000 },
});
