import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // Your local Python FastAPI server
        changeOrigin: true,
        ws: true, // IMPORTANT: Enables WebSocket proxying for real-time input
      }
    }
  }
})