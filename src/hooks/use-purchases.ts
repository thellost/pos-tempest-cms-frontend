import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  purchasesService,
  type CreatePurchasePayload,
  type ReceivePurchasePayload,
} from '@/lib/services/purchases'
import { queryKeys, type PurchaseFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function usePurchases(filters?: PurchaseFilters) {
  return useQuery({
    queryKey: queryKeys.purchases.list(filters),
    queryFn: () => purchasesService.list(filters),
  })
}

export function usePurchase(id: number) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(id),
    queryFn: () => purchasesService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePurchasePayload) =>
      purchasesService.create(payload),
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
    }) => purchasesService.receive(id, payload),
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
    mutationFn: (id: number) => purchasesService.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchases.detail(id) })
      toast.success('Purchase order cancelled')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
