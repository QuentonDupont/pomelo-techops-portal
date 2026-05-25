import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Code-split heavy vendor libs so the initial bundle stays small.
    // pdfjs-dist + mammoth are dynamically imported (see src/api/claudeApi.js)
    // and end up in their own async chunks automatically.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-docx': ['docx', 'file-saver', 'jszip'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    // Proxy /api/* to the BFF in development so no CORS headers are needed
    // and no API credentials are ever shipped in the client bundle.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
