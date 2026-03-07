import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  suppliersService,
  type CreateSupplierPayload,
  type UpdateSupplierPayload,
} from '@/lib/services/suppliers'
import { queryKeys, type SupplierFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: () => suppliersService.list(filters),
  })
}

export function useSupplier(id: number) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => suppliersService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateSupplierPayload) =>
      suppliersService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      toast.success('Supplier created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateSupplierPayload
    }) => suppliersService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) })
      toast.success('Supplier updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
