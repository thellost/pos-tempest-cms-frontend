import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth-layout'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)

      if (resetError) {
        setError(resetError.message)
        return
      }

      navigate({ to: '/verify-otp', search: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
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
          Forgot Password?
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Enter your email and we'll send you a 6-digit verification code.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 focus:bg-white transition-all"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3.5 py-2.5 rounded-xl">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
          }}
        >
          {isSubmitting ? 'Sending…' : 'Send Code'}
        </button>
      </form>
    </AuthLayout>
  )
}
