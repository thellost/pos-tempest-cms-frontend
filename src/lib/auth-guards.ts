import { redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { User } from '@/hooks/use-auth'
import { api } from '@/lib/api-client'

// ─── requireRole ─────────────────────────────────────────────────────────────
//
// Returns a `beforeLoad` function for use in child routes of `_authenticated`.
// Fetches the user profile (from cache or API) and checks the role.
//
// Usage:
//   export const Route = createFileRoute('/_authenticated/users/')({
//     beforeLoad: requireRole(['admin', 'manager']),
//     ...
//   })

export function requireRole(allowedRoles: string[]) {
  return async ({
    context,
  }: {
    context: { queryClient: QueryClient }
  }): Promise<void> => {
    // Skip on SSR — auth is client-only (localStorage session)
    if (typeof window === 'undefined') return

    let user = context.queryClient.getQueryData<User>(['users', 'me'])

    if (!user) {
      try {
        const { data } = await api.get<User>('/api/v1/users/me')
        // Cache the profile so subsequent requireRole calls in the same
        // navigation don't make extra requests
        context.queryClient.setQueryData(['users', 'me'], data)
        user = data
      } catch {
        throw redirect({ to: '/login' })
      }
    }

    if (!allowedRoles.includes(user.role_name)) {
      // TODO: Show "Access denied" toast once sonner is installed (Step 2.1)
      throw redirect({ to: '/' as string })
    }
  }
}
