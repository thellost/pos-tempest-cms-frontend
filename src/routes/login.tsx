import { useState } from 'react'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'
import { useAuth } from '@/hooks/use-auth'
import { AuthLayout } from '@/components/auth-layout'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    let session
    try {
      if (typeof window === 'undefined') {
        session = await getServerSession()
      } else {
        const { data } = await supabase.auth.getSession()
        session = data.session
      }
    } catch {
      if (typeof window !== 'undefined') await supabase.auth.signOut()
    }

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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await signIn(email, password)
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
    <AuthLayout>
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="text-[2rem] font-bold text-gray-900 tracking-tight leading-tight"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          Log In
        </h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          Enter your email and password to access your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
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

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 bg-gray-50/60 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  )
}
