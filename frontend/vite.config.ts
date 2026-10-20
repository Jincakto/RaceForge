import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { chunkSizeWarningLimit: 1500 },
  server: { host: true, port: 5173, proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } } },
  preview: { host: true, port: 4173 },
})
