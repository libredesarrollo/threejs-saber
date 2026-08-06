import { defineConfig } from 'vite';

export default defineConfig({
  base: '/public/projects/threejs/',
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 3000, // 👈 Añade esta línea con el puerto que desees
  }
});
