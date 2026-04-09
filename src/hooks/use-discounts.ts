import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as Sentry from '@sentry/tanstackstart-react'
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
    onMutate: (payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'applyDiscount started',
        level: 'info',
        data: {
          name: payload.name,
          discountType: payload.discount_type,
          value: payload.value,
        },
      })
    },
    onSuccess: (result) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'applyDiscount succeeded',
        level: 'info',
        data: {
          discountId: result.data.id,
          name: result.data.name,
        },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })
      toast.success('Discount created successfully')
    },
    onError: (err: Error, payload) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'applyDiscount failed',
        level: 'error',
        data: {
          name: payload.name,
          discountType: payload.discount_type,
          value: payload.value,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
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
    onMutate: ({ id, payload }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateDiscount started',
        level: 'info',
        data: {
          discountId: id,
          discountType: payload.discount_type,
          value: payload.value,
          isActive: payload.is_active,
        },
      })
    },
    onSuccess: (_, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateDiscount succeeded',
        level: 'info',
        data: { discountId: id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.detail(id) })
      toast.success('Discount updated successfully')
    },
    onError: (err: Error, { id }) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'updateDiscount failed',
        level: 'error',
        data: {
          discountId: id,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
  })
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => discountsService.delete(id),
    onMutate: (id) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'deleteDiscount started',
        level: 'info',
        data: { discountId: id },
      })
    },
    onSuccess: (_, id) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'deleteDiscount succeeded',
        level: 'info',
        data: { discountId: id },
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })
      toast.success('Discount deleted successfully')
    },
    onError: (err: Error, id) => {
      Sentry.addBreadcrumb({
        category: 'mutation',
        message: 'deleteDiscount failed',
        level: 'error',
        data: {
          discountId: id,
          error: err.message,
        },
      })
      toast.error(err.message)
    },
  })
}
