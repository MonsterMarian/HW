import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  // dva vstupy: index.html = desktop (Electron, simulace), web.html = web se všemi součástkami (src/web)
  build: { rollupOptions: { input: { main: 'index.html', web: 'web.html' } } },
  assetsInclude: ['**/*.glb', '**/*.stl'], // CAD modely výrobců (views/economic/realModels.js)
  plugins: [
    react(),
    tailwindcss(),
  ],
})
