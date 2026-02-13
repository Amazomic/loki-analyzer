
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.LOKI_URL': JSON.stringify(process.env.LOKI_URL || 'http://192.168.20.96:3100')
  },
  server: {
    host: true,
    port: 80
  }
});
