import type { Session } from '@supabase/supabase-js'
import type { User } from '@/hooks/use-auth'

/**
 * Module-level singleton.
 *
 * TanStack Router runs beforeLoad for ALL matching routes before React renders
 * the component tree. `_authenticated` beforeLoad populates this store with the
 * already-fetched user + session, so AuthProvider can initialize its useState
 * with real data instead of null — eliminating the post-mount /me fetch gap.
 */
export interface AuthBootstrap {
  user: User | null
  session: Session
}

let _bootstrap: AuthBootstrap | null = null

export function setAuthBootstrap(
  user: User | null,
  session: Session,
): void {
  _bootstrap = { user, session }
}

/** Read once by AuthProvider during its first render. */
export function getAuthBootstrap(): AuthBootstrap | null {
  return _bootstrap
}
