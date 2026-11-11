import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  assetsInclude: ['**/*.glb', '**/*.stl'], // CAD modely výrobců (views/economic/realModels.js)
  plugins: [
    react(),
    tailwindcss(),
  ],
})
