import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(rootDir, 'node_modules/react'),
      'react-dom': path.resolve(rootDir, 'node_modules/react-dom')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: process.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
})
