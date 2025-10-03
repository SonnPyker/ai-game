import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'animation-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('@google/generative-ai')) {
              return 'ai-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('@vercel')) {
              return 'vercel-vendor';
            }
            // Other vendor libraries
            return 'vendor';
          }
          
          // Page chunks - tách các pages lớn thành chunks riêng
          if (id.includes('/pages/GamePage')) {
            return 'game-page';
          }
          if (id.includes('/pages/WorldBuilder') || id.includes('/components/WorldBuilder')) {
            return 'world-builder';
          }
          if (id.includes('/pages/CharacterCreationPage')) {
            return 'character-creation';
          }
          if (id.includes('/pages/SettingsPage')) {
            return 'settings-page';
          }
          if (id.includes('/pages/SaveLoadPage')) {
            return 'save-load-page';
          }
          if (id.includes('/pages/HomePage')) {
            return 'home-page';
          }
          if (id.includes('/pages/InitPage')) {
            return 'init-page';
          }
          
          // Component chunks - tách các components lớn
          if (id.includes('/components/InfoMenu')) {
            return 'info-menu';
          }
          if (id.includes('/components/QuestTracker')) {
            return 'quest-tracker';
          }
          if (id.includes('/components/SaveManager')) {
            return 'save-manager';
          }
          if (id.includes('/components/WorldBuilder')) {
            return 'world-builder-components';
          }
          
          // Service chunks - tách các services
          if (id.includes('/services/geminiService')) {
            return 'gemini-service';
          }
          if (id.includes('/services/npcRelationshipService')) {
            return 'npc-relationship-service';
          }
          if (id.includes('/services/saveStorage')) {
            return 'save-storage-service';
          }
          if (id.includes('/services/questDetectionService')) {
            return 'quest-service';
          }
          
          // Hook chunks
          if (id.includes('/hooks/useQuestSystem')) {
            return 'quest-hooks';
          }
          if (id.includes('/hooks/useResponsiveDesign')) {
            return 'responsive-hooks';
          }
        }
      }
    },
    // Tăng chunk size warning limit để tránh warning không cần thiết
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3000,
    open: true
  }
})
