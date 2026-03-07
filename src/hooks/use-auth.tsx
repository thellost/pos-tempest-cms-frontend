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
  /** True while the initial session check is in progress */
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
  const [isLoading, setIsLoading] = useState(bootstrap === null)

  const loadUserProfile = useCallback(
    async (currentSession: Session | null) => {
      if (!currentSession?.access_token) {
        setUser(null)
        return
      }
      // Use raw fetch here (not the api client) so that a 401 or network error
      // from the backend never triggers the api-client’s signOut+redirect chain
      // during auth initialisation.
      try {
        const apiBaseUrl =
          import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
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
        setUser((json.data as User) ?? null)
      } catch {
        // Network error (backend offline) — keep session alive, just no profile
        setUser(null)
      }
    },
    [],
  )

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadUserProfile(newSession)
    })

    if (bootstrapRef.current) {
      // Router already fetched session + /me before this component mounted.
      // Skip the redundant getSession + fetchMe round-trip; just keep the
      // subscription alive for token refresh / sign-out events.
      return () => subscription.unsubscribe()
    }

    // Non-bootstrapped path (login page, direct /me-less routes).
    supabase.auth
      .getSession()
      .then(({ data: { session: existingSession } }) => {
        setSession(existingSession)
        return loadUserProfile(existingSession)
      })
      .finally(() => setIsLoading(false))

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // Clear all in-memory auth state so no stale data lingers after logout
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
        isLoading,
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
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return ctx
}
