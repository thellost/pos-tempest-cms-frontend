import * as Sentry from '@sentry/tanstackstart-react'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  integrations: [
    Sentry.tanstackRouterBrowserTracingIntegration(),
    Sentry.httpClientIntegration({
      failedRequestStatusCodes: [[400, 599]],
      failedRequestTargets: [apiBaseUrl],
    }),
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      fetch: true,
      history: true,
      xhr: true,
    }),
    Sentry.extraErrorDataIntegration({ depth: 5 }),
    Sentry.captureConsoleIntegration({ levels: ['error', 'warn'] }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: false,
    }),
  ],

  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  tracePropagationTargets: ['localhost', new RegExp(`^${apiBaseUrl}`)],

  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  debug: import.meta.env.DEV,
  maxBreadcrumbs: 150,
})
