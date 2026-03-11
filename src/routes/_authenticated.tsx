import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
    // Use the server client (cookie-based) on SSR, the browser client
    // (localStorage + cookie) on the client — both read from cookies so the
    // check now runs on every request, server-side included.
    const client =
      typeof window === 'undefined'
        ? (await import('@/lib/supabase-server')).createSupabaseServerClient()
        : supabase

    const {
      data: { session },
    } = await client.auth.getSession()

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

  // Component-level fallback: catches the edge case where a session expires
  // or is revoked after the initial render (e.g. token invalidated elsewhere).
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [isLoading, isAuthenticated, navigate])

  // Show skeleton while session/profile is resolving.
  if (isLoading || !isAuthenticated) return <LayoutSkeleton />

  // If the session is valid but the backend /me fetch failed, sign out and
  // send the user to login — no point showing an error screen they can't
  // recover from without re-authenticating.
  if (!user) {
    signOut().then(() => navigate({ to: '/login' }))
    return <LayoutSkeleton />
  }

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
