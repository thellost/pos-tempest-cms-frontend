import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
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

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        },
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            {sent
              ? 'Check your email for a password reset link.'
              : "Enter your email and we'll send you a reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                If an account exists for <strong>{email}</strong>, you'll
                receive an email shortly.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
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

              {error && (
                <p className="text-sm font-medium text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send Reset Link'}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Back to Sign In</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
