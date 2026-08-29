import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // Two Vitest projects, so only the tests that need a DOM pay for one. jsdom
  // costs ~100ms per test file to construct; the pure-module and SSR-markup
  // tests do not need it, and a global switch made the suite four times slower.
  // Interaction tests are named "*.dom.test.ts" and run under jsdom.
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.dom.test.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.dom.test.ts']
        }
      }
    ]
  },
  base: '/',
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // Trailing slash on purpose: a bare '/api' key is a prefix match, so it
      // also swallowed the '/api-reference' route and proxied it to the API,
      // which answers "Cannot GET /api-reference". Every real endpoint lives
      // under '/api/sector', so '/api/' still matches them all.
      '/api/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Function form so this works with both Rollup (Vite 7) and
        // Rolldown (Vite 8+), which only accepts a function for manualChunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/three/') || id.includes('/@types/three/')) return 'vendor-three'
          if (id.includes('/axios/')) return 'vendor-http'
          if (
            id.includes('/vue/') ||
            id.includes('/@vue/') ||
            id.includes('/vue-router/') ||
            id.includes('/pinia/')
          ) {
            return 'vendor-vue'
          }
        }
      }
    }
  }
})