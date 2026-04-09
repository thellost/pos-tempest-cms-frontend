import * as Sentry from '@sentry/tanstackstart-react'

// ─── Init (client-only, called once with the router instance) ─────────────────

let _initialized = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initSentry(router: any) {
  // SSR guard — never run on server
  if (typeof window === 'undefined') return
  // Idempotent — getRouter() may be called more than once during hot-reload
  if (_initialized) return
  _initialized = true

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    // Disable entirely when DSN is not configured (local dev without Sentry account)
    enabled: !!import.meta.env.VITE_SENTRY_DSN,

    environment: import.meta.env.MODE,   // 'development' | 'production'
    debug: import.meta.env.DEV,          // verbose SDK logging in dev

    integrations: [
      // ── Tracing ─────────────────────────────────────────────────────────────

      // Route-aware page load + navigation spans for TanStack Router.
      // Span names will be route IDs (e.g. /_authenticated/orders/$orderId)
      // instead of raw URL paths.
      Sentry.tanstackRouterBrowserTracingIntegration(router),

      // Captures failed HTTP requests (4xx/5xx) as Sentry errors.
      // Also adds sentry-trace + baggage headers for distributed tracing.
      Sentry.httpClientIntegration({
        failedRequestStatusCodes: [[400, 599]], // only 5xx as errors; 4xx should be logged too
        failedRequestTargets: [
          import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        ],
      }),

      // ── Breadcrumbs ─────────────────────────────────────────────────────────

      // Automatic breadcrumbs: DOM clicks, console output, fetch/XHR calls,
      // and history (navigation) events.
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),

      // Captures console.error() and console.warn() as Sentry events.
      Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),

      // Attaches extra properties from Error objects (e.g. ApiError.code, .status)
      // to Sentry event extra data.
      Sentry.extraErrorDataIntegration({ depth: 5 }),

      // ── Replay ──────────────────────────────────────────────────────────────

      // Records a video-like session replay, attached to error events.
      // Adjust maskAllText / maskAllInputs if the app handles sensitive PII.
      Sentry.replayIntegration({
        maskAllText: false,
        maskAllInputs: false,
        blockAllMedia: false,
      }),
    ],

    // ── Sample rates ──────────────────────────────────────────────────────────

    // Trace 100% of transactions in dev, 20% in production.
    // Tune down further once you understand your volume.
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Capture replays for 10% of normal sessions, 100% of sessions with errors.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // ── Distributed tracing ───────────────────────────────────────────────────

    // Inject sentry-trace + baggage headers on requests to these targets.
    // If the backend also runs Sentry, this connects frontend → backend spans.
    tracePropagationTargets: [
      'localhost',
      new RegExp(`^${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}`),
    ],

    // ── Breadcrumb capacity ───────────────────────────────────────────────────

    maxBreadcrumbs: 150,
  })
}
