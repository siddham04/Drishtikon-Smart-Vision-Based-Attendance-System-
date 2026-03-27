import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/groups': 'http://localhost:5000',
      '/group-students': 'http://localhost:5000',
      '/register-face': 'http://localhost:5000',
      '/liveness-check': 'http://localhost:5000',
      '/take-attendance': 'http://localhost:5000',
      '/recognize-frame': 'http://localhost:5000',
      '/view-attendance': 'http://localhost:5000',
      '/download-attendance': 'http://localhost:5000',
      '/send-report': 'http://localhost:5000',
      '/analytics': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
