import { api, buildQueryParams } from '@/lib/api-client'
import type { StatsFilter } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  /** Today's total revenue (sum of all completed order totals today) */
  today_revenue: number
  /** Yesterday's total revenue (for trend comparison) */
  yesterday_revenue: number
  /** Number of orders created today */
  today_orders: number
  /** Number of orders created yesterday */
  yesterday_orders: number
  /** Number of tables currently occupied or reserved */
  active_tables: number
  /** Number of currently open shifts */
  open_shifts: number
  /** Number of inventory items below their low-stock threshold */
  low_stock_items: number
  /** Number of reservations with status "confirmed" (upcoming) */
  pending_reservations: number
  /** ISO timestamp of when this snapshot was generated */
  generated_at?: string
}

// ─── Sales Over Time ──────────────────────────────────────────────────────────

/** A single data point returned from `GET /api/v1/statistics/sales`. */
export interface SalesDataPoint {
  /** The period label, e.g. "2026-03-08", "2026-W10", or "2026-03" depending on group_by. */
  period: string
  /** Number of completed orders in this period. */
  total_orders: number
  /** Gross revenue (sum of order totals) in this period. */
  total_revenue: number
  /** Total discount amounts applied in this period. */
  total_discount: number
  /** Total tax collected in this period. */
  total_tax: number
  /** Net revenue after discounts. */
  net_revenue: number
}

// ─── Revenue by Category ─────────────────────────────────────────────────────

/** A single category's revenue breakdown from `GET /api/v1/statistics/revenue-by-category`. */
export interface CategoryRevenue {
  category_id: number | null
  category_name: string
  total_revenue: number
  items_sold: number
  order_count: number
}

// ─── Top Items ────────────────────────────────────────────────────────────────

/** A single ranked item from `GET /api/v1/statistics/top-items`. */
export interface TopItem {
  menu_item_id: number
  menu_item_name: string
  category_name?: string | null
  quantity_sold: number
  total_revenue: number
  order_count: number
}

// ─── Cash Flow ───────────────────────────────────────────────────────────────

/** A single data point returned from `GET /api/v1/statistics/cash-flow`. */
export interface CashFlowDataPoint {
  /** Date in YYYY-MM-DD format. */
  date: string
  /** Total cash payments received (order revenue paid by cash). */
  cash_in: number
  /** Total cash paid out (purchase order costs). */
  cash_out: number
  /** Net cash: cash_in - cash_out. */
  net_cash: number
  /** Revenue received via non-cash payment methods (card, e-wallet, QRIS, etc.). */
  non_cash_in: number
  /** Total order revenue for the day (cash_in + non_cash_in). */
  total_revenue: number
}

// ─── Payment Method Breakdown ─────────────────────────────────────────────────

/** A single payment method breakdown from `GET /api/v1/statistics/payment-methods`. */
export interface PaymentMethodBreakdown {
  payment_method: string
  count: number
  total_amount: number
  percentage: number
}

// ─── Shift Financial Report ───────────────────────────────────────────────────

/** Nested shift detail within a shift report response. */
export interface ShiftReportShift {
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

/** Full response from `GET /api/v1/statistics/shifts/:id`. */
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
  payment_breakdown: Array<{
    payment_method: string
    count: number
    total_amount: number
    percentage: number
  }>
}

// ─── Service ─────────────────────────────────────────────────────────────────

function buildStatsParams(filters: StatsFilter): string {
  const params: Record<string, unknown> = {}
  if (filters.branchId) params.branch_id = filters.branchId
  if (filters.dateFrom) params.date_from = filters.dateFrom
  if (filters.dateTo) params.date_to = filters.dateTo
  if (filters.groupBy) params.group_by = filters.groupBy
  if (filters.limit) params.limit = filters.limit
  return buildQueryParams(params)
}

export const statisticsService = {
  /**
   * Fetches the dashboard KPI snapshot from `GET /api/v1/statistics/dashboard`.
   * Optionally scoped to a branch via `branch_id` query param.
   */
  getDashboard: (branchId?: number) => {
    const params = branchId ? `?branch_id=${branchId}` : ''
    return api.get<DashboardStats>(`/api/v1/statistics/dashboard${params}`)
  },

  /**
   * Fetches sales-over-time data from `GET /api/v1/statistics/sales`.
   * Supports grouping by day / week / month.
   */
  getSales: (filters: StatsFilter = {}) =>
    api.get<SalesDataPoint[]>(`/api/v1/statistics/sales${buildStatsParams(filters)}`),

  /**
   * Fetches revenue breakdown by category from `GET /api/v1/statistics/revenue-by-category`.
   */
  getRevenueByCategory: (filters: StatsFilter = {}) =>
    api.get<CategoryRevenue[]>(
      `/api/v1/statistics/revenue-by-category${buildStatsParams(filters)}`,
    ),

  /**
   * Fetches the top-selling items from `GET /api/v1/statistics/top-items`.
   * Use `filters.limit` to control how many items are returned (default 10).
   */
  getTopItems: (filters: StatsFilter = {}) =>
    api.get<TopItem[]>(`/api/v1/statistics/top-items${buildStatsParams(filters)}`),

  /**
   * Fetches payment method breakdown from `GET /api/v1/statistics/payment-methods`.
   */
  getPaymentMethods: (filters: StatsFilter = {}) =>
    api.get<PaymentMethodBreakdown[]>(
      `/api/v1/statistics/payment-methods${buildStatsParams(filters)}`,
    ),

  /**
   * Fetches daily cash flow data from `GET /api/v1/statistics/cash-flow`.
   * Returns cash_in, cash_out, net_cash, non_cash_in, total_revenue per day.
   */
  getCashFlow: (filters: StatsFilter = {}) =>
    api.get<CashFlowDataPoint[]>(`/api/v1/statistics/cash-flow${buildStatsParams(filters)}`),

  /**
   * Fetches the detailed financial report for a specific shift from
   * `GET /api/v1/statistics/shifts/:id`.
   */
  getShiftReport: (shiftId: number) =>
    api.get<ShiftReport>(`/api/v1/statistics/shifts/${shiftId}`),
}
