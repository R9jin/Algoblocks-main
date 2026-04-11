import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// frontend/vite.config.js
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'], // Forces Vite to use only one React instance
  },
  server: {
    proxy: {
      '/api': {
<<<<<<< HEAD
        target: 'http://localhost:8000',
=======
        target: 'http://localhost:8000', // <-- Ensure this says localhost, not 127.0.0.1
>>>>>>> be23490945c749bb28642e35e6bf469b5b4f86c4
        changeOrigin: true,
        ws: true,
      }
    }
  }
})