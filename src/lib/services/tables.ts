import { api, buildQueryParams } from '@/lib/api-client'
import type { FloorAreaFilters, TableFilters } from '@/lib/query-keys'

// ─── Floor Area Types ─────────────────────────────────────────────────────────

export interface FloorArea {
  id: number
  branch_id: number
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateFloorAreaPayload {
  branch_id: number
  name: string
  sort_order?: number
}

export interface UpdateFloorAreaPayload {
  name?: string
  sort_order?: number
  is_active?: boolean
}

// ─── Table Types ──────────────────────────────────────────────────────────────

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

export interface Table {
  id: number
  branch_id: number
  floor_area_id: number
  table_number: string
  capacity: number
  status: TableStatus
  is_active: boolean
  created_at: string
  updated_at: string
  floor_area_name: string
  branch_name: string
}

export interface CreateTablePayload {
  branch_id: number
  floor_area_id: number
  table_number: string
  capacity: number
}

export interface UpdateTablePayload {
  floor_area_id?: number
  table_number?: string
  capacity?: number
  is_active?: boolean
}

export interface UpdateTableStatusPayload {
  status: TableStatus
}

// ─── Floor Areas Service ──────────────────────────────────────────────────────

export const floorAreasService = {
  list: (filters?: FloorAreaFilters) => {
    const { branchId } = filters ?? {}
    return api.get<FloorArea[]>(
      `/api/v1/floor-areas${buildQueryParams({
        ...(branchId !== undefined ? { branch_id: branchId } : {}),
      })}`,
    )
  },

  create: (payload: CreateFloorAreaPayload) =>
    api.post<FloorArea>('/api/v1/floor-areas', payload),

  update: (id: number, payload: UpdateFloorAreaPayload) =>
    api.put<FloorArea>(`/api/v1/floor-areas/${id}`, payload),

  delete: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/floor-areas/${id}`),
}

// ─── Tables Service ───────────────────────────────────────────────────────────

export const tablesService = {
  list: (filters?: TableFilters) => {
    const { branchId, floorAreaId, status, isActive, page, pageSize } =
      filters ?? {}
    return api.get<Table[]>(
      `/api/v1/tables${buildQueryParams(
        {
          ...(branchId !== undefined ? { branch_id: branchId } : {}),
          ...(floorAreaId !== undefined
            ? { floor_area_id: floorAreaId }
            : {}),
          ...(status ? { status } : {}),
          ...(isActive !== undefined ? { is_active: isActive } : {}),
        },
        { page: page ?? 1, pageSize: pageSize ?? 100 },
      )}`,
    )
  },

  get: (id: number) => api.get<Table>(`/api/v1/tables/${id}`),

  create: (payload: CreateTablePayload) =>
    api.post<Table>('/api/v1/tables', payload),

  update: (id: number, payload: UpdateTablePayload) =>
    api.put<Table>(`/api/v1/tables/${id}`, payload),

  updateStatus: (id: number, payload: UpdateTableStatusPayload) =>
    api.patch<Table>(`/api/v1/tables/${id}/status`, payload),

  delete: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/tables/${id}`),
}
