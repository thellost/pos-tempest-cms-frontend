import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { LayoutSkeleton } from '@/components/layout/layout-skeleton'
import { useAuth } from '@/hooks/use-auth'

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
  },
  pendingComponent: LayoutSkeleton,
  pendingMs: 0,
  component: AuthenticatedLayout,
})

// --- Layout ------------------------------------------------------------------

function AuthenticatedLayout() {
  const { isLoading } = useAuth()

  // Keep the skeleton showing until the /me fetch resolves so there's no
  // flash of the sidebar with null user/role data.
  if (isLoading) return <LayoutSkeleton />

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
