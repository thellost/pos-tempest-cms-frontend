import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

// ─── Types ────────────────────────────────────────────────────────────────────

interface UsePaginationOptions {
  /** Default page number. Defaults to 1. */
  defaultPage?: number
  /** Default items per page. Defaults to 20. */
  defaultPageSize?: number
  /**
   * When true, page/page_size are read from and written to the URL search
   * params (`?page=&page_size=`). Requires the route (or any ancestor route)
   * to allow unknown search params — TanStack Router reads them via
   * `strict: false` so no per-route schema declaration is needed.
   *
   * Defaults to true.
   */
  syncToUrl?: boolean
}

export interface UsePaginationReturn {
  /** Current page (1-based). */
  page: number
  /** Items per page. */
  pageSize: number
  /** 0-based offset — useful for APIs that use offset pagination. */
  offset: number
  /** Navigate to a specific page. */
  setPage: (page: number) => void
  /** Change items-per-page and reset back to page 1. */
  setPageSize: (pageSize: number) => void
  /** Reset both page and pageSize back to their defaults. */
  reset: () => void
  /** Serialized pagination params ready for `buildQueryParams()`. */
  toQueryParams: () => { page: number; pageSize: number }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `usePagination`
 *
 * Manages `page` / `pageSize` state and syncs it with URL search params so
 * that browser back/forward navigation preserves the user's position.
 *
 * Usage:
 * ```tsx
 * const { page, pageSize, setPage, setPageSize, toQueryParams } = usePagination()
 *
 * const { data } = useQuery({
 *   queryKey: queryKeys.users.list({ ...filters, ...toQueryParams() }),
 *   queryFn: () => api.get('/api/v1/users', buildQueryParams(filters, { page, pageSize })),
 * })
 * ```
 *
 * URL shape: `?page=2&page_size=50`
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    defaultPage = DEFAULT_PAGE,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    syncToUrl = true,
  } = options

  const _navigate = useNavigate()
  // Cast once — no routes declare page/page_size search params yet, so
  // TanStack Router infers the search state as `never`. Once list routes add
  // validateSearch, this cast can be removed.
  const navigate = _navigate as unknown as (opts: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>
    replace?: boolean
  }) => void

  // Read current search params from the URL without requiring a specific route
  // schema — strict:false returns whatever search params happen to be present.
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>

  // Parse page / page_size from URL (fall back to defaults)
  const page = useMemo(() => {
    if (!syncToUrl) return defaultPage
    const raw = rawSearch?.page
    const parsed = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : defaultPage
  }, [syncToUrl, rawSearch?.page, defaultPage])

  const pageSize = useMemo(() => {
    if (!syncToUrl) return defaultPageSize
    const raw = rawSearch?.page_size
    const parsed = typeof raw === 'number' ? raw : Number(raw)
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : defaultPageSize
  }, [syncToUrl, rawSearch?.page_size, defaultPageSize])

  // ── Setters ───────────────────────────────────────────────────────────────

  const setPage = useCallback(
    (nextPage: number) => {
      if (syncToUrl) {
        void navigate({
          search: (prev) => ({ ...prev, page: nextPage }),
          replace: true,
        })
      }
    },
    [syncToUrl, navigate],
  )

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      if (syncToUrl) {
        void navigate({
          search: (prev) => ({ ...prev, page: 1, page_size: nextPageSize }),
          replace: true,
        })
      }
    },
    [syncToUrl, navigate],
  )

  const reset = useCallback(() => {
    if (syncToUrl) {
      void navigate({
          search: (prev) => ({ ...prev, page: defaultPage, page_size: defaultPageSize }),
          replace: true,
        })
    }
  }, [syncToUrl, navigate, defaultPage, defaultPageSize])

  // ── Derived values ────────────────────────────────────────────────────────

  const offset = (page - 1) * pageSize

  const toQueryParams = useCallback(
    () => ({ page, pageSize }),
    [page, pageSize],
  )

  return {
    page,
    pageSize,
    offset,
    setPage,
    setPageSize,
    reset,
    toQueryParams,
  }
}
