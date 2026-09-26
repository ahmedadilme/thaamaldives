import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { r2DevSigner } from './r2-signer-dev';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Node does not auto-load .env into process.env, and the dev signer needs the
  // secret R2_* vars. Empty prefix loads every var (including secrets) — that is
  // safe because only VITE_-prefixed keys ever reach the client bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), r2DevSigner(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
