import { useQuery } from '@tanstack/react-query'
import { statisticsService } from '@/lib/services/statistics'
import { queryKeys, type StatsFilter } from '@/lib/query-keys'

// ─── Dashboard KPI Hook ───────────────────────────────────────────────────────

/**
 * Fetches dashboard KPI stats with a 60-second auto-refresh interval.
 * Optionally scoped to a specific branch.
 */
export function useDashboardStats(branchId?: number) {
  return useQuery({
    queryKey: queryKeys.statistics.dashboard,
    queryFn: () => statisticsService.getDashboard(branchId),
    refetchInterval: 60_000, // auto-refresh every 60 seconds
    staleTime: 30_000,       // consider fresh for 30 seconds
  })
}

// ─── Sales Report Hooks ───────────────────────────────────────────────────────

/**
 * Fetches sales-over-time data for the Sales Report page.
 * Auto-enabled only when at least a date range is provided.
 */
export function useSalesStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.sales(filters),
    queryFn: () => statisticsService.getSales(filters),
    staleTime: 5 * 60_000, // 5 minutes
  })
}

/**
 * Fetches revenue-by-category breakdown for the Sales Report page.
 */
export function useRevenueByCategoryStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.revenueByCategory(filters),
    queryFn: () => statisticsService.getRevenueByCategory(filters),
    staleTime: 5 * 60_000,
  })
}

/**
 * Fetches the top-selling items for the Sales Report page.
 * `filters.limit` controls how many items to return (default 10).
 */
export function useTopItemsStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.topItems(filters),
    queryFn: () => statisticsService.getTopItems(filters),
    staleTime: 5 * 60_000,
  })
}

// ─── Cash Flow & Payment Method Hooks ────────────────────────────────────────

/**
 * Fetches payment method breakdown for the Financial Reports page.
 */
export function usePaymentMethodsStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.paymentMethods(filters),
    queryFn: () => statisticsService.getPaymentMethods(filters),
    staleTime: 5 * 60_000,
  })
}

/**
 * Fetches daily cash flow data (cash_in / cash_out / net) for the Financial Reports page.
 */
export function useCashFlowStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.cashFlow(filters),
    queryFn: () => statisticsService.getCashFlow(filters),
    staleTime: 5 * 60_000,
  })
}

// ─── Shift Financial Report Hook ───────────────────────────────────────────────

/**
 * Fetches the detailed financial report for a specific shift.
 * Only enabled when a non-empty shiftId is provided.
 */
export function useShiftReport(shiftId: string | null) {
  return useQuery({
    queryKey: queryKeys.statistics.shiftReport(shiftId ?? ''),
    queryFn: () => statisticsService.getShiftReport(shiftId!),
    enabled: !!shiftId,
    staleTime: 5 * 60_000,
  })
}
