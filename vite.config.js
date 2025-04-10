import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      input: '/index.html',
    },
  },
  server: {
    open: true,
  },
  define: {
    'process.env': process.env
  },
})
