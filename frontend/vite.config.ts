import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['147.5gao.ai', 'localhost', '.5gao.ai'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://backend:3001',
        changeOrigin: true,
      },
    },
  },
});
