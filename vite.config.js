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
  }
});
