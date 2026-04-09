import { supabase } from '@/lib/supabase'
import * as Sentry from '@sentry/tanstackstart-react'

// ─── Envelope types ───────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string } | string
  meta?: PaginationMeta
}

export interface ApiResult<T> {
  data: T
  meta?: PaginationMeta
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

// ─── Query param helper ───────────────────────────────────────────────────────

export function buildQueryParams(
  filters: Record<string, unknown>,
  pagination?: { page: number; pageSize: number },
): string {
  const params = new URLSearchParams()

  if (pagination) {
    params.set('page', String(pagination.page))
    params.set('page_size', String(pagination.pageSize))
  }

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, String(v)))
    } else {
      params.set(key, String(value))
    }
  }

  const str = params.toString()
  return str ? `?${str}` : ''
}

// ─── API Client ───────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
  }

  // ── Auth header ─────────────────────────────────────────────────────────────

  private async getHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  // ── Core fetch ──────────────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    const headers = await this.getHeaders()
    const url = `${this.baseUrl}${path}`

    return Sentry.startSpan(
      {
        op: 'http.client',
        name: `${method} ${path}`,
        attributes: {
          'http.request.method': method,
          'url.full': url,
          'url.path': path,
          'server.address': this.baseUrl,
        },
      },
      async (span) => {
        const t0 = performance.now()

        const response = await fetch(url, {
          method,
          headers,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        })

        const durationMs = Math.round(performance.now() - t0)

        span.setAttributes({
          'http.response.status_code': response.status,
          'http.response_time_ms': durationMs,
        })

        Sentry.addBreadcrumb({
          category: 'http',
          message: `${method} ${path}`,
          level: response.ok ? 'info' : 'warning',
          data: {
            url,
            method,
            status_code: response.status,
            duration_ms: durationMs,
          },
        })

        // ── 401 → sign out and redirect to login ────────────────────────────
        if (response.status === 401) {
          span.setStatus({ code: 2, message: 'unauthenticated' })
          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Session expired — auto signed out',
            level: 'warning',
            data: { endpoint: path },
          })
          await supabase.auth.signOut()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          throw new ApiError('Unauthorized', 'UNAUTHORIZED', 401)
        }

        let envelope: ApiEnvelope<T>

        try {
          envelope = (await response.json()) as ApiEnvelope<T>
        } catch {
          span.setStatus({ code: 2, message: 'parse_error' })
          throw new ApiError(
            `Failed to parse response from ${method} ${path}`,
            'PARSE_ERROR',
            response.status,
          )
        }

        if (!response.ok || !envelope.success) {
          const errPayload = envelope.error
          const message =
            typeof errPayload === 'object' && errPayload !== null
              ? errPayload.message
              : (errPayload ?? `Request failed: ${method} ${path}`)
          const code =
            typeof errPayload === 'object' && errPayload !== null
              ? errPayload.code
              : 'API_ERROR'

          span.setStatus({ code: 2, message: code.toLowerCase() })

          throw new ApiError(message, code, response.status)
        }

        return {
          data: envelope.data as T,
          meta: envelope.meta,
        }
      },
    )
  }

  // ── Public methods ──────────────────────────────────────────────────────────

  get<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return this.request<T>('POST', path, body)
  }

  put<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return this.request<T>('PUT', path, body)
  }

  patch<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
    return this.request<T>('PATCH', path, body)
  }

  delete<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>('DELETE', path)
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const api = new ApiClient()
