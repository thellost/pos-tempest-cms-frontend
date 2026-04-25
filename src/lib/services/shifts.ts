import { api, buildQueryParams } from '@/lib/api-client'
import type { ShiftFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Shift {
  id: string
  user_id: number
  device_id: string
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

// ─── Cash Transaction Types ───────────────────────────────────────────────────

export type CashTransactionType = 'cash_in' | 'cash_out'

export type CashTransactionReason =
  | 'owner_withdrawal'
  | 'supply_purchase'
  | 'staff_advance'
  | 'petty_cash'
  | 'tip_out'
  | 'cash_deposit'
  | 'change_refill'
  | 'other'

export interface CashTransaction {
  id: string
  shift_id: string
  user_id: number
  type: CashTransactionType
  reason: CashTransactionReason
  amount: number
  note: string | null
  created_at: string
  user_name: string
}

export interface CreateCashTransactionPayload {
  type: CashTransactionType
  reason: CashTransactionReason
  amount: number
  note?: string
}

export interface ShiftSummary {
  shift: Shift
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  voided_orders: number
  gross_revenue: number
  total_discounts: number
  total_tax: number
  total_service_charge: number
  net_revenue: number
  total_cash_in: number
  total_cash_out: number
  net_cash_movement: number
  payment_breakdown: PaymentBreakdown[]
  cash_transactions: CashTransaction[]
}

export interface OpenShiftPayload {
  device_id: string
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

  get: (id: string) => api.get<Shift>(`/api/v1/shifts/${id}`),

  summary: (id: string) =>
    api.get<ShiftSummary>(`/api/v1/shifts/${id}/summary`),

  open: (payload: OpenShiftPayload) =>
    api.post<Shift>('/api/v1/shifts/open', payload),

  close: (id: string, payload: CloseShiftPayload) =>
    api.post<Shift>(`/api/v1/shifts/${id}/close`, payload),

  listCashTransactions: (shiftId: string) =>
    api.get<CashTransaction[]>(`/api/v1/shifts/${shiftId}/cash-transactions`),

  createCashTransaction: (
    shiftId: string,
    payload: CreateCashTransactionPayload,
  ) =>
    api.post<CashTransaction>(
      `/api/v1/shifts/${shiftId}/cash-transactions`,
      payload,
    ),
}
