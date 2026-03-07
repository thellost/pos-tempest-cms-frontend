import type { Session } from '@supabase/supabase-js'
import type { User } from '@/hooks/use-auth'

/** How long (ms) to wait for the /me endpoint before giving up. */
const FETCH_ME_TIMEOUT_MS = 10_000

/**
 * Standalone /me fetch — used by the router's beforeLoad so the user profile
 * is resolved before any component renders (no post-mount gap).
 *
 * Returns `null` on any failure (network error, server error, or timeout).
 * The caller is responsible for deciding how to handle a null result.
 */
export async function fetchMe(session: Session): Promise<User | null> {
  try {
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
    const res = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
      signal: AbortSignal.timeout(FETCH_ME_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.data as User) ?? null
  } catch {
    // Covers network errors, AbortError (timeout), and JSON parse failures.
    return null
  }
}
