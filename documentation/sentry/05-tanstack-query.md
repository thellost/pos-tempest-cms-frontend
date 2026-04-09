# Phase 5 – TanStack Query Integration

## Goal

Capture all query and mutation failures in Sentry automatically without adding `Sentry.captureException()` to every hook individually.

---

## Global Query Error Handler

File: `src/integrations/tanstack-query/root-provider.tsx`

Modify the `QueryClient` instantiation to add global error callbacks.

### Current (approximate):
```ts
const queryClient = new QueryClient({
  defaultOptions: { ... }
})
```

### Modified:
```ts
import * as Sentry from '@sentry/tanstackstart-react'
import { ApiError } from '@/lib/api-client'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors — they won't resolve themselves
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
      staleTime: 30_000,
    },
    mutations: {
      onError: (error, variables, context) => {
        Sentry.addBreadcrumb({
          category: 'mutation',
          message: 'Mutation failed',
          level: 'error',
          data: {
            error: error instanceof Error ? error.message : String(error),
            ...(error instanceof ApiError
              ? { status: error.status, code: error.code }
              : {}),
          },
        })

        // Capture in Sentry — exclude expected 4xx errors
        const isExpected =
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500
        if (!isExpected) {
          Sentry.captureException(error)
        }
      },
    },
  },
})
```

---

## Global Query Observer (for query errors)

TanStack Query v5 does not have a global `queries.onError` callback. Instead, use a `QueryCache` observer:

```ts
import { QueryClient, QueryCache } from '@tanstack/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { ApiError } from '@/lib/api-client'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.addBreadcrumb({
        category: 'query',
        message: `Query failed: ${String(query.queryKey[0])}`,
        level: 'error',
        data: {
          queryKey: query.queryKey,
          error: error instanceof Error ? error.message : String(error),
          ...(error instanceof ApiError
            ? { status: error.status, code: error.code }
            : {}),
        },
      })

      // Capture 5xx and unexpected errors — skip 4xx which are user-facing
      const isExpected =
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      if (!isExpected) {
        Sentry.captureException(error, {
          tags: { 'query.key': String(query.queryKey[0]) },
          extra: { queryKey: query.queryKey },
        })
      }
    },
  }),

  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
      staleTime: 30_000,
    },
  },
})
```

---

## What This Covers

| Scenario | Captured? |
|---|---|
| `GET /api/v1/orders` returns 500 | ✅ Exception + breadcrumb |
| `GET /api/v1/users` returns 404 | ✅ Breadcrumb only (expected) |
| `POST /api/v1/orders` mutation 422 | ✅ Breadcrumb only (validation) |
| Network timeout / offline | ✅ Exception + breadcrumb |
| Any unhandled query error | ✅ Breadcrumb + exception |

---

## Deduplication Note

Phase 2 already calls `Sentry.captureException()` for 5xx errors at the `ApiClient` level. To avoid double-capturing, choose ONE of:

**Option A** — Capture in `ApiClient` only (simpler):
- Remove the `captureException` calls from the QueryCache observer
- Keep only the breadcrumbs in the observer
- Pro: single source, no duplicates

**Option B** — Capture in QueryCache only (more context):
- Remove the `captureException` from `api-client.ts`
- Keep all error capture in the QueryCache observer
- Pro: error event includes the `queryKey` which tells you which screen failed

**Recommendation:** Use Option B — the query key context is very valuable for debugging. Remove the `captureException` block from `api-client.ts` and centralize in QueryCache.

---

## Full Provider File (reference)

```ts
// src/integrations/tanstack-query/root-provider.tsx
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import * as Sentry from '@sentry/tanstackstart-react'
import { ApiError } from '@/lib/api-client'

function isCapturable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status >= 500
  return true // capture all non-ApiErrors (network failures, etc.)
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      Sentry.addBreadcrumb({
        category: 'query',
        message: `Query failed: ${String(query.queryKey[0])}`,
        level: 'error',
        data: {
          queryKey: query.queryKey,
          error: error instanceof Error ? error.message : String(error),
        },
      })
      if (isCapturable(error)) {
        Sentry.captureException(error, {
          tags: { 'query.key': String(query.queryKey[0]) },
          extra: { queryKey: query.queryKey },
        })
      }
    },
  }),

  mutationCache: new MutationCache({
    onError: (error) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'Mutation failed',
        level: 'error',
        data: { error: error instanceof Error ? error.message : String(error) },
      })
      if (isCapturable(error)) {
        Sentry.captureException(error)
      }
    },
  }),

  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
      staleTime: 30_000,
    },
  },
})

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  )
}
```
