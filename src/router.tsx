import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { initSentry } from './lib/sentry'

// Import the generated route tree
import { routeTree } from './routeTree.gen.ts'

// Create a new router instance
export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
    },

    defaultPreload: 'intent',
  })

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient })

  // Initialize Sentry with the router instance for route-aware tracing.
  // No-op on server (SSR guard inside) and idempotent across hot reloads.
  initSentry(router)

  return router
}
