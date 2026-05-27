import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096, // inline small assets
    rollupOptions: {
      output: {
        manualChunks: undefined, // keep everything together for simpler single-file builds later
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
