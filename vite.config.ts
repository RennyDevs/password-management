import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    transformer: 'postcss',
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('libsodium-wrappers')) return 'libsodium'
            if (id.includes('argon2-browser')) return 'argon2'
            if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'
            if (id.includes('@supabase/supabase-js')) return 'supabase'
            if (id.includes('react-i18next') || id.includes('i18next') || id.includes('remark-gfm')) return 'i18n'
            return 'vendor'
          }
        },
      },
    },
  },
})
