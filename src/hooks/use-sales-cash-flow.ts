import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Sentry from '@sentry/tanstackstart-react'
import type {CloseShiftPayload, CreateCashTransactionPayload, CreatePurchasePayload, CreateSupplierPayload, OpenShiftPayload, ReceivePurchasePayload, UpdateSupplierPayload} from '@/lib/services/sales-cash-flow';
import type {GlobalCashTransactionFilters, PurchaseFilters, ShiftFilters, StatsFilter, SupplierFilters} from '@/lib/query-keys';
import {
  
  
  
  
  
  
  
  salesCashFlowService
} from '@/lib/services/sales-cash-flow'
import {
  
  
  
  
  
  queryKeys
} from '@/lib/query-keys'

// ─── Dashboard KPI Hook ───────────────────────────────────────────────────────

export function useDashboardStats(branchId?: number) {
  return useQuery({
    queryKey: queryKeys.statistics.dashboard,
    queryFn: () => salesCashFlowService.getDashboard(branchId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// ─── Sales Report Hooks ───────────────────────────────────────────────────────

export function useSalesStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.sales(filters),
    queryFn: () => salesCashFlowService.getSales(filters),
    staleTime: 5 * 60_000,
  })
}

export function useRevenueByCategoryStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.revenueByCategory(filters),
    queryFn: () => salesCashFlowService.getRevenueByCategory(filters),
    staleTime: 5 * 60_000,
  })
}

export function useTopItemsStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.topItems(filters),
    queryFn: () => salesCashFlowService.getTopItems(filters),
    staleTime: 5 * 60_000,
  })
}

// ─── Cash Flow & Payment Method Hooks ────────────────────────────────────────

export function usePaymentMethodsStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.paymentMethods(filters),
    queryFn: () => salesCashFlowService.getPaymentMethods(filters),
    staleTime: 5 * 60_000,
  })
}

export function useCashFlowStats(filters: StatsFilter = {}) {
  return useQuery({
    queryKey: queryKeys.statistics.cashFlow(filters),
    queryFn: () => salesCashFlowService.getCashFlow(filters),
    staleTime: 5 * 60_000,
  })
}

// ─── Shift Financial Report Hook ──────────────────────────────────────────────

export function useShiftReport(shiftId: string | null) {
  return useQuery({
    queryKey: queryKeys.statistics.shiftReport(shiftId ?? ''),
    queryFn: () => salesCashFlowService.getShiftReport(shiftId!),
    enabled: !!shiftId,
    staleTime: 5 * 60_000,
  })
}

// ─── Expense Breakdown Hook ───────────────────────────────────────────────────

export function useExpenseBreakdown(
  branchId?: number,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: queryKeys.statistics.expenseBreakdown(branchId, dateFrom, dateTo),
    queryFn: () => salesCashFlowService.getExpenseBreakdown(branchId, dateFrom, dateTo),
    staleTime: 5 * 60_000,
  })
}

// ─── Cash Transaction Breakdown Hook ─────────────────────────────────────────

export function useCashTransactionBreakdown(
  branchId?: number,
  dateFrom?: string,
  dateTo?: string,
) {
  return useQuery({
    queryKey: queryKeys.statistics.cashTransactionBreakdown(branchId, dateFrom, dateTo),
    queryFn: () =>
      salesCashFlowService.getCashTransactionBreakdown(branchId, dateFrom, dateTo),
    staleTime: 5 * 60_000,
  })
}

// ─── Global Cash Transactions Hooks ──────────────────────────────────────────

export function useGlobalCashTransactions(filters: GlobalCashTransactionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.cashTransactions.list(filters),
    queryFn: () => salesCashFlowService.listGlobalCashTransactions(filters),
    staleTime: 2 * 60_000,
  })
}

export function useGlobalCashTransaction(id: string | null) {
  return useQuery({
    queryKey: queryKeys.cashTransactions.detail(id ?? ''),
    queryFn: () => salesCashFlowService.getGlobalCashTransaction(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

// ─── Purchases Read ───────────────────────────────────────────────────────────

export function usePurchases(filters?: PurchaseFilters) {
  return useQuery({
    queryKey: queryKeys.purchases.list(filters),
    queryFn: () => salesCashFlowService.listPurchases(filters),
  })
}

export function usePurchase(id: number) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(id),
    queryFn: () => salesCashFlowService.getPurchase(id),
    enabled: id > 0,
  })
}

// ─── Purchases Mutations ──────────────────────────────────────────────────────

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePurchasePayload) =>
      salesCashFlowService.createPurchase(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all })
      toast.success('Purchase order created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useReceivePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: ReceivePurchasePayload
    }) => salesCashFlowService.receivePurchase(id, payload),
    onSuccess: (result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      const newStatus = result.data?.status
      toast.success(
        newStatus === 'received'
          ? 'Purchase order received. Inventory updated.'
          : 'Partial payment recorded.',
      )
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCancelPurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => salesCashFlowService.cancelPurchase(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(id) })
      toast.success('Purchase order cancelled')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Suppliers Read ───────────────────────────────────────────────────────────

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: () => salesCashFlowService.listSuppliers(filters),
  })
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => salesCashFlowService.getSupplier(id),
    enabled: id > 0,
  })
}

// ─── Suppliers Mutations ──────────────────────────────────────────────────────

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) =>
      salesCashFlowService.createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success('Supplier created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateSupplierPayload
    }) => salesCashFlowService.updateSupplier(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) })
      toast.success('Supplier updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Shifts Read ──────────────────────────────────────────────────────────────

export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: queryKeys.shifts.list(filters),
    queryFn: () => salesCashFlowService.listShifts(filters),
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: queryKeys.shifts.detail(id),
    queryFn: () => salesCashFlowService.getShift(id),
    enabled: !!id,
  })
}

export function useShiftSummary(id: string) {
  return useQuery({
    queryKey: queryKeys.shifts.summary(id),
    queryFn: () => salesCashFlowService.getShiftSummary(id),
    enabled: !!id,
  })
}

// ─── Shifts Mutations ─────────────────────────────────────────────────────────

export function useOpenShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OpenShiftPayload) =>
      salesCashFlowService.openShift(payload),
    onMutate: (payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createShift started',
        level: 'info',
        data: {
          deviceId: payload.device_id,
          branchId: payload.branch_id,
        },
      })
    },
    onSuccess: (result) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createShift succeeded',
        level: 'info',
        data: {
          shiftId: result.data.id,
          deviceId: result.data.device_id,
        },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all })
      toast.success('Shift opened successfully')
    },
    onError: (err: Error, payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createShift failed',
        level: 'error',
        data: {
          error: err.message,
          deviceId: payload.device_id,
          branchId: payload.branch_id,
        },
      })
      toast.error(err.message)
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: CloseShiftPayload
    }) => salesCashFlowService.closeShift(id, payload),
    onMutate: ({ id, payload }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'closeShift started',
        level: 'info',
        data: {
          shiftId: id,
          closingCash: payload.closing_cash,
        },
      })
    },
    onSuccess: (_, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'closeShift succeeded',
        level: 'info',
        data: { shiftId: id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.summary(id) })
      toast.success('Shift closed successfully')
    },
    onError: (err: Error, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'closeShift failed',
        level: 'error',
        data: {
          shiftId: id,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
  })
}

// ─── Cash Transactions ───────────────────────────────────────────────────────

export function useShiftCashTransactions(shiftId: string) {
  return useQuery({
    queryKey: queryKeys.shifts.cashTransactions(shiftId),
    queryFn: () => salesCashFlowService.listCashTransactions(shiftId),
    enabled: !!shiftId,
  })
}

export function useCreateCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      shiftId,
      payload,
    }: {
      shiftId: string
      payload: CreateCashTransactionPayload
    }) => salesCashFlowService.createCashTransaction(shiftId, payload),
    onMutate: ({ shiftId, payload }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createCashTransaction started',
        level: 'info',
        data: {
          shiftId,
          type: payload.type,
          reason: payload.reason,
          amount: payload.amount,
        },
      })
    },
    onSuccess: (_, { shiftId }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createCashTransaction succeeded',
        level: 'info',
        data: { shiftId },
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts.cashTransactions(shiftId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts.summary(shiftId),
      })
      toast.success('Transaction recorded successfully')
    },
    onError: (err: Error, { shiftId, payload }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createCashTransaction failed',
        level: 'error',
        data: {
          shiftId,
          type: payload.type,
          amount: payload.amount,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
  })
}

export function useCancelCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; shiftId?: string }) =>
      salesCashFlowService.cancelCashTransaction(id),
    onMutate: ({ id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'cancelCashTransaction started',
        level: 'info',
        data: { id },
      })
    },
    onSuccess: (_, { shiftId }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'cancelCashTransaction succeeded',
        level: 'info',
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.cashTransactions.all })
      if (shiftId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts.cashTransactions(shiftId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts.summary(shiftId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.statistics.shiftReport(shiftId) })
      }
      toast.success('Cash transaction canceled')
    },
    onError: (err: Error, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'cancelCashTransaction failed',
        level: 'error',
        data: { id, error: err.message },
      })
      toast.error(err.message)
    },
  })
}

export function useReactivateCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; shiftId?: string }) =>
      salesCashFlowService.reactivateCashTransaction(id),
    onMutate: ({ id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'reactivateCashTransaction started',
        level: 'info',
        data: { id },
      })
    },
    onSuccess: (_, { shiftId }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'reactivateCashTransaction succeeded',
        level: 'info',
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.cashTransactions.all })
      if (shiftId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts.cashTransactions(shiftId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.shifts.summary(shiftId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.statistics.shiftReport(shiftId) })
      }
      toast.success('Cash transaction reactivated')
    },
    onError: (err: Error, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'reactivateCashTransaction failed',
        level: 'error',
        data: { id, error: err.message },
      })
      toast.error(err.message)
    },
  })
}
