import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

// On Replit these come from the environment; locally they fall back to the
// repo-root .env and then to defaults, so `pnpm run dev` works with no setup.
const DEV_DEFAULTS = {
  PORT: '5173',
  BASE_PATH: '/',
  API_PROXY_TARGET: 'http://localhost:5000',
} as const;

function readPort(value: string): number {
  const port = Number(value);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${value}"`);
  }

  return port;
}

export default defineConfig(async ({ command, mode }) => {
  // Prefer repo-root .env over empty process.env placeholders.
  const fileEnv = loadEnv(mode, repoRoot, '');
  const env = { ...process.env, ...fileEnv } as Record<string, string | undefined>;
  const isBuild = command === 'build';

  // Builds are deployed behind a router that supplies these, so keep failing
  // loudly there rather than silently shipping a bundle with the wrong base.
  const readEnv = (key: keyof typeof DEV_DEFAULTS) => {
    const value = env[key];

    if (value) return value;

    if (isBuild && key !== 'API_PROXY_TARGET') {
      throw new Error(
        `${key} environment variable is required but was not provided.`,
      );
    }

    return DEV_DEFAULTS[key];
  };

  // The API server also reads PORT, so a shared .env would put both processes
  // on the same port. STORE_PORT lets the storefront opt out of that clash.
  const port = readPort(env.STORE_PORT || readEnv('PORT'));
  const basePath = readEnv('BASE_PATH');
  const momoMerchant =
    env.VITE_MOMO_MERCHANT_NUMBER?.trim() ||
    env.MOMO_MERCHANT_NUMBER?.trim() ||
    '';

  return {
    // Load VITE_* from the monorepo root .env (not artifacts/store).
    envDir: repoRoot,
    base: basePath,
    define: {
      // Forward Replit Secrets (non-VITE_ prefixed) to the frontend bundle
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY ?? ''),
      'import.meta.env.VITE_MOMO_MERCHANT_NUMBER': JSON.stringify(momoMerchant),
      'import.meta.env.VITE_CONTACT_PHONE': JSON.stringify(env.VITE_CONTACT_PHONE ?? ''),
      'import.meta.env.VITE_CONTACT_EMAIL': JSON.stringify(env.VITE_CONTACT_EMAIL ?? ''),
      'import.meta.env.VITE_CONTACT_WHATSAPP': JSON.stringify(env.VITE_CONTACT_WHATSAPP ?? ''),
      'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify(
        env.VITE_TURNSTILE_SITE_KEY ?? '',
      ),
    },
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(env.NODE_ENV !== 'production' && env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
        '@assets': path.resolve(
          import.meta.dirname,
          '..',
          '..',
          'attached_assets',
        ),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
      // The app calls the API with same-origin paths. Replit's router handles
      // that in production; locally the two run as separate processes.
      proxy: {
        '/api': {
          target: readEnv('API_PROXY_TARGET'),
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
