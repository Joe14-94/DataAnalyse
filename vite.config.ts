import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import csp from 'vite-plugin-csp-guard';

export default defineConfig({
  plugins: [
    react(),
    csp({
      dev: {
        run: true,
        outlierSupport: ['tailwind'],
      },
      policy: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'script-src-elem': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        'style-src-elem': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'img-src': ["'self'", "data:", "blob:"],
        'connect-src': ["'self'", "https://graph.microsoft.com", "https://login.microsoftonline.com"],
      },
      build: {
        sri: false
      }
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['xlsx', 'lucide-react']
        }
      }
    }
  }
});