import { api, buildQueryParams } from '@/lib/api-client'
import type { SupplierFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Supplier {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupplierPayload {
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}

export interface UpdateSupplierPayload {
  name?: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  is_active?: boolean
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const suppliersService = {
  list: (filters?: SupplierFilters) => {
    const { page, pageSize } = filters ?? {}
    return api.get<Supplier[]>(
      `/api/v1/suppliers${buildQueryParams({}, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  get: (id: number) => api.get<Supplier>(`/api/v1/suppliers/${id}`),

  create: (payload: CreateSupplierPayload) =>
    api.post<Supplier>('/api/v1/suppliers', payload),

  update: (id: number, payload: UpdateSupplierPayload) =>
    api.put<Supplier>(`/api/v1/suppliers/${id}`, payload),
}
