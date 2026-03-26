import { api, buildQueryParams } from '@/lib/api-client'
import type { DeviceFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Device {
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

  get: (device_uid: string) => api.get<Device>(`/api/v1/devices/${device_uid}`),

  create: (payload: CreateDevicePayload) =>
    api.post<Device>('/api/v1/devices', payload),

  update: (device_uid: string, payload: UpdateDevicePayload) =>
    api.put<Device>(`/api/v1/devices/${device_uid}`, payload),

  /** Change device status only — active ↔ inactive */
  updateStatus: (device_uid: string, status: 'active' | 'inactive') =>
    api.patch<Device>(`/api/v1/devices/${device_uid}/status`, { status }),
}
