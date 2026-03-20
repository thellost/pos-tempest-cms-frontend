import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon, LoaderCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from '@/components/auth-layout'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/recovery-password')({
  component: RecoveryPasswordPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHashTokens() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.substring(1)
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const type = params.get('type')
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (type !== 'recovery' || !accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function RecoveryPasswordPage() {
  const navigate = useNavigate()

  const [isReady, setIsReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const tokens = parseHashTokens()

      if (tokens) {
        const { error } = await supabase.auth.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        })

        if (!error && !cancelled) {
          window.history.replaceState(null, '', window.location.pathname)
          setIsReady(true)
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (data.session && !cancelled) {
        setIsReady(true)
        return
      }

      if (!cancelled) {
        navigate({ to: '/login', search: { redirect: undefined } })
      }
    }

    init()
    return () => { cancelled = true }
  }, [navigate])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(updateError.message)
        return
      }

      await supabase.auth.signOut()
      navigate({ to: '/login', search: { redirect: undefined } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isReady) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <LoaderCircle className="size-8 text-violet-500 animate-spin" />
          <div>
            <h2
              className="text-xl font-bold text-gray-900"
              style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            >
              Verifying your link
            </h2>
            <p className="mt-1 text-sm text-gray-500">Just a moment…</p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="text-[2rem] font-bold text-gray-900 tracking-tight leading-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Reset Password
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Choose a strong new password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-gray-700"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </div>
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
          {isSubmitting ? 'Updating password…' : 'Update Password'}
        </button>
      </form>
    </AuthLayout>
  )
}
