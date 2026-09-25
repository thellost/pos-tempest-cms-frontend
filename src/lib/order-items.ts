import type { OrderItem } from '@/lib/services/orders'

export function isWeightedItem(item: OrderItem): boolean {
  return item.weight != null && item.weight > 0
}

export function getItemQuantity(item: OrderItem): number {
  return item.weight != null && item.weight > 0 ? item.weight : item.quantity
}

export function getItemUnitPrice(item: OrderItem): number {
  return item.weight != null && item.weight > 0
    ? item.unit_price / item.weight
    : item.unit_price
}
