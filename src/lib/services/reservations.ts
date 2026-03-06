import { api, buildQueryParams } from '@/lib/api-client'
import type { ReservationFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReservationStatus =
  | 'confirmed'
  | 'seated'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export interface Reservation {
  id: number
  branch_id: number
  table_id: number | null
  customer_id: number | null
  customer_name: string
  customer_phone: string | null
  guest_count: number
  reservation_datetime: string
  duration_minutes: number
  status: ReservationStatus
  notes: string | null
  created_by: number
  created_at: string
  updated_at: string
  /** Table number string e.g. "A3", null if no table assigned */
  table_number: string | null
  created_by_name: string
  branch_name: string
}

export interface CreateReservationPayload {
  branch_id: number
  table_id?: number
  customer_id?: number
  customer_name: string
  customer_phone?: string
  guest_count: number
  /** ISO 8601 datetime string */
  reservation_datetime: string
  /** Minimum 15 minutes, defaults to 120 on the backend */
  duration_minutes?: number
  notes?: string
}

export interface UpdateReservationPayload {
  table_id?: number | null
  customer_name?: string
  customer_phone?: string | null
  guest_count?: number
  reservation_datetime?: string
  duration_minutes?: number
  notes?: string | null
}

export interface UpdateReservationStatusPayload {
  status: ReservationStatus
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const reservationsService = {
  list: (filters?: ReservationFilters) => {
    const { page, pageSize, branchId, tableId, status, dateFrom, dateTo } =
      filters ?? {}
    return api.get<Reservation[]>(
      `/api/v1/reservations${buildQueryParams(
        {
          ...(branchId !== undefined ? { branch_id: branchId } : {}),
          ...(tableId !== undefined ? { table_id: tableId } : {}),
          ...(status ? { status } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
        },
        { page: page ?? 1, pageSize: pageSize ?? 20 },
      )}`,
    )
  },

  get: (id: number) => api.get<Reservation>(`/api/v1/reservations/${id}`),

  create: (payload: CreateReservationPayload) =>
    api.post<Reservation>('/api/v1/reservations', payload),

  update: (id: number, payload: UpdateReservationPayload) =>
    api.put<Reservation>(`/api/v1/reservations/${id}`, payload),

  updateStatus: (id: number, payload: UpdateReservationStatusPayload) =>
    api.patch<Reservation>(
      `/api/v1/reservations/${id}/status`,
      payload,
    ),
}
