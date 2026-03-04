import { api, buildQueryParams } from '@/lib/api-client'
import type { ShiftFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Shift {
  id: number
  user_id: number
  device_id: number
  branch_id: number
  status: 'open' | 'closed'
  opening_cash: number
  closing_cash: number | null
  expected_cash: number | null
  cash_difference: number | null
  opened_at: string
  closed_at: string | null
  notes: string | null
  user_name: string
  device_name: string
  branch_name: string
}

export interface PaymentBreakdown {
  payment_method: string
  count: number
  total_amount: number
  percentage: number
}

export interface ShiftSummary {
  shift_id: number
  total_orders: number
  total_revenue: number
  total_discount: number
  total_tax: number
  total_service: number
  net_revenue: number
  opening_cash: number
  closing_cash: number | null
  expected_cash: number | null
  cash_difference: number | null
  payment_breakdown: PaymentBreakdown[]
}

export interface OpenShiftPayload {
  device_id: number
  branch_id: number
  opening_cash?: number
}

export interface CloseShiftPayload {
  closing_cash: number
  notes?: string
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const shiftsService = {
  list: (filters?: ShiftFilters) => {
    const {
      page,
      pageSize,
      branchId,
      deviceId,
      userId,
      status,
      dateFrom,
      dateTo,
    } = filters ?? {}
    return api.get<Shift[]>(
      `/api/v1/shifts${buildQueryParams(
        {
          ...(branchId !== undefined ? { branch_id: branchId } : {}),
          ...(deviceId !== undefined ? { device_id: deviceId } : {}),
          ...(userId !== undefined ? { user_id: userId } : {}),
          ...(status ? { status } : {}),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
        },
        { page: page ?? 1, pageSize: pageSize ?? 20 },
      )}`,
    )
  },

  get: (id: number) => api.get<Shift>(`/api/v1/shifts/${id}`),

  summary: (id: number) =>
    api.get<ShiftSummary>(`/api/v1/shifts/${id}/summary`),

  open: (payload: OpenShiftPayload) =>
    api.post<Shift>('/api/v1/shifts/open', payload),

  close: (id: number, payload: CloseShiftPayload) =>
    api.post<Shift>(`/api/v1/shifts/${id}/close`, payload),
}
