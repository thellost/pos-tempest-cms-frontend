import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Sentry from '@sentry/tanstackstart-react'
import {
  inventoryService,
  type CreateInventoryPayload,
  type AdjustStockPayload,
  type UpdateThresholdPayload,
  type UpdateInventoryPayload,
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
    onMutate: (payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createInventory started',
        level: 'info',
        data: {
          branchId: payload.branch_id,
          name: payload.name,
          unit: payload.unit_of_measure,
        },
      })
    },
    onSuccess: (result) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createInventory succeeded',
        level: 'info',
        data: {
          inventoryId: result.data.id,
          name: result.data.name,
        },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Ingredient added to inventory')
    },
    onError: (err: Error, payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'createInventory failed',
        level: 'error',
        data: {
          branchId: payload.branch_id,
          name: payload.name,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdjustStockPayload) =>
      inventoryService.adjustStock(payload),
    onMutate: (payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventory started',
        level: 'info',
        data: {
          inventoryId: payload.inventory_id,
          quantityChange: payload.quantity_change,
          movementType: payload.movement_type,
        },
      })
    },
    onSuccess: (_, { inventory_id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventory succeeded',
        level: 'info',
        data: { inventoryId: inventory_id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements(inventory_id),
      })
      toast.success('Stock adjusted successfully')
    },
    onError: (err: Error, payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventory failed',
        level: 'error',
        data: {
          inventoryId: payload.inventory_id,
          quantityChange: payload.quantity_change,
          movementType: payload.movement_type,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
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
    onMutate: ({ id, payload }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventoryThreshold started',
        level: 'info',
        data: {
          inventoryId: id,
          lowStockThreshold: payload.low_stock_threshold,
        },
      })
    },
    onSuccess: (_, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventoryThreshold succeeded',
        level: 'info',
        data: { inventoryId: id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Threshold updated')
    },
    onError: (err: Error, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventoryThreshold failed',
        level: 'error',
        data: {
          inventoryId: id,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
  })
}

export function useUpdateInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateInventoryPayload }) =>
      inventoryService.update(id, payload),
    onMutate: ({ id, payload }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventoryItem started',
        level: 'info',
        data: { inventoryId: id, name: payload.name },
      })
    },
    onSuccess: (_, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventoryItem succeeded',
        level: 'info',
        data: { inventoryId: id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Ingredient updated')
    },
    onError: (err: Error, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateInventoryItem failed',
        level: 'error',
        data: { inventoryId: id, error: err.message },
      })
      toast.error(err.message)
    },
  })
}

export function useDeleteInventory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => inventoryService.delete(id),
    onMutate: (id) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'deleteInventory started',
        level: 'info',
        data: { inventoryId: id },
      })
    },
    onSuccess: (_, id) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'deleteInventory succeeded',
        level: 'info',
        data: { inventoryId: id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Ingredient deleted')
    },
    onError: (err: Error, id) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'deleteInventory failed',
        level: 'error',
        data: { inventoryId: id, error: err.message },
      })
      toast.error(err.message)
    },
  })
}

export function useInventorySearch(q: string, branchId?: number) {
  return useQuery({
    queryKey: queryKeys.inventory.search(q, branchId),
    queryFn: () => inventoryService.search(q, branchId),
    enabled: q.trim().length > 0,
  })
}
