import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const apiProxyTarget = process.env.VITE_API_BASE_URL?.trim()

export default defineConfig({
  base: '/',
  plugins: [react({ fastRefresh: false })],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    ...(apiProxyTarget
      ? {
          proxy: {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true
            },
            '/uploads': {
              target: apiProxyTarget,
              changeOrigin: true
            }
          }
        }
      : {})
  }
})
