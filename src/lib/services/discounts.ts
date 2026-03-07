import { api, buildQueryParams } from '@/lib/api-client'
import type { DiscountFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed_amount'

export interface Discount {
  id: number
  name: string
  description: string | null
  discount_type: DiscountType
  value: number
  min_order_amount: number | null
  max_discount_amount: number | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateDiscountPayload {
  name: string
  description?: string
  discount_type: DiscountType
  value: number
  min_order_amount?: number
  max_discount_amount?: number
  valid_from?: string
  valid_until?: string
}

export interface UpdateDiscountPayload {
  name?: string
  description?: string | null
  discount_type?: DiscountType
  value?: number
  min_order_amount?: number | null
  max_discount_amount?: number | null
  valid_from?: string | null
  valid_until?: string | null
  is_active?: boolean
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const discountsService = {
  list: (filters?: DiscountFilters) => {
    const { page, pageSize } = filters ?? {}
    return api.get<Discount[]>(
      `/api/v1/discounts${buildQueryParams({}, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  listActive: () => api.get<Discount[]>('/api/v1/discounts/active'),

  get: (id: number) => api.get<Discount>(`/api/v1/discounts/${id}`),

  create: (payload: CreateDiscountPayload) =>
    api.post<Discount>('/api/v1/discounts', payload),

  update: (id: number, payload: UpdateDiscountPayload) =>
    api.put<Discount>(`/api/v1/discounts/${id}`, payload),

  delete: (id: number) => api.delete<void>(`/api/v1/discounts/${id}`),
}
