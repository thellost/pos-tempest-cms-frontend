import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  floorAreasService,
  type CreateFloorAreaPayload,
  type UpdateFloorAreaPayload,
} from '@/lib/services/tables'
import { queryKeys, type FloorAreaFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useFloorAreas(filters?: FloorAreaFilters) {
  return useQuery({
    queryKey: queryKeys.floorAreas.list(filters),
    queryFn: () => floorAreasService.list(filters),
    enabled: !!filters?.branchId,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateFloorArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFloorAreaPayload) =>
      floorAreasService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.floorAreas.all })
      toast.success('Floor area created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateFloorArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateFloorAreaPayload
    }) => floorAreasService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.floorAreas.all })
      toast.success('Floor area updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteFloorArea() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => floorAreasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.floorAreas.all })
      toast.success('Floor area deleted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
