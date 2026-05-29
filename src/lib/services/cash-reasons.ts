import { api, buildQueryParams } from '@/lib/api-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CashTransactionReasonType = 'cash_in' | 'cash_out'

export interface CashTransactionReason {
  id: number
  branch_id: number
  key: string
  label: string
  type: CashTransactionReasonType | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CreateCashTransactionReasonPayload {
  branch_id?: number
  key: string
  label: string
  type?: CashTransactionReasonType | null
  sort_order?: number
}

export interface UpdateCashTransactionReasonPayload {
  key?: string
  label?: string
  type?: CashTransactionReasonType | null
  sort_order?: number
  is_active?: boolean
}

export interface CashTransactionReasonFilters {
  branch_id?: number
  type?: CashTransactionReasonType | null
  is_active?: boolean
  page?: number
  page_size?: number
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const cashReasonsService = {
  list: (filters?: CashTransactionReasonFilters) => {
    const { branch_id, type, is_active, page, page_size } = filters ?? {}
    const params: Record<string, unknown> = {}
    if (branch_id !== undefined) params.branch_id = branch_id
    if (type !== undefined) params.type = type
    if (is_active !== undefined) params.is_active = is_active
    return api.get<CashTransactionReason[]>(
      `/api/v1/cash-transaction-reasons${buildQueryParams(
        params,
        { page: page ?? 1, pageSize: page_size ?? 20 },
      )}`,
    )
  },

  get: (id: number) =>
    api.get<CashTransactionReason>(`/api/v1/cash-transaction-reasons/${id}`),

  create: (payload: CreateCashTransactionReasonPayload) =>
    api.post<CashTransactionReason>('/api/v1/cash-transaction-reasons', payload),

  update: (id: number, payload: UpdateCashTransactionReasonPayload) =>
    api.put<CashTransactionReason>(
      `/api/v1/cash-transaction-reasons/${id}`,
      payload,
    ),

  /** Soft-delete (sets is_active = false) */
  deactivate: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/cash-transaction-reasons/${id}`),
}
