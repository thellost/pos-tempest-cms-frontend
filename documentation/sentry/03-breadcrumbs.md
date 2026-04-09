# Phase 3 – Breadcrumbs Strategy

## Goal

Build a complete breadcrumb trail for every Sentry event so engineers can reconstruct exactly what the user did before an error.

---

## Breadcrumb Sources

| Source | How | Category |
|---|---|---|
| Route navigation | Auto via `tanstackRouterBrowserTracingIntegration` | `navigation` |
| Outgoing HTTP fetch | Auto via `httpClientIntegration` + Phase 2 manual | `http` |
| DOM clicks | Auto via `breadcrumbsIntegration({ dom: true })` | `ui.click` |
| Console errors | Auto via `captureConsoleIntegration` | `console` |
| Auth events | Manual — Phase 3 | `auth` |
| Mutation events | Manual — Phase 3 | `mutation` |
| Query failures | Manual — Phase 5 | `query` |

---

## Auth Breadcrumbs

File: `src/hooks/use-auth.tsx`

Add breadcrumbs at each auth state transition. These should go in the same place where auth state changes happen.

### On login success:
```ts
import * as Sentry from '@sentry/tanstackstart-react'

// After successful sign-in
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User signed in',
  level: 'info',
  data: { userId: user.id, email: user.email },
})
```

### On logout:
```ts
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User signed out',
  level: 'info',
})
```

### On session expiry (inside the 401 handler in `api-client.ts`):
```ts
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'Session expired — auto signed out',
  level: 'warning',
  data: { endpoint: path },
})
```

---

## Mutation Breadcrumbs

The cleanest place to add mutation breadcrumbs is at the service layer or in the mutation hooks. Add them in the `onMutate`, `onSuccess`, and `onError` callbacks.

### Pattern for any `useMutation`:

```ts
import * as Sentry from '@sentry/tanstackstart-react'

const createOrder = useMutation({
  mutationFn: (data: CreateOrderInput) => orderService.create(data),

  onMutate: (variables) => {
    Sentry.addBreadcrumb({
      category: 'mutation',
      message: 'createOrder started',
      level: 'info',
      data: { branchId: variables.branchId },
    })
  },

  onSuccess: (result, variables) => {
    Sentry.addBreadcrumb({
      category: 'mutation',
      message: 'createOrder succeeded',
      level: 'info',
      data: { orderId: result.data.id },
    })
  },

  onError: (error, variables) => {
    Sentry.addBreadcrumb({
      category: 'mutation',
      message: 'createOrder failed',
      level: 'error',
      data: {
        error: error instanceof Error ? error.message : String(error),
        branchId: variables.branchId,
      },
    })
  },
})
```

### Which mutations to instrument

Prioritize mutations with business impact. Recommended:

| Mutation | `onMutate` data | `onSuccess` data |
|---|---|---|
| `createOrder` | `branchId`, item count | `orderId` |
| `updateOrder` | `orderId`, new status | — |
| `createShift` | `deviceId` | `shiftId` |
| `closeShift` | `shiftId` | closing totals |
| `createUser` | email, role | `userId` |
| `updateInventory` | item count | — |
| `applyDiscount` | discount code | — |

You do NOT need to add breadcrumbs to every mutation — Phase 5's global `onError` handler already captures failures.

---

## Custom User Action Breadcrumbs

For critical user actions that aren't mutations (e.g., opening a dialog, applying a filter, printing a receipt), add them inline:

```ts
const handlePrintReceipt = () => {
  Sentry.addBreadcrumb({
    category: 'ui.action',
    message: 'Print receipt triggered',
    level: 'info',
    data: { orderId },
  })
  // ... print logic
}
```

Keep these minimal — DOM clicks are already auto-captured. Only add manual breadcrumbs when context (like which orderId) would otherwise be missing.

---

## Breadcrumb Limits

Sentry keeps the last **100 breadcrumbs** per event by default. You can increase this in the init config:

```ts
// in sentry.client.config.ts
Sentry.init({
  // ...
  maxBreadcrumbs: 150,
})
```

150 is a reasonable upper bound for a POS-style app with moderate navigation depth.
