import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJsonPath = resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: resolve(__dirname, '..'),
    plugins: [react()],
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(packageJson.version),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || '/api'),
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_BACKEND_URL || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  
    preview: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
    },
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: true, // Opcional: útil para debug em produção
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
