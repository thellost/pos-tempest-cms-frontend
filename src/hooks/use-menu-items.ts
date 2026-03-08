import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  menuItemsService,
  type CreateMenuItemPayload,
  type UpdateMenuItemPayload,
  type MenuItem,
} from '@/lib/services/menu-items'
import { queryKeys, type MenuItemFilters } from '@/lib/query-keys'
import type { ApiResult } from '@/lib/api-client'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useMenuItems(filters?: MenuItemFilters) {
  return useQuery({
    queryKey: queryKeys.menuItems.list(filters),
    queryFn: () => menuItemsService.list(filters),
  })
}

export function useMenuItem(id: number) {
  return useQuery({
    queryKey: queryKeys.menuItems.detail(id),
    queryFn: () => menuItemsService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMenuItemPayload) =>
      menuItemsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all })
      // Creating a menu item may auto-create inventory records, so invalidate inventory too
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Menu item created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateMenuItemPayload
    }) => menuItemsService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.menuItems.detail(id),
      })
      toast.success('Menu item updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateMenuItemAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      isAvailable,
    }: {
      id: number
      isAvailable: boolean
    }) => menuItemsService.updateAvailability(id, isAvailable),
    onMutate: async ({ id, isAvailable }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.menuItems.all })
      // Snapshot all currently cached list queries for rollback
      const previousData = queryClient.getQueriesData<ApiResult<MenuItem[]>>({
        queryKey: queryKeys.menuItems.all,
      })
      // Optimistically flip is_available in every cached page
      queryClient.setQueriesData<ApiResult<MenuItem[]>>(
        { queryKey: queryKeys.menuItems.all },
        (old) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((item) =>
              item.id === id ? { ...item, is_available: isAvailable } : item,
            ),
          }
        },
      )
      return { previousData }
    },
    onSuccess: (_, { isAvailable }) => {
      toast.success(
        isAvailable ? 'Item marked as available' : 'Item marked as unavailable',
      )
    },
    onError: (err: Error, _variables, context) => {
      // Roll back on failure
      if (context?.previousData) {
        for (const [key, value] of context.previousData) {
          queryClient.setQueryData(key, value)
        }
      }
      toast.error(err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all })
    },
  })
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => menuItemsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all })
      toast.success('Menu item deleted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useAssignModifierGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      modifierGroupId,
    }: {
      itemId: number
      modifierGroupId: number
    }) => menuItemsService.assignModifierGroup(itemId, modifierGroupId),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.menuItems.detail(itemId),
      })
      toast.success('Modifier group assigned')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUnassignModifierGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      groupId,
    }: {
      itemId: number
      groupId: number
    }) => menuItemsService.unassignModifierGroup(itemId, groupId),
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.menuItems.detail(itemId),
      })
      toast.success('Modifier group removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
