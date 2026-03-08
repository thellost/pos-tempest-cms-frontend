import { useQuery } from '@tanstack/react-query'
import { ordersService } from '@/lib/services/orders'
import { queryKeys, type OrderFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersService.list(filters),
  })
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersService.get(id),
    enabled: id > 0,
  })
}
