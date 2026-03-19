import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  component: AuthCallbackPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { code, type } = Route.useSearch()

  useEffect(() => {
    if (!code) {
      navigate({ to: '/login', search: { redirect: undefined } })
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        navigate({ to: '/login', search: { redirect: undefined } })
        return
      }

      if (type === 'recovery') {
        navigate({ to: '/recovery-password' as string })
      } else {
        navigate({ to: '/dashboard' as string })
      }
    })
  }, [code, type, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
