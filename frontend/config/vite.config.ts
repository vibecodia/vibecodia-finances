import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, Plugin } from 'vite';

const packageJsonPath = resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const APP_SUBTITLE = 'Financial Control';

// Plugin to process manifest.json template
function processManifestPlugin(): Plugin {
  return {
    name: 'process-manifest',
    buildStart() {
      const templatePath = resolve(__dirname, '../manifest.template.json');
      const outputPath = resolve(__dirname, '../public/manifest.json');
      try {
        let manifest = readFileSync(templatePath, 'utf-8');
        manifest = manifest.replace(/{{APP_VERSION}}/g, packageJson.version);
        manifest = manifest.replace(/{{APP_SUBTITLE}}/g, APP_SUBTITLE);
        writeFileSync(outputPath, manifest);
      } catch (err) {
        console.error('Error processing manifest template:', err);
      }
    },
    transformIndexHtml(html) {
      return html
        .replace(/{{APP_VERSION}}/g, packageJson.version)
        .replace(/{{APP_SUBTITLE}}/g, APP_SUBTITLE);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: resolve(__dirname, '..'),
    plugins: [react(), processManifestPlugin()],
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(packageJson.version),
      'import.meta.env.APP_SUBTITLE': JSON.stringify(APP_SUBTITLE),
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
