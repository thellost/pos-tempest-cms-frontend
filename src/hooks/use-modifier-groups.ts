import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  modifierGroupsService,
  type CreateModifierGroupPayload,
  type UpdateModifierGroupPayload,
  type CreateModifierPayload,
  type UpdateModifierPayload,
} from '@/lib/services/modifier-groups'
import { queryKeys, type ModifierGroupFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useModifierGroups(filters?: ModifierGroupFilters) {
  return useQuery({
    queryKey: queryKeys.modifierGroups.list(filters),
    queryFn: () => modifierGroupsService.list(filters),
  })
}

export function useModifierGroup(id: number) {
  return useQuery({
    queryKey: queryKeys.modifierGroups.detail(id),
    queryFn: () => modifierGroupsService.get(id),
    enabled: id > 0,
  })
}

// ─── Modifier Group Mutations ─────────────────────────────────────────────────

export function useCreateModifierGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateModifierGroupPayload) =>
      modifierGroupsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modifierGroups.all })
      toast.success('Modifier group created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateModifierGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateModifierGroupPayload
    }) => modifierGroupsService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modifierGroups.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.modifierGroups.detail(id),
      })
      toast.success('Modifier group updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteModifierGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => modifierGroupsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modifierGroups.all })
      toast.success('Modifier group deleted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Modifier (Option) Mutations ──────────────────────────────────────────────

export function useCreateModifier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      groupId,
      payload,
    }: {
      groupId: number
      payload: CreateModifierPayload
    }) => modifierGroupsService.createModifier(groupId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modifierGroups.all })
      toast.success('Modifier added successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateModifier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      modifierId,
      payload,
    }: {
      modifierId: number
      payload: UpdateModifierPayload
    }) => modifierGroupsService.updateModifier(modifierId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modifierGroups.all })
      toast.success('Modifier updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteModifier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (modifierId: number) =>
      modifierGroupsService.deleteModifier(modifierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modifierGroups.all })
      toast.success('Modifier deleted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
