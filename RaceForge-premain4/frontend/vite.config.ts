import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { apiProxyOrigin } from './src/proxyOrigin.ts'
import type { ProxyOptions } from 'vite'

export default defineConfig(({ mode }) => {
  const target = loadEnv(mode, process.cwd(), '').VITE_API_PROXY_TARGET || 'http://localhost:8080'
  const apiProxy: ProxyOptions = {
    target,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('proxyReq', (outgoing, incoming) => {
        const origin = apiProxyOrigin(incoming.headers.origin, incoming.headers.host, target)
        if (origin) outgoing.setHeader('Origin', origin)
      })
    },
  }
  return {
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: { chunkSizeWarningLimit: 1500 },
  server: { host: true, port: 5173, strictPort: true, proxy: { '/api': apiProxy } },
  preview: { host: true, port: 4173, proxy: { '/api': apiProxy } },
  }
})
