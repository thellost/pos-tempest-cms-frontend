import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { LayoutSkeleton } from '@/components/layout/layout-skeleton'
import { useAuth } from '@/hooks/use-auth'
import { fetchMe } from '@/lib/fetch-me'
import { setAuthBootstrap } from '@/lib/auth-store'

// --- Route -------------------------------------------------------------------
//
// Pathless layout route � all CMS pages are children of this route.
// beforeLoad runs on every navigation to any child route and ensures the user
// has a valid Supabase session.  Unauthenticated requests are redirected to
// /login with ?redirect=<original-path> so login can bounce the user back.
//
// Step 1.5 will replace <Outlet /> with the full sidebar + top-bar shell.

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    let session
    try {
      if (typeof window === 'undefined') {
        // SSR: use cookie-based server session (executes handler directly, no HTTP round-trip)
        session = await getServerSession()
      } else {
        // Client: use browser Supabase client (localStorage + cookies)
        const { data } = await supabase.auth.getSession()
        session = data.session
      }
    } catch {
      // Stale / invalid refresh token — clear it and redirect.
      if (typeof window !== 'undefined') await supabase.auth.signOut()
    }

    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Fetch /me HERE, before any component renders, so AuthProvider can
    // initialize with real data instead of null (no post-mount gap).
    const user = await fetchMe(session)
    setAuthBootstrap(user, session)
  },
  pendingComponent: LayoutSkeleton,
  pendingMs: 0,
  component: AuthenticatedLayout,
})

// --- Layout ------------------------------------------------------------------

function AuthenticatedLayout() {
  const { isLoading, isAuthenticated, user, signOut } = useAuth()
  const navigate = useNavigate()

  // Component-level fallback: catches session expiry, revocation, or a
  // permanent /me failure — all handled after loading completes.
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      navigate({ to: '/login' })
      return
    }
    // Session valid but backend /me permanently failed — sign out so the
    // user can re-authenticate cleanly.
    if (!user) {
      signOut().then(() => navigate({ to: '/login', search: { redirect: undefined } }))
    }
  }, [isLoading, isAuthenticated, user, signOut, navigate])

  // Show skeleton while session/profile is resolving (isLoading covers both).
  if (isLoading || !isAuthenticated || !user) return <LayoutSkeleton />

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
