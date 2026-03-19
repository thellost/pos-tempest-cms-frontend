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
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  component: RecoveryCallbackPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function RecoveryCallbackPage() {
  const navigate = useNavigate()
  const { code } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      setError('Invalid or missing recovery link. Please request a new one.')
      return
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        // Most likely cause: the link was opened in a different browser than
        // where the reset was requested (PKCE verifier not found in storage).
        setError(
          'This link has expired or was opened in a different browser. Please request a new password reset.',
        )
        return
      }

      navigate({ to: '/recovery-password' as string })
    })
  }, [code, navigate])

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
