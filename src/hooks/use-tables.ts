import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  tablesService,
  type CreateTablePayload,
  type UpdateTablePayload,
  type UpdateTableStatusPayload,
} from '@/lib/services/tables'
import { queryKeys, type TableFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useTables(filters?: TableFilters) {
  return useQuery({
    queryKey: queryKeys.tables.list(filters),
    queryFn: () => tablesService.list(filters),
    enabled: !!filters?.branchId,
  })
}

export function useTable(id: number) {
  return useQuery({
    queryKey: queryKeys.tables.detail(id),
    queryFn: () => tablesService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTablePayload) => tablesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all })
      toast.success('Table created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateTablePayload }) =>
      tablesService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(id) })
      toast.success('Table updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateTableStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateTableStatusPayload
    }) => tablesService.updateStatus(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.detail(id) })
      toast.success('Table status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => tablesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all })
      toast.success('Table deleted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
