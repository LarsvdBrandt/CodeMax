import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Port is injected via VITE_PORT so docker-compose can set it dynamically.
// Falls back to 5173 for local npm run dev without Docker.
const port = Number(process.env.VITE_PORT ?? 5173)

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    host: true,   // bind to 0.0.0.0 so Docker port mapping works
    strictPort: true,
  },
  resolve: {
    alias: {
      // '@/' resolves to src/ — use everywhere instead of relative paths
      '@': path.resolve(__dirname, './src'),
    },
  },
})
