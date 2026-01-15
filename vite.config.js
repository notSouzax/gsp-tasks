import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'vendor-react': ['react', 'react-dom'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['framer-motion', 'react-hot-toast', 'react-loading-skeleton'],
          'vendor-utils': ['date-fns', '@supabase/supabase-js', '@tanstack/react-query'],
        }
      }
    },
    chunkSizeWarningLimit: 600, // Slightly increased but still warn for very large chunks
  }
})
