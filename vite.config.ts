import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: process.env.GITHUB_PAGES ? '/impix-ai-orchestration-platform/' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
