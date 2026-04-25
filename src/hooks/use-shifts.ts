import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Sentry from '@sentry/tanstackstart-react'
import {
  shiftsService,
  type CloseShiftPayload,
  type OpenShiftPayload,
  type CreateCashTransactionPayload,
} from '@/lib/services/shifts'
import { queryKeys, type ShiftFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useShifts(filters?: ShiftFilters) {
  return useQuery({
    queryKey: queryKeys.shifts.list(filters),
    queryFn: () => shiftsService.list(filters),
  })
}

export function useShift(id: string) {
  return useQuery({
    queryKey: queryKeys.shifts.detail(id),
    queryFn: () => shiftsService.get(id),
    enabled: !!id,
  })
}

export function useShiftSummary(id: string) {
  return useQuery({
    queryKey: queryKeys.shifts.summary(id),
    queryFn: () => shiftsService.summary(id),
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useOpenShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OpenShiftPayload) => shiftsService.open(payload),
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
    }) => shiftsService.close(id, payload),
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

// ─── Cash Transactions ────────────────────────────────────────────────────────

export function useShiftCashTransactions(shiftId: string) {
  return useQuery({
    queryKey: queryKeys.shifts.cashTransactions(shiftId),
    queryFn: () => shiftsService.listCashTransactions(shiftId),
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
    }) => shiftsService.createCashTransaction(shiftId, payload),
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
