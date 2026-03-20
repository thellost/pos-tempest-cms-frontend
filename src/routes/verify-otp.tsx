import { useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/verify-otp')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : '',
  }),
  component: VerifyOtpPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function VerifyOtpPage() {
  const navigate = useNavigate()
  const { email } = Route.useSearch()

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resent, setResent] = useState(false)

  const token = digits.join('')

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = digit
    setDigits(next)
    if (digit && index < 5) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const focusAt = Math.min(pasted.length, 5)
    refs.current[focusAt]?.focus()
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (token.length < 6) {
      setError('Please enter all 6 digits.')
      return
    }
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      })

      if (verifyError) {
        setError(verifyError.message)
        return
      }

      navigate({ to: '/recovery-password' as string })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    setIsResending(true)
    setResent(false)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)
      if (resetError) {
        setError(resetError.message)
      } else {
        setDigits(Array(6).fill(''))
        refs.current[0]?.focus()
        setResent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <strong>{email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 6-box OTP input */}
            <div className="flex justify-center gap-2">
              {digits.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { refs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                  className="h-12 w-10 text-center text-lg font-semibold"
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            {resent && (
              <p className="text-center text-sm text-muted-foreground">
                A new code has been sent.
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || token.length < 6}
            >
              {isSubmitting ? 'Verifying…' : 'Verify Code'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isResending}
                onClick={handleResend}
              >
                {isResending ? 'Sending…' : 'Resend code'}
              </Button>
              <Link
                to="/login"
                search={{ redirect: undefined }}
                className="text-muted-foreground hover:text-foreground"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
