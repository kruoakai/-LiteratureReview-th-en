import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  build: { outDir: 'dist' },
  define: {
    // Stamped at build time so the sidebar's "Updated" line never goes stale between deploys.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  server: {
    // Nothing needs to reach the dev server cross-origin; closes the esbuild dev-server CORS advisory.
    cors: false,
    proxy: {
      '/api': `http://localhost:${process.env.PORT || 4000}`
    }
  }
})
