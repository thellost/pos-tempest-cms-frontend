import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // With implicit flow, Supabase detects the hash tokens automatically and
    // fires SIGNED_IN. We just wait for the session and redirect to dashboard.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate({ to: '/dashboard' as string })
      }
    })

    // Fallback: session may already be set before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: '/dashboard' as string })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
