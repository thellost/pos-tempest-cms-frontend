import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { code, type } = search

    if (!code) {
      throw redirect({ to: '/login' })
    }

    // Exchange the code from the email link for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      throw redirect({ to: '/login' })
    }

    // If this is a recovery flow, send to the password reset page
    if (type === 'recovery') {
      throw redirect({ to: '/recovery-password' as string })
    }

    // For other callback types (e.g. email confirmation), go to dashboard
    throw redirect({ to: '/dashboard' as string })
  },
})
