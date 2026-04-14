import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  branchesService,
  type UpdateBranchPayload,
} from '@/lib/services/branches'
import { queryKeys, type BranchFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useBranches(filters?: BranchFilters) {
  return useQuery({
    queryKey: queryKeys.branches.list(filters),
    queryFn: () => branchesService.list(filters),
  })
}

export function useBranch(id: number) {
  return useQuery({
    queryKey: queryKeys.branches.detail(id),
    queryFn: () => branchesService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: branchesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all })
      toast.success('Branch created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateBranchPayload
    }) => branchesService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all })
      toast.success('Branch updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeactivateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: branchesService.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.all })
      toast.success('Branch deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
