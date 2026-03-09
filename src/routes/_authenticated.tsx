import { createFileRoute, Outlet, redirect, useRouter } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { LayoutSkeleton } from '@/components/layout/layout-skeleton'
import { useAuth } from '@/hooks/use-auth'
import { fetchMe } from '@/lib/fetch-me'
import { setAuthBootstrap } from '@/lib/auth-store'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

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
    // Skip on SSR — session lives in localStorage
    if (typeof window === 'undefined') return

    const {
      data: { session },
    } = await supabase.auth.getSession()

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
  const { isLoading, user } = useAuth()
  const router = useRouter()

  // Keep the skeleton showing until the /me fetch resolves so there's no
  // flash of the sidebar with null user/role data.
  if (isLoading) return <LayoutSkeleton />

  // If the session is valid but the profile fetch failed (server timeout /
  // error), block rendering and let the user retry rather than showing the
  // shell with unknown role data.
  if (!user) return <ProfileFetchError onRetry={() => router.invalidate()} />

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

// --- Profile fetch error screen ----------------------------------------------

function ProfileFetchError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <AlertCircle className="size-10 text-destructive" />
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold">Could not load your profile</p>
        <p className="text-sm text-muted-foreground">
          The server took too long to respond or returned an error.
        </p>
      </div>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  )
}
