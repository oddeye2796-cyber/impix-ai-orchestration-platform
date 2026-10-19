import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // The expo build uses relative paths so the same dist folder runs from a
    // booth laptop, a USB stick or any sub-path without a rebuild.
    base: process.env.EDITION === 'tokyo' ? './' : process.env.GITHUB_PAGES ? '/impix-ai-orchestration-platform/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      {
        // GitHub Pages serves 404.html for any unknown path, so shipping a copy
        // of index.html there makes a deep link or a refresh land on the app
        // instead of GitHub's error page.
        name: 'spa-404-fallback',
        closeBundle() {
          const dist = path.resolve(__dirname, 'dist');
          const index = path.join(dist, 'index.html');
          if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Endpoint of the key-holding proxy. Unlike the key, this is safe to ship.
      'process.env.AI_PROXY_URL': JSON.stringify(env.AI_PROXY_URL),
      // 'tokyo' builds the NexTech Week Tokyo booth edition; anything else is the standard platform.
      'process.env.EDITION': JSON.stringify(process.env.EDITION || 'standard'),
      // Stamped so the deployed page can report which commit it is running.
      'process.env.BUILD_REF': JSON.stringify(
        process.env.BUILD_REF || process.env.GITHUB_SHA || 'dev',
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // Split the heavyweight vendors out of the app chunk so a copy change
      // does not invalidate 1 MB of library code in the visitor's cache, and
      // the browser can parse them in parallel.
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts'],
            motion: ['motion'],
          },
        },
      },
      chunkSizeWarningLimit: 900,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: true,
    },
  };
});
