import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, les appels /api et /uploads sont envoyés au backend (port 5000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
