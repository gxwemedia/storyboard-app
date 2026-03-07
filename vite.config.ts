import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/ai': {
        target: 'https://gmn.chuangzuoli.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai/, ''),
        secure: true,
      },
      '/api/gemini-image': {
        target: 'https://yunwu.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gemini-image/, ''),
        secure: true,
      },
    },
  },
})

