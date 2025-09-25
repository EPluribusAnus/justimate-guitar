import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ultimateGuitarPlugin } from './scripts/viteUltimateGuitarPlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ultimateGuitarPlugin()],
})
