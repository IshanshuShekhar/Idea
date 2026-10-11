import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

// Trigger Vite restart

// Trigger Vite restart 2

// Trigger Vite restart 3

// Trigger Vite restart 4

// Trigger Vite restart 5

// Trigger Vite restart 6

// Trigger Vite restart 7

// Trigger Vite restart 8

// Trigger Vite restart 9

// Trigger Vite restart 10

// Trigger Vite restart 11
