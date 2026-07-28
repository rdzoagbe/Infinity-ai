import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Infinity-ai/',
  server: {
    port: 3000,
    open: true
  },
  test: {
    // Playwright specs live in e2e/ and run via `npm run test:e2e`
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
