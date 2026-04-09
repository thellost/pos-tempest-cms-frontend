# Phase 4 – User Context

## Goal

Attach the authenticated user's identity to every Sentry event so you can:
- Filter issues by user
- See exactly which users are affected by a bug
- Search events by email or user ID

---

## Where to Set User Context

File: `src/hooks/use-auth.tsx`

The `AuthProvider` already fetches `/me` and holds the current user. This is the right place to call `Sentry.setUser()`.

### On user load (inside `AuthProvider` or equivalent effect):

```ts
import * as Sentry from '@sentry/tanstackstart-react'

// After user is loaded (from bootstrap or /me response)
useEffect(() => {
  if (user) {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.name,
      // Add any other non-sensitive fields useful for debugging
      // role: user.role,
      // branch_id: user.branch_id,
    })
  } else {
    Sentry.setUser(null) // clears user context
  }
}, [user])
```

### On logout (wherever `supabase.auth.signOut()` is called):

```ts
Sentry.setUser(null)
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User signed out',
  level: 'info',
})
```

---

## Scope Tags (Optional Enrichment)

For per-session context that isn't user identity, use `Sentry.setTag()`:

```ts
// After user loads — set global tags for all events in this session
Sentry.setTag('user.role', user.role)
Sentry.setTag('branch.id', String(user.branch_id))
```

Tags appear as filterable columns in the Sentry issues list — useful for questions like "is this bug only happening for managers?" or "is this branch-specific?".

---

## Privacy Considerations

The `replayIntegration` defaults configured in Phase 1 (`maskAllText: false`) will record user input. If the app handles sensitive data (PII, payment info), consider:

```ts
Sentry.replayIntegration({
  maskAllText: true,        // mask all text in replay
  blockAllMedia: true,
  maskAllInputs: true,      // mask form inputs
})
```

Or apply selective masking with `data-sentry-mask` HTML attribute on specific elements.

---

## Result

After this phase, the Sentry issue detail page will show:

```
Affected Users: 3
  · john@example.com (id: 42, role: manager)
  · jane@example.com (id: 17, role: cashier)
  · admin@example.com (id: 1, role: admin)
```

And you can search: `user.email:john@example.com` to find all events from a specific user.
