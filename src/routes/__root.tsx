import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import * as TanstackQuery from '@/integrations/tanstack-query/root-provider'
import { AuthProvider } from '@/hooks/use-auth'
import { ErrorBoundary } from '@/components/error-boundary'
import { RouterProgressBar } from '@/components/layout/router-progress-bar'
import appCss from '@/styles.css?url'
import { Toaster } from '@/components/ui/sonner'

// ─── Router context ───────────────────────────────────────────────────────────

interface RouterContext {
  queryClient: QueryClient
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'POS Tempest CMS' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/png', href: '/icon.png' },
    ],
  }),
  notFoundComponent: NotFound,
  component: RootDocument,
})

// ─── Document shell ───────────────────────────────────────────────────────────

function RootDocument() {
  const { queryClient } = Route.useRouteContext()

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <RouterProgressBar />
        <ErrorBoundary>
          <TanstackQuery.Provider queryClient={queryClient}>
            <AuthProvider>
              <Outlet />
            </AuthProvider>
          </TanstackQuery.Provider>
        </ErrorBoundary>
        <Scripts />
        <Toaster />
      </body>
    </html>
  )
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Go home
      </Link>
    </div>
  )
}
