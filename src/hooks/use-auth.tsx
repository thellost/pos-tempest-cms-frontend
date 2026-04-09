import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearAuthBootstrap, getAuthBootstrap } from '@/lib/auth-store'
import * as Sentry from '@sentry/tanstackstart-react'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  role_id: number
  role_name: string
  branch_id: number | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

interface AuthContextValue {
  /** Full backend profile (id, name, email, role_name, branch_id, …) */
  user: User | null
  /** Raw Supabase session (contains access_token) */
  session: Session | null
  /** True while session or profile is loading */
  isLoading: boolean
  /** Shorthand for session !== null */
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** "admin" | "manager" | "cashier" | "chef" | "waiter" | null */
  role: string | null
  /** User's assigned branch ID */
  branchId: number | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  // Read once — populated by _authenticated beforeLoad before React renders.
  // If present, useState initializers get real data and isLoading starts false.
  const bootstrapRef = useRef(getAuthBootstrap())
  const bootstrap = bootstrapRef.current

  const [session, setSession] = useState<Session | null>(bootstrap?.session ?? null)
  const [user, setUser] = useState<User | null>(bootstrap?.user ?? null)
  const [isSessionLoading, setIsSessionLoading] = useState(bootstrap === null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)

  const loadUserProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.access_token) {
      setUser(null)
      return
    }
    setIsProfileLoading(true)
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
      const response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        setUser(null)
        return
      }
      const json = await response.json()
      const profile = (json.data as User) ?? null
      setUser(profile)
    } catch {
      // Network error (backend offline) — keep session alive, just no profile
      setUser(null)
    } finally {
      setIsProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: String(user.id),
        email: user.email,
        username: user.name,
      })
      Sentry.setTag('user.role', user.role_name)
      Sentry.setTag(
        'branch.id',
        user.branch_id !== null ? String(user.branch_id) : 'none',
      )
      return
    }

    Sentry.setUser(null)
    Sentry.setTag('user.role', 'anonymous')
    Sentry.setTag('branch.id', 'none')
  }, [user])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)

        if (event === 'SIGNED_IN' && newSession?.user) {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'User signed in',
            level: 'info',
            data: { userId: newSession.user.id, email: newSession.user.email },
          })
        }

        if (event === 'SIGNED_OUT') {
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'User signed out',
            level: 'info',
          })
        }

        await loadUserProfile(newSession)
      },
    )

    if (bootstrapRef.current) {
      // Router already fetched session + /me before this component mounted.
      // Skip the redundant round-trip; keep subscription alive for token refresh.
      return () => subscription.unsubscribe()
    }

    // Non-bootstrapped path (login page, public routes).
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        setSession(existingSession)
        return loadUserProfile(existingSession)
      })
      .finally(() => setIsSessionLoading(false))

    return () => subscription.unsubscribe()
  }, [loadUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Sign in request succeeded',
      level: 'info',
      data: { email },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    Sentry.setUser(null)
    clearAuthBootstrap()
    queryClient.removeQueries({ queryKey: ['users', 'me'] })
    setUser(null)
    setSession(null)
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading: isSessionLoading || isProfileLoading,
        isAuthenticated: !!session,
        signIn,
        signOut,
        role: user?.role_name ?? null,
        branchId: user?.branch_id ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
