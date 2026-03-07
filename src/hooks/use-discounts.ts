import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  discountsService,
  type CreateDiscountPayload,
  type UpdateDiscountPayload,
} from '@/lib/services/discounts'
import { queryKeys, type DiscountFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useDiscounts(filters?: DiscountFilters) {
  return useQuery({
    queryKey: queryKeys.discounts.list(filters),
    queryFn: () => discountsService.list(filters),
  })
}

export function useActiveDiscounts() {
  return useQuery({
    queryKey: queryKeys.discounts.active,
    queryFn: () => discountsService.listActive(),
  })
}

export function useDiscount(id: number) {
  return useQuery({
    queryKey: queryKeys.discounts.detail(id),
    queryFn: () => discountsService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDiscountPayload) =>
      discountsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })
      toast.success('Discount created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateDiscountPayload
    }) => discountsService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.detail(id) })
      toast.success('Discount updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => discountsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })
      toast.success('Discount deleted successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
