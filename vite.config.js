import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'
  
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Vibe Color Picker',
          short_name: 'VibePicker',
          description: 'Color picker app for concentration analysis',
          theme_color: '#4CAF50',
          background_color: '#ffffff',
          display: 'standalone',
          icons: []
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        }
      })
    ],
    server: {
      port: 8001,
      host: true,
      headers: {
        // Disable caching in development
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    build: {
      outDir: 'dist'
    }
  }
})

