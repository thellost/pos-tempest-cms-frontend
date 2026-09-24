import { api, buildQueryParams } from '@/lib/api-client'
import type { OrderFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'completed'
  | 'cancelled'

export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export type OrderType = 'dine_in' | 'takeaway'

export interface OrderItemModifier {
  id: string
  order_item_id: string
  modifier_id: number
  modifier_name: string
  modifier_group_name: string
  extra_price: number
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: number
  menu_item_name: string
  quantity: number
  unit_of_measure: string
  weight: number | null
  unit_price: number
  modifier_total: number
  subtotal: number
  discount_amount: number
  total: number
  notes: string | null
  is_voided: boolean
  voided_by: number | null
  void_reason: string | null
  created_at: string
  modifiers: OrderItemModifier[]
}

export interface OrderPayment {
  id: string
  order_id: string
  shift_id: string
  payment_method: string
  amount: number
  change_amount: number
  reference_number: string | null
  paid_at: string
}

export interface OrderDiscount {
  id: string
  order_id: string
  discount_id: number
  discount_name: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
  applied_amount: number
  applied_by: number
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  branch_id: number
  table_id: number | null
  cashier_id: number
  customer_id: number | null
  shift_id: string
  order_type: OrderType
  status: OrderStatus
  guest_count: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  service_charge: number
  rounding_amount: number
  total: number
  payment_status: OrderPaymentStatus
  notes: string | null
  voided_by: number | null
  voided_at: string | null
  void_reason: string | null
  created_at: string
  updated_at: string
  // Enriched fields
  cashier_name: string
  customer_name: string | null
  table_number: string | null
  branch_name: string
  // Detail-only nested fields
  items?: OrderItem[]
  payments?: OrderPayment[]
  discounts?: OrderDiscount[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const ordersService = {
  list: (filters?: OrderFilters) => {
    const {
      page,
      pageSize,
      branchId,
      status,
      paymentStatus,
      orderType,
      cashierId,
      customerId,
      shiftId,
      tableId,
      dateFrom,
      dateTo,
      search,
      hasDiscount,
    } = filters ?? {}
    const params: Record<string, unknown> = {}
    if (branchId) params.branch_id = branchId
    if (status) params.status = status
    if (paymentStatus) params.payment_status = paymentStatus
    if (orderType) params.order_type = orderType
    if (cashierId) params.cashier_id = cashierId
    if (customerId) params.customer_id = customerId
    if (shiftId) params.shift_id = shiftId
    if (tableId) params.table_id = tableId
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (search) params.search = search
    if (hasDiscount !== undefined) params.has_discount = hasDiscount
    return api.get<Order[]>(
      `/api/v1/orders${buildQueryParams(params, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  get: (id: string) => api.get<Order>(`/api/v1/orders/${id}`),

  cancel: (id: string, reason?: string) =>
    api.post<Order>(`/api/v1/orders/${id}/cancel`, { reason }),
}
