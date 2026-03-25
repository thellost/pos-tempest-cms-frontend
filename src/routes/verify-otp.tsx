import { useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth-layout'

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
    <AuthLayout>
      {/* Back link */}
      <Link
        to="/login"
        search={{ redirect: undefined }}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-8"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to Sign In
      </Link>

      {/* Heading */}
      <div className="mb-8">
        <h1
          className="text-[2rem] font-bold text-gray-900 tracking-tight leading-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Check your email
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-gray-700">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 6-box OTP input */}
        <div className="flex justify-between gap-2">
          {digits.map((digit, i) => (
            <input
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
              className="h-12 w-full text-center text-lg font-bold rounded-xl border border-gray-200 bg-gray-50/60 text-gray-900 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 focus:bg-white transition-all caret-violet-500"
              style={{ maxWidth: '52px' }}
            />
          ))}
        </div>

        {/* Feedback messages */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl text-center">
            {error}
          </p>
        )}
        {resent && (
          <p className="text-sm text-green-600 bg-green-50 border border-green-100 px-3.5 py-2.5 rounded-xl text-center">
            A new code has been sent to your email.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || token.length < 6}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
          }}
        >
          {isSubmitting ? 'Verifying…' : 'Verify Code'}
        </button>

        {/* Resend */}
        <p className="text-center text-sm text-gray-500">
          Didn't receive a code?{' '}
          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="font-medium text-violet-600 hover:text-violet-700 transition-colors disabled:opacity-50"
          >
            {isResending ? 'Sending…' : 'Resend'}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}
