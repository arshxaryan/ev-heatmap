import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy keeps API calls same-origin in development (no CORS headaches).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.VITE_API_URL || 'http://localhost:4000', changeOrigin: true } },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split heavy vendors: react chunk ships first, map & charts lazy-load behind their routes.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-map': ['leaflet', 'react-leaflet', 'leaflet.markercluster', 'leaflet.heat'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
});
