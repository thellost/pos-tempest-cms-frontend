# Sentry Integration Plan

## Current State

| Already Done | Status |
|---|---|
| `@sentry/tanstackstart-react` v10.22.0 installed | ✅ |
| `ErrorBoundary` calls `Sentry.captureException()` | ✅ |
| Env vars declared in `.env.local` | ✅ (values empty) |

## What This Plan Adds

- Full performance tracing with route-level and span-level timing
- API response time tracking on every `ApiClient` request
- Breadcrumbs for: auth events, navigation, API calls, mutations, user actions
- User identity attached to every event
- TanStack Query error capture (queries and mutations)
- Source map upload for readable stack traces in production
- Session Replay for errors

---

## Phases

| Phase | What | Files |
|---|---|---|
| [1 – Core Setup](./01-core-setup.md) | Init Sentry, wire Vite plugin, fill env vars | `sentry.client.config.ts`, `vite.config.ts`, `.env.local` |
| [2 – API Tracing](./02-api-tracing.md) | Span + response time per request | `src/lib/api-client.ts` |
| [3 – Breadcrumbs](./03-breadcrumbs.md) | Auth, mutation, custom action breadcrumbs | `src/hooks/use-auth.tsx`, mutation hooks |
| [4 – User Context](./04-user-context.md) | Set/clear Sentry user identity | `src/hooks/use-auth.tsx` |
| [5 – Query Integration](./05-tanstack-query.md) | Global query/mutation error capture | `src/integrations/tanstack-query/root-provider.tsx` |

## Implementation Order

Do phases in order — each phase builds on the previous. Phase 1 must be done first since nothing else works without Sentry initialized.

## What You Get After All Phases

```
Sentry Dashboard
├── Performance
│   ├── Page loads with route names (TanStack Router auto)
│   ├── API spans:  POST /api/v1/orders  →  124ms  HTTP 201
│   ├── API spans:  GET  /api/v1/users   →  89ms   HTTP 200
│   └── Slow endpoint detection
├── Errors
│   ├── Unhandled React errors (ErrorBoundary)
│   ├── ApiError with status code + endpoint
│   ├── Query failures with query key context
│   └── Mutation failures
├── Breadcrumbs (per event)
│   ├── [auth]      User logged in – userId: 42
│   ├── [navigation] /orders → /orders/123
│   ├── [http]      GET /api/v1/orders 200 89ms
│   ├── [mutation]  createOrder started
│   ├── [mutation]  createOrder succeeded
│   └── [ui]        click, input, etc.
└── User Context
    ├── id, email, name on every event
    └── Cleared on logout
```
