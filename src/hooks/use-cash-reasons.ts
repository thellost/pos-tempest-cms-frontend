import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  cashReasonsService,
  type CreateCashTransactionReasonPayload,
  type UpdateCashTransactionReasonPayload,
} from '@/lib/services/cash-reasons'
import {
  queryKeys,
  type CashTransactionReasonFilters,
} from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useCashTransactionReasons(filters?: CashTransactionReasonFilters) {
  return useQuery({
    queryKey: queryKeys.cashTransactionReasons.list(filters),
    queryFn: () => cashReasonsService.list(filters),
  })
}

export function useCashTransactionReason(id: number) {
  return useQuery({
    queryKey: queryKeys.cashTransactionReasons.detail(id),
    queryFn: () => cashReasonsService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCashTransactionReason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCashTransactionReasonPayload) =>
      cashReasonsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cashTransactionReasons.all,
      })
      toast.success('Cash transaction reason created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCashTransactionReason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateCashTransactionReasonPayload
    }) => cashReasonsService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cashTransactionReasons.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.cashTransactionReasons.detail(id),
      })
      toast.success('Cash transaction reason updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeactivateCashTransactionReason() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => cashReasonsService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.cashTransactionReasons.all,
      })
      toast.success('Cash transaction reason deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Shared Label Lookup ──────────────────────────────────────────────────────

/** Fallback: format a snake_case key into a human-readable label */
function fallbackLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Fetches all active cash transaction reasons (optionally scoped to a branch)
 * and returns a label lookup map + helper function.
 * Used across reports and shift detail pages to replace hardcoded REASON_LABELS.
 */
export function useCashTransactionReasonLabels(branch_id?: number) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.cashTransactionReasons.labels(branch_id),
    queryFn: () =>
      cashReasonsService.list({
        is_active: true,
        branch_id,
        page_size: 500,
      }),
    staleTime: 5 * 60_000,
  })

  const reasonMap = useMemo(() => {
    if (!data?.data) return new Map<string, string>()
    const map = new Map<string, string>()
    for (const r of data.data) {
      // Only store the first label per key; branch admin's custom labels win
      if (!map.has(r.key)) map.set(r.key, r.label)
    }
    return map
  }, [data])

  const reasonOptions = useMemo(
    () =>
      Array.from(reasonMap.entries()).map(([key, label]) => ({
        value: key,
        label,
      })),
    [reasonMap],
  )

  const labelForReason = (key: string): string => reasonMap.get(key) ?? fallbackLabel(key)

  return { labelForReason, reasonMap, reasonOptions, isLoading }
}
