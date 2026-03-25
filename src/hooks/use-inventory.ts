import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  inventoryService,
  type CreateInventoryPayload,
  type AdjustStockPayload,
  type UpdateThresholdPayload,
} from '@/lib/services/inventory'
import { queryKeys, type InventoryFilters, type InventoryMovementFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useInventory(filters?: InventoryFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: () => inventoryService.list(filters),
  })
}

export function useLowStockInventory(branchId?: number) {
  return useQuery({
    queryKey: queryKeys.inventory.lowStock(branchId),
    queryFn: () => inventoryService.listLowStock(branchId),
  })
}

export function useInventoryMovements(
  inventoryId: number,
  filters?: InventoryMovementFilters,
) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(inventoryId, filters),
    queryFn: () => inventoryService.listMovements(inventoryId, filters),
    enabled: inventoryId > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateInventoryPayload) =>
      inventoryService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Ingredient added to inventory')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdjustStockPayload) =>
      inventoryService.adjustStock(payload),
    onSuccess: (_, { inventory_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements(inventory_id),
      })
      toast.success('Stock adjusted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateThresholdPayload
    }) => inventoryService.updateThreshold(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Threshold updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
