import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import * as Sentry from '@sentry/tanstackstart-react'
import { ApiError } from '@/lib/api-client'

function isCapturable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500
  }

  return true
}

function getPrimaryQueryKey(queryKey: readonly unknown[]): string {
  const primary = queryKey[0]
  return typeof primary === 'string' ? primary : 'unknown'
}

export function getContext() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const primaryKey = getPrimaryQueryKey(query.queryKey)

        Sentry.addBreadcrumb({
          category: 'query',
          message: `Query failed: ${primaryKey}`,
          level: 'error',
          data: {
            queryKey: query.queryKey,
            error: error instanceof Error ? error.message : String(error),
            ...(error instanceof ApiError
              ? { status: error.status, code: error.code }
              : {}),
          },
        })

        if (isCapturable(error)) {
          Sentry.captureException(error, {
            tags: { 'query.key': primaryKey },
            extra: { queryKey: query.queryKey },
          })
        }
      },
    }),

    mutationCache: new MutationCache({
      onError: (error, variables, _context, mutation) => {
        const mutationName = mutation.options.mutationKey?.length
          ? String(mutation.options.mutationKey[0])
          : 'unknown mutation'

        Sentry.addBreadcrumb({
          category: 'mutation',
          message: `Mutation failed: ${mutationName}`,
          level: 'error',
          data: {
            mutationKey: mutation.options.mutationKey,
            variables,
            error: error instanceof Error ? error.message : String(error),
            ...(error instanceof ApiError
              ? { status: error.status, code: error.code }
              : {}),
          },
        })

        if (isCapturable(error)) {
          Sentry.captureException(error, {
            tags: { 'mutation.key': mutationName },
            extra: { mutationKey: mutation.options.mutationKey, variables },
          })
        }
      },
    }),

    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) {
            return false
          }

          return failureCount < 2
        },
        staleTime: 30_000,
      },
    },
  })

  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
