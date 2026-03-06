import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  menuItemsService,
  type CreateMenuItemPayload,
  type UpdateMenuItemPayload,
} from '@/lib/services/menu-items'
import { queryKeys, type MenuItemFilters } from '@/lib/query-keys'

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
    onSuccess: (_, { isAvailable }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.menuItems.all })
      toast.success(
        isAvailable ? 'Item marked as available' : 'Item marked as unavailable',
      )
    },
    onError: (err: Error) => toast.error(err.message),
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
