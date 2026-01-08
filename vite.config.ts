/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './public/assets'),
      crypto: path.resolve(__dirname, './src/empty-module.js'),
    },
  },
  define: {
    'process.env': {},
    global: 'window',
  },
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('recharts')) return 'recharts';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('framer-motion')) return 'framer';
            if (id.includes('xlsx')) return 'excel';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('react')) return 'vendor';
            return 'dependencies'; // Split other node_modules into a generic dependencies chunk
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    cors: true,
    proxy: {
      '/rest': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        secure: false,
      },
      '/storage': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        secure: false,
      },
      '/realtime': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    }
  },
  preview: {
    port: 4173,
    host: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    testTimeout: 15000,
  },
});
