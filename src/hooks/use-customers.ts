import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  customersService,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
} from '@/lib/services/customers'
import { queryKeys, type CustomerFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customersService.list(filters),
  })
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => customersService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      customersService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      toast.success('Customer created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateCustomerPayload
    }) => customersService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) })
      toast.success('Customer updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
