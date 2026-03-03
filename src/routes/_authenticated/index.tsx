import { createFileRoute, redirect } from '@tanstack/react-router'

// Authenticated users landing on / are sent to /dashboard.
// Unauthenticated users never reach this — _authenticated.tsx beforeLoad
// intercepts them first and sends them to /login.

export const Route = createFileRoute('/_authenticated/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' as string })
  },
  component: () => null,
})
