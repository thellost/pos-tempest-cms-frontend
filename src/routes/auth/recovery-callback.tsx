import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/auth/recovery-callback')({
  component: RecoveryCallbackPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function RecoveryCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // createBrowserClient auto-exchanges the PKCE code from the URL.
    // We listen for the resulting auth event instead of calling
    // exchangeCodeForSession manually (which would fail — code already used).

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') &&
        session
      ) {
        navigate({ to: '/recovery-password' as string })
      }
    })

    // Fallback: session may already exist if the event fired before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: '/recovery-password' as string })
      }
    })

    // If nothing happens within 8 seconds, show an error
    const timeout = setTimeout(() => {
      setError(
        'This link has expired or was opened in a different browser. Please request a new password reset.',
      )
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
            <CardDescription className="mt-2">{error}</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request New Reset Link</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
