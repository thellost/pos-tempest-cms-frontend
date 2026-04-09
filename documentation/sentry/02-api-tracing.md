# Phase 2 – API Response Time Tracing

## Goal

Every request made through `ApiClient` becomes a Sentry span with:
- HTTP method and path as the span name
- Response status code
- Exact response time in milliseconds
- Whether the request failed — and why

The `httpClientIntegration()` from Phase 1 already adds **breadcrumbs** for every fetch call automatically. This phase adds **spans** (performance traces) with richer data.

---

## Why Spans, Not Just Breadcrumbs?

| | Breadcrumbs | Spans |
|---|---|---|
| Appear in error events | ✅ | ❌ |
| Appear in Performance tab | ❌ | ✅ |
| Carry timing data | Rough | Precise (start + end) |
| Nested (parent → child) | ❌ | ✅ |
| Queryable / alertable | ❌ | ✅ |

Use both: breadcrumbs for context trail on errors, spans for latency monitoring and alerting.

---

## Changes to `src/lib/api-client.ts`

Wrap the `request()` private method with `Sentry.startSpan()`.

### Full modified `request()` method:

```ts
import * as Sentry from '@sentry/tanstackstart-react'

// ── Core fetch ──────────────────────────────────────────────────────────────

private async request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers = await this.getHeaders()
  const url = `${this.baseUrl}${path}`

  return Sentry.startSpan(
    {
      op: 'http.client',
      name: `${method} ${path}`,
      attributes: {
        'http.request.method': method,
        'url.full': url,
        'url.path': path,
        'server.address': this.baseUrl,
      },
    },
    async (span) => {
      const t0 = performance.now()

      const response = await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })

      const durationMs = Math.round(performance.now() - t0)

      // Attach response metadata to the span
      span.setAttributes({
        'http.response.status_code': response.status,
        'http.response_time_ms': durationMs,
      })

      // Add a breadcrumb with timing — visible in error event trail
      Sentry.addBreadcrumb({
        category: 'http',
        message: `${method} ${path}`,
        level: response.ok ? 'info' : 'warning',
        data: {
          url,
          method,
          status_code: response.status,
          duration_ms: durationMs,
        },
      })

      // ── 401 → sign out ──────────────────────────────────────────────────
      if (response.status === 401) {
        span.setStatus({ code: 2, message: 'unauthenticated' }) // SPAN_STATUS_ERROR
        await supabase.auth.signOut()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401)
      }

      let envelope: ApiEnvelope<T>

      try {
        envelope = (await response.json()) as ApiEnvelope<T>
      } catch {
        span.setStatus({ code: 2, message: 'parse_error' })
        throw new ApiError(
          `Failed to parse response from ${method} ${path}`,
          'PARSE_ERROR',
          response.status,
        )
      }

      if (!response.ok || !envelope.success) {
        const errPayload = envelope.error
        const message =
          typeof errPayload === 'object' && errPayload !== null
            ? errPayload.message
            : (errPayload ?? `Request failed: ${method} ${path}`)
        const code =
          typeof errPayload === 'object' && errPayload !== null
            ? errPayload.code
            : 'API_ERROR'

        span.setStatus({ code: 2, message: code.toLowerCase() })

        // Capture API errors in Sentry (excluding 401/404 which are expected)
        const shouldCapture = response.status >= 500
        if (shouldCapture) {
          Sentry.captureException(new ApiError(message, code, response.status), {
            tags: {
              'api.method': method,
              'api.path': path,
              'api.status': response.status,
            },
            extra: {
              url,
              duration_ms: durationMs,
              error_code: code,
            },
          })
        }

        throw new ApiError(message, code, response.status)
      }

      return {
        data: envelope.data as T,
        meta: envelope.meta,
      }
    },
  )
}
```

---

## Reading the Results in Sentry

### Performance tab
- Each API call appears as a child span under the current route's transaction
- Span name: `GET /api/v1/orders`
- Duration: the exact milliseconds
- Status: OK (green) or error (red)

### Waterfall view
You'll see something like:
```
page-load /orders                          1.2s
  ├─ GET /api/v1/orders                   89ms  200
  ├─ GET /api/v1/branches                 43ms  200
  └─ GET /api/v1/statistics/summary      121ms  200
```

### Alerting
Go to Sentry → Alerts → Create Alert → Transaction → filter by `http.url` contains `/api/v1/orders` → alert when p95 > 500ms.

---

## Distributed Tracing (Optional)

If the backend also has Sentry installed, the `tracePropagationTargets` set in Phase 1 will inject `sentry-trace` and `baggage` headers on every request to your API base URL. The backend can pick these up and continue the same trace, connecting frontend → backend spans in one waterfall.

No frontend changes needed — it's automatic once `tracePropagationTargets` is configured.
