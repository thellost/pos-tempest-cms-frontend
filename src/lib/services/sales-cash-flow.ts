import { api, buildQueryParams } from '@/lib/api-client'
import type { PurchaseFilters, ShiftFilters, StatsFilter, SupplierFilters } from '@/lib/query-keys'

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  today_revenue: number
  yesterday_revenue: number
  revenue_change_pct: number
  today_orders: number
  yesterday_orders: number
  orders_change_pct: number
  avg_order_value: number
  today_expenses: number
  yesterday_expenses: number
  today_net_cash: number
  active_tables: number
  open_shifts: number
  low_stock_items: number
  pending_reservations: number
}

// ─── Sales ─────────────────────────────────────────────────────────────────────

export interface SalesDataPoint {
  period: string
  total_orders: number
  total_revenue: number
  total_discount: number
  total_tax: number
  net_revenue: number
  total_expenses: number
  net_profit: number
}

export interface CategoryRevenue {
  category_id: number | null
  category_name: string
  total_revenue: number
  items_sold: number
  order_count: number
}

export interface TopItem {
  menu_item_id: number
  menu_item_name: string
  quantity_sold: number
  total_revenue: number
  order_count: number
}

// ─── Cash Flow ─────────────────────────────────────────────────────────────────

export interface CashFlowDataPoint {
  date: string
  cash_in: number
  cash_out: number
  net_cash: number
  non_cash_in: number
  total_revenue: number
  shift_cash_in: number
  shift_cash_out: number
  po_expenses: number
  total_expenses: number
}

export interface PaymentMethodBreakdown {
  payment_method: string
  count: number
  total_amount: number
  percentage: number
}

// ─── Shift Report ──────────────────────────────────────────────────────────────

export interface ShiftReportShift {
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

export interface ShiftReport {
  shift: ShiftReportShift
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
  total_order_cash_in: number
  total_order_cash_out: number
  total_po_expenses: number
  net_cash_movement: number
  payment_breakdown: Array<{
    payment_method: string
    count: number
    total_amount: number
    percentage: number
  }>
  cash_transactions: Array<{
    id: string
    shift_id: string
    user_id: number
    type: 'cash_in' | 'cash_out'
    reason: string
    amount: number
    note: string | null
    created_at: string
    user_name: string
  }>
  po_expenses?: Array<{
    id: number
    purchase_number: string
    supplier_id: number
    branch_id: number
    ordered_by: number
    received_by: number
    subtotal: number
    tax_amount: number
    total: number
    status: string
    notes: string | null
    ordered_at: string
    received_at: string
    created_at: string
    updated_at: string
    supplier_name: string
    ordered_by_name: string
    received_by_name: string
    branch_name: string
  }>
}

// ─── Purchases ─────────────────────────────────────────────────────────────────

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
  inventory_id: number
  quantity: number
  unit_of_measure: UnitOfMeasure
  cost_per_unit: number
  total: number
  inventory_name: string
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
  paid_amount: number | null
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
  inventory_id: number
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
  paid_amount: number
  notes?: string
}

// ─── Suppliers ─────────────────────────────────────────────────────────────────

export interface Supplier {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupplierPayload {
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}

export interface UpdateSupplierPayload {
  name?: string
  contact_person?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  is_active?: boolean
}

// ─── Shifts ────────────────────────────────────────────────────────────────────

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

export type CashTransactionType = 'cash_in' | 'cash_out'

export type CashTransactionReason =
  | 'pengeluaran_pribadi'
  | 'owner_withdrawal'
  | 'supply_purchase'
  | 'gaji'
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
  shift_id: string
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
  total_cash_in: number
  total_cash_out: number
  payment_breakdown: PaymentBreakdown[]
  cash_transactions: CashTransaction[]
}

export interface PaymentBreakdown {
  payment_method: string
  count: number
  total_amount: number
  percentage: number
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

// ─── Expense Breakdown ───────────────────────────────────────────────────────

export interface ExpenseBreakdownItem {
  reason: string
  total_amount: number
  count: number
  percentage: number
}

// ─── Cash Transaction Breakdown ───────────────────────────────────────────────

export interface CashTransactionBreakdownItem {
  reason: string
  type: 'cash_in' | 'cash_out'
  count: number
  total_amount: number
  percentage: number
}

// ─── Global Cash Transactions ─────────────────────────────────────────────────

export interface GlobalCashTransaction {
  id: string
  shift_id: string
  user_id: number
  type: 'cash_in' | 'cash_out'
  reason: string
  amount: number
  note: string | null
  created_at: string
  user_name: string
  shift_branch_id: number
  shift_branch_name: string
}

export interface GlobalCashTransactionMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface GlobalCashTransactionFilters {
  shiftId?: string
  branchId?: number
  type?: 'cash_in' | 'cash_out'
  reason?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

// ─── Service ───────────────────────────────────────────────────────────────────

function buildStatsParams(filters: StatsFilter): string {
  const params: Record<string, unknown> = {}
  if (filters.branchId) params.branch_id = filters.branchId
  if (filters.dateFrom) params.date_from = filters.dateFrom
  if (filters.dateTo) params.date_to = filters.dateTo
  if (filters.groupBy) params.group_by = filters.groupBy
  if (filters.limit) params.limit = filters.limit
  return buildQueryParams(params)
}

export const salesCashFlowService = {
  // ── Statistics / Dashboard ───────────────────────────────────────────────

  getDashboard: (branchId?: number) => {
    const params = branchId ? `?branch_id=${branchId}` : ''
    return api.get<DashboardStats>(`/api/v1/statistics/dashboard${params}`)
  },

  getSales: (filters: StatsFilter = {}) =>
    api.get<SalesDataPoint[]>(`/api/v1/statistics/sales${buildStatsParams(filters)}`),

  getRevenueByCategory: (filters: StatsFilter = {}) =>
    api.get<CategoryRevenue[]>(
      `/api/v1/statistics/revenue-by-category${buildStatsParams(filters)}`,
    ),

  getTopItems: (filters: StatsFilter = {}) =>
    api.get<TopItem[]>(`/api/v1/statistics/top-items${buildStatsParams(filters)}`),

  getPaymentMethods: (filters: StatsFilter = {}) =>
    api.get<PaymentMethodBreakdown[]>(
      `/api/v1/statistics/payment-methods${buildStatsParams(filters)}`,
    ),

  getCashFlow: (filters: StatsFilter = {}) =>
    api.get<CashFlowDataPoint[]>(`/api/v1/statistics/cash-flow${buildStatsParams(filters)}`),

  getShiftReport: (shiftId: string) =>
    api.get<ShiftReport>(`/api/v1/statistics/shifts/${shiftId}`),

  getExpenseBreakdown: (branchId?: number, dateFrom?: string, dateTo?: string) => {
    const params: Record<string, unknown> = {}
    if (branchId) params.branch_id = branchId
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return api.get<ExpenseBreakdownItem[]>(
      `/api/v1/statistics/expense-breakdown${buildQueryParams(params)}`,
    )
  },

  getCashTransactionBreakdown: (branchId?: number, dateFrom?: string, dateTo?: string) => {
    const params: Record<string, unknown> = {}
    if (branchId) params.branch_id = branchId
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return api.get<CashTransactionBreakdownItem[]>(
      `/api/v1/statistics/cash-transaction-breakdown${buildQueryParams(params)}`,
    )
  },

  // ── Global Cash Transactions ──────────────────────────────────────────────

  listGlobalCashTransactions: (filters: GlobalCashTransactionFilters = {}) => {
    const { shiftId, branchId, type, reason, dateFrom, dateTo, page, pageSize } = filters
    const params: Record<string, unknown> = {}
    if (shiftId) params.shift_id = shiftId
    if (branchId) params.branch_id = branchId
    if (type) params.type = type
    if (reason) params.reason = reason
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return api.get<Array<GlobalCashTransaction>>(
      `/api/v1/cash-transactions${buildQueryParams(params, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  getGlobalCashTransaction: (id: string) =>
    api.get<GlobalCashTransaction>(`/api/v1/cash-transactions/${id}`),

  // ── Purchases ────────────────────────────────────────────────────────────

  listPurchases: (filters?: PurchaseFilters) => {
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

  getPurchase: (id: number) => api.get<Purchase>(`/api/v1/purchases/${id}`),

  createPurchase: (payload: CreatePurchasePayload) =>
    api.post<Purchase>('/api/v1/purchases', payload),

  receivePurchase: (id: number, payload: ReceivePurchasePayload) =>
    api.post<Purchase>(`/api/v1/purchases/${id}/receive`, payload),

  cancelPurchase: (id: number) =>
    api.patch<Purchase>(`/api/v1/purchases/${id}/cancel`, {}),

  // ── Suppliers ───────────────────────────────────────────────────────────

  listSuppliers: (filters?: SupplierFilters) => {
    const { page, pageSize } = filters ?? {}
    return api.get<Supplier[]>(
      `/api/v1/suppliers${buildQueryParams({}, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  getSupplier: (id: number) => api.get<Supplier>(`/api/v1/suppliers/${id}`),

  createSupplier: (payload: CreateSupplierPayload) =>
    api.post<Supplier>('/api/v1/suppliers', payload),

  updateSupplier: (id: number, payload: UpdateSupplierPayload) =>
    api.put<Supplier>(`/api/v1/suppliers/${id}`, payload),

  // ── Shifts ──────────────────────────────────────────────────────────────

  listShifts: (filters?: ShiftFilters) => {
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

  getShift: (id: string) => api.get<Shift>(`/api/v1/shifts/${id}`),

  getShiftSummary: (id: string) =>
    api.get<ShiftSummary>(`/api/v1/shifts/${id}/summary`),

  openShift: (payload: OpenShiftPayload) =>
    api.post<Shift>('/api/v1/shifts/open', payload),

  closeShift: (id: string, payload: CloseShiftPayload) =>
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
