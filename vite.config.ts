import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import tailwindcss from '@tailwindcss/vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'

// Use function form so we can access env vars from .env files in the Sentry plugin config.
// loadEnv reads .env, .env.local, .env.[mode], .env.[mode].local
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    plugins: [
      // Sentry: upload source maps + instrument server middleware (production only).
      // In development this returns [] so there is no overhead.
      sentryTanstackStart({
        org: env.VITE_SENTRY_ORG || process.env.SENTRY_ORG,
        project: env.VITE_SENTRY_PROJECT || process.env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN,
        // Only upload source maps when auth token is present
        sourcemaps: {
          disable: !env.SENTRY_AUTH_TOKEN && !process.env.SENTRY_AUTH_TOKEN,
        },
      }),

      devtools(),
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
    ],

    build: {
      // Required for Sentry to map minified stack traces to source code.
      sourcemap: true,
    },

    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
