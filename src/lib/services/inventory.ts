import { api, buildQueryParams } from '@/lib/api-client'
import type { InventoryFilters, InventoryMovementFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: number
  branch_id: number
  menu_item_id: number
  stock_quantity: number
  low_stock_threshold: number
  updated_at: string
  menu_item_name: string
  menu_item_sku: string
  branch_name: string
  is_low_stock: boolean
}

export type MovementType =
  | 'purchase_in'
  | 'sale_out'
  | 'adjustment'
  | 'waste'
  | 'transfer'

export interface InventoryMovement {
  id: number
  inventory_id: number
  user_id: number
  movement_type: MovementType
  quantity_change: number
  quantity_before: number
  quantity_after: number
  reference_type: string | null
  reference_id: number | null
  reason: string | null
  created_at: string
  user_name: string
}

export type ManualMovementType = 'adjustment' | 'waste' | 'transfer'

export interface AdjustStockPayload {
  inventory_id: number
  quantity_change: number
  movement_type: ManualMovementType
  reason?: string
}

export interface UpdateThresholdPayload {
  low_stock_threshold: number
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const inventoryService = {
  list: (filters?: InventoryFilters) => {
    const { page, pageSize, branchId, menuItemId, lowStockOnly } = filters ?? {}
    const params: Record<string, unknown> = {}
    if (branchId) params.branch_id = branchId
    if (menuItemId) params.menu_item_id = menuItemId
    if (lowStockOnly) params.low_stock_only = true
    return api.get<InventoryItem[]>(
      `/api/v1/inventory${buildQueryParams(params, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  listLowStock: (branchId?: number) => {
    const params: Record<string, unknown> = {}
    if (branchId) params.branch_id = branchId
    return api.get<InventoryItem[]>(
      `/api/v1/inventory/low-stock${buildQueryParams(params, { page: 1, pageSize: 100 })}`,
    )
  },

  adjustStock: (payload: AdjustStockPayload) =>
    api.post<InventoryItem>('/api/v1/inventory/adjust', payload),

  updateThreshold: (id: number, payload: UpdateThresholdPayload) =>
    api.patch<InventoryItem>(`/api/v1/inventory/${id}/threshold`, payload),

  listMovements: (
    inventoryId: number,
    filters?: InventoryMovementFilters,
  ) => {
    const { page, pageSize } = filters ?? {}
    return api.get<InventoryMovement[]>(
      `/api/v1/inventory/${inventoryId}/movements${buildQueryParams({}, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },
}
