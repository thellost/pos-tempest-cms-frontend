import { api, buildQueryParams } from '@/lib/api-client'
import type { CustomerFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  /** Managed by the POS order system — read-only from CMS */
  loyalty_points: number
  /** Managed by the POS order system — read-only from CMS */
  total_visits: number
  /** Managed by the POS order system — read-only from CMS */
  total_spent: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateCustomerPayload {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface UpdateCustomerPayload {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  is_active?: boolean
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const customersService = {
  list: (filters?: CustomerFilters) => {
    const { page, pageSize, search, sortBy, sortDir } = filters ?? {}
    return api.get<Customer[]>(
      `/api/v1/customers${buildQueryParams(
        {
          ...(search ? { search } : {}),
          ...(sortBy ? { sort_by: sortBy } : {}),
          ...(sortDir ? { sort_dir: sortDir } : {}),
        },
        { page: page ?? 1, pageSize: pageSize ?? 20 },
      )}`,
    )
  },

  get: (id: number) => api.get<Customer>(`/api/v1/customers/${id}`),

  create: (payload: CreateCustomerPayload) =>
    api.post<Customer>('/api/v1/customers', payload),

  update: (id: number, payload: UpdateCustomerPayload) =>
    api.put<Customer>(`/api/v1/customers/${id}`, payload),
}
