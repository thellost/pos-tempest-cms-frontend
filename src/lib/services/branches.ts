import { api, buildQueryParams } from '@/lib/api-client'
import type { BranchFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Branch {
  id: number
  name: string
  address: string | null
  phone: string | null
  tax_rate: number
  service_charge_rate: number
  currency: string
  timezone: string
  opening_time: string   // HH:MM 24h
  closing_time: string   // HH:MM 24h
  auto_shift: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateBranchPayload {
  name: string
  address?: string
  phone?: string
  tax_rate?: number
  service_charge_rate?: number
  currency?: string
  timezone?: string
  opening_time?: string  // HH:MM 24h
  closing_time?: string  // HH:MM 24h
  auto_shift?: boolean
}

export type UpdateBranchPayload = Partial<CreateBranchPayload> & {
  is_active?: boolean
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const branchesService = {
  list: (filters?: BranchFilters) =>
    api.get<Branch[]>(
      `/api/v1/branches${buildQueryParams(
        {},
        { page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 20 },
      )}`,
    ),

  get: (id: number) => api.get<Branch>(`/api/v1/branches/${id}`),

  create: (payload: CreateBranchPayload) =>
    api.post<Branch>('/api/v1/branches', payload),

  update: (id: number, payload: UpdateBranchPayload) =>
    api.put<Branch>(`/api/v1/branches/${id}`, payload),

  /** Soft-delete: sets is_active = false */
  deactivate: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/branches/${id}`),
}
