import { api, buildQueryParams } from '@/lib/api-client'
import type { DeviceFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Device {
  id: number
  branch_id: number
  branch_name: string | null
  device_uid: string
  device_name: string
  status: 'active' | 'inactive'
  registered_at: string
  last_seen_at: string
}

export interface CreateDevicePayload {
  branch_id: number
  device_uid: string
  device_name: string
}

export interface UpdateDevicePayload {
  device_name?: string
  status?: 'active' | 'inactive'
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const devicesService = {
  list: (filters?: DeviceFilters) =>
    api.get<Device[]>(
      `/api/v1/devices${buildQueryParams(
        {
          ...(filters?.branchId !== undefined
            ? { branch_id: filters.branchId }
            : {}),
        },
        { page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 20 },
      )}`,
    ),

  get: (id: number) => api.get<Device>(`/api/v1/devices/${id}`),

  create: (payload: CreateDevicePayload) =>
    api.post<Device>('/api/v1/devices', payload),

  update: (id: number, payload: UpdateDevicePayload) =>
    api.put<Device>(`/api/v1/devices/${id}`, payload),

  /** Change device status only — active ↔ inactive */
  updateStatus: (id: number, status: 'active' | 'inactive') =>
    api.patch<Device>(`/api/v1/devices/${id}/status`, { status }),
}
