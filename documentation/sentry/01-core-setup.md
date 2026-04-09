# Phase 1 – Core Setup

## Goal

Initialize Sentry with full tracing and replay support, wire the Vite plugin for source map uploads.

---

## Step 1: Fill env vars

In `.env.local` (already has the keys, just needs values):

```env
VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project-id>
VITE_SENTRY_ORG=your-org-slug
VITE_SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_...   # from sentry.io → Settings → Auth Tokens
```

`SENTRY_AUTH_TOKEN` has no `VITE_` prefix — it's build-time only (used by Vite plugin, never sent to browser).

For production (CI/Docker), set those same vars as environment secrets.

---

## Step 2: Create `sentry.client.config.ts` at project root

```ts
// sentry.client.config.ts
import * as Sentry from '@sentry/tanstackstart-react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  // ── Tracing ────────────────────────────────────────────────────────────────
  integrations: [
    // Route-change spans + page-load spans for TanStack Router
    Sentry.tanstackRouterBrowserTracingIntegration(),

    // Instruments window.fetch and XMLHttpRequest automatically.
    // Adds network breadcrumbs and outgoing request spans.
    Sentry.httpClientIntegration({
      // Only trace requests to our own API, not Supabase or CDNs
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: [import.meta.env.VITE_API_BASE_URL],
    }),

    // Standard breadcrumbs: clicks, console, history, fetch, xhr
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      xhr: true,
    }),

    // Attaches extra properties from Error objects to Sentry events
    Sentry.extraErrorDataIntegration({ depth: 5 }),

    // Captures console.error() calls as Sentry errors
    Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),

    // Session Replay — records screen for errors
    Sentry.replayIntegration({
      maskAllText: false,      // adjust for PII requirements
      blockAllMedia: false,
    }),
  ],

  // ── Sample rates ───────────────────────────────────────────────────────────
  // In production: tune these down. 1.0 = 100% of transactions traced.
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

  // Replay: capture 10% of normal sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // ── Propagation ────────────────────────────────────────────────────────────
  // Adds sentry-trace + baggage headers to outgoing requests to this origin.
  // Allows backend to continue the trace (distributed tracing).
  tracePropagationTargets: [
    'localhost',
    new RegExp(`^${import.meta.env.VITE_API_BASE_URL}`),
  ],

  // ── Release tracking ───────────────────────────────────────────────────────
  // Injected automatically by the Vite plugin at build time.
  // You can override: release: `myapp@${__APP_VERSION__}`

  // ── Misc ───────────────────────────────────────────────────────────────────
  environment: import.meta.env.MODE,           // 'development' | 'production'
  enabled: !!import.meta.env.VITE_SENTRY_DSN, // disable if DSN not set
  debug: import.meta.env.DEV,                  // verbose logging in dev
})
```

### Why `sentry.client.config.ts` at root?

The `sentryTanstackStart()` Vite plugin automatically injects this file as the first thing executed in the client bundle — before any app code. This guarantees Sentry is initialized before the router, React, or any component renders.

---

## Step 3: Add Vite plugin to `vite.config.ts`

```ts
// vite.config.ts  (diff)
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'

const config = defineConfig({
  // ...existing resolve, plugins...
  plugins: [
    // Add BEFORE tanstackStart() and viteReact()
    sentryTanstackStart({
      org: process.env.VITE_SENTRY_ORG,
      project: process.env.VITE_SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,

      // Upload source maps on production builds only
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
      },

      // Automatically set release version (uses git SHA by default)
      release: {
        create: true,
        finalize: true,
        deploy: { env: process.env.NODE_ENV ?? 'production' },
      },
    }),

    devtools(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackStart(),
    viteReact({ babel: { plugins: ['babel-plugin-react-compiler'] } }),
  ],

  // Required for Sentry source maps
  build: {
    sourcemap: true,
  },
})
```

> **Note:** If `sentryTanstackStart` is not exported from `@sentry/tanstackstart-react/vite`, fall back to `sentryVitePlugin` from `@sentry/vite-plugin` (install separately: `bun add -D @sentry/vite-plugin`). The config shape is identical.

---

## Step 4: Verify

1. Start dev server: `bun dev`
2. Open browser devtools → Network → look for a `https://o*.ingest.sentry.io` request
3. Open Sentry dashboard → Issues → should see a test event if you trigger an error
4. Run `Sentry.captureMessage('test')` in browser console — it should appear in Sentry within seconds

---

## What This Gives You After Phase 1

- Route-level page load and navigation spans (automatic via TanStack Router integration)
- Automatic `fetch` breadcrumbs for every outgoing HTTP call
- Console error capture
- DOM interaction breadcrumbs (clicks, form inputs)
- Session Replay on errors
- Source maps in production (readable stack traces)
