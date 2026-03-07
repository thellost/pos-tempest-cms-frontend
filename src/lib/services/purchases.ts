import { api, buildQueryParams } from '@/lib/api-client'
import type { PurchaseFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseStatus =
  | 'ordered'
  | 'partial_received'
  | 'received'
  | 'cancelled'

export type UnitOfMeasure =
  | 'piece'
  | 'kg'
  | 'gram'
  | 'ons'
  | 'liter'
  | 'ml'
  | 'portion'

export interface PurchaseItem {
  id: number
  purchase_id: number
  menu_item_id: number
  quantity: number
  unit_of_measure: UnitOfMeasure
  cost_per_unit: number
  total: number
  menu_item_name: string
}

export interface Purchase {
  id: number
  purchase_number: string
  supplier_id: number
  branch_id: number
  ordered_by: number
  received_by: number | null
  subtotal: number
  tax_amount: number
  total: number
  status: PurchaseStatus
  notes: string | null
  ordered_at: string
  received_at: string | null
  created_at: string
  updated_at: string
  supplier_name: string
  ordered_by_name: string
  received_by_name: string | null
  branch_name: string
  items?: PurchaseItem[]
}

export interface CreatePurchaseItemPayload {
  menu_item_id: number
  quantity: number
  unit_of_measure: UnitOfMeasure
  cost_per_unit: number
}

export interface CreatePurchasePayload {
  supplier_id: number
  branch_id: number
  notes?: string
  tax_amount?: number
  items: CreatePurchaseItemPayload[]
}

export interface ReceivePurchasePayload {
  notes?: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const purchasesService = {
  list: (filters?: PurchaseFilters) => {
    const { page, pageSize, supplierId, branchId, status, dateFrom, dateTo } =
      filters ?? {}
    const params: Record<string, unknown> = {}
    if (supplierId) params.supplier_id = supplierId
    if (branchId) params.branch_id = branchId
    if (status) params.status = status
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return api.get<Purchase[]>(
      `/api/v1/purchases${buildQueryParams(params, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  get: (id: number) => api.get<Purchase>(`/api/v1/purchases/${id}`),

  create: (payload: CreatePurchasePayload) =>
    api.post<Purchase>('/api/v1/purchases', payload),

  receive: (id: number, payload?: ReceivePurchasePayload) =>
    api.post<Purchase>(`/api/v1/purchases/${id}/receive`, payload ?? {}),

  cancel: (id: number) =>
    api.patch<Purchase>(`/api/v1/purchases/${id}/cancel`, {}),
}
