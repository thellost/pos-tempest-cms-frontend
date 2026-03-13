import { useState } from 'react'
import {
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    // Preserve the URL the user was trying to reach so we can redirect back
    redirect:
      typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    const client =
      typeof window === 'undefined'
        ? (await import('@/lib/supabase-server')).createSupabaseServerClient()
        : supabase

    let session
    try {
      const { data } = await client.auth.getSession()
      session = data.session
    } catch {
      // Stale refresh token — clear it so the user can log in fresh.
      await client.auth.signOut()
    }

    // Already authenticated → skip login page
    if (session) {
      throw redirect({ to: '/dashboard' as string })
    }
  },
  component: LoginPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { redirect: redirectTo } = Route.useSearch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await signIn(email, password)
      // Redirect back to the page they were trying to reach, or dashboard
      if (redirectTo && redirectTo !== '/login') {
        navigate({ to: redirectTo as string })
      } else {
        navigate({ to: '/dashboard' as string })
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid email or password.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">POS Tempest</CardTitle>
          <CardDescription>Sign in to your CMS account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
