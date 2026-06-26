import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-lucide';
          }
          if (id.includes('src/pages/AdminPortal')) {
            return 'portal-admin';
          }
          if (id.includes('src/pages/ClientPortal')) {
            return 'portal-client';
          }
          if (id.includes('src/pages/ConsultantPortal')) {
            return 'portal-consultant';
          }
        }
      }
    }
  }
})
