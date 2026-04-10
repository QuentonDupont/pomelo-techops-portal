import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // Proxy /api/* to the BFF in development so no CORS headers are needed
    // and no API credentials are ever shipped in the client bundle.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
