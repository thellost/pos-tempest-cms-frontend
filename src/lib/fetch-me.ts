import type { Session } from '@supabase/supabase-js'
import type { User } from '@/hooks/use-auth'

/**
 * Standalone /me fetch — used by the router's beforeLoad so the user profile
 * is resolved before any component renders (no post-mount gap).
 */
export async function fetchMe(session: Session): Promise<User | null> {
  try {
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.data as User) ?? null
  } catch {
    return null
  }
}
