import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

export function useShift(id: number) {
  return useQuery({
    queryKey: queryKeys.shifts.detail(id),
    queryFn: () => shiftsService.get(id),
    enabled: id > 0,
  })
}

export function useShiftSummary(id: number) {
  return useQuery({
    queryKey: queryKeys.shifts.summary(id),
    queryFn: () => shiftsService.summary(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useOpenShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: OpenShiftPayload) => shiftsService.open(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all })
      toast.success('Shift opened successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: CloseShiftPayload
    }) => shiftsService.close(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts.summary(id) })
      toast.success('Shift closed successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Cash Transactions ────────────────────────────────────────────────────────

export function useShiftCashTransactions(shiftId: number) {
  return useQuery({
    queryKey: queryKeys.shifts.cashTransactions(shiftId),
    queryFn: () => shiftsService.listCashTransactions(shiftId),
    enabled: shiftId > 0,
  })
}

export function useCreateCashTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      shiftId,
      payload,
    }: {
      shiftId: number
      payload: CreateCashTransactionPayload
    }) => shiftsService.createCashTransaction(shiftId, payload),
    onSuccess: (_, { shiftId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts.cashTransactions(shiftId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts.summary(shiftId),
      })
      toast.success('Transaction recorded successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
