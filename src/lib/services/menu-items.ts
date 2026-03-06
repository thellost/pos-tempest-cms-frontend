import { api, buildQueryParams } from '@/lib/api-client'
import type { MenuItemFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PricingType = 'fixed' | 'weight_based'
export type UnitOfMeasure = 'piece' | 'kg' | 'gram' | 'ons' | 'liter' | 'ml' | 'portion'

export interface Modifier {
  id: number
  modifier_group_id: number
  name: string
  extra_price: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ModifierGroup {
  id: number
  name: string
  description: string | null
  is_required: boolean
  min_selections: number
  max_selections: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  modifiers?: Modifier[]
}

/** Shape returned by list endpoint (no modifier_groups) */
export interface MenuItem {
  id: number
  category_id: number | null
  name: string
  description: string | null
  sku: string | null
  barcode: string | null
  image_url: string | null
  pricing_type: PricingType
  unit_of_measure: UnitOfMeasure
  price: number
  cost: number
  min_order_qty: number
  preparation_time_minutes: number | null
  is_available: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  /** Denormalised category name (list endpoint) */
  category_name: string | null
}

/** Shape returned by detail endpoint (includes modifier_groups) */
export interface MenuItemDetail extends MenuItem {
  modifier_groups: ModifierGroup[]
}

export interface CreateMenuItemPayload {
  category_id?: number | null
  name: string
  description?: string | null
  sku?: string | null
  barcode?: string | null
  image_url?: string | null
  pricing_type: PricingType
  unit_of_measure: UnitOfMeasure
  price: number
  cost?: number
  min_order_qty?: number
  preparation_time_minutes?: number | null
  sort_order?: number
}

export type UpdateMenuItemPayload = Partial<CreateMenuItemPayload> & {
  is_available?: boolean
  is_active?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const PRICING_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'weight_based', label: 'Weight Based' },
] as const

export const UNIT_OPTIONS = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram' },
  { value: 'ons', label: 'Ons' },
  { value: 'liter', label: 'Liter' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'portion', label: 'Portion' },
] as const

// ─── Service ─────────────────────────────────────────────────────────────────

export const menuItemsService = {
  list: (filters?: MenuItemFilters) => {
    const { page, pageSize, ...rest } = filters ?? {}
    return api.get<MenuItem[]>(
      `/api/v1/menu-items${buildQueryParams(
        {
          category_id: rest.categoryId,
          pricing_type: rest.pricingType,
          is_available: rest.isAvailable,
          is_active: rest.isActive,
          search: rest.search,
        },
        { page: page ?? 1, pageSize: pageSize ?? 20 },
      )}`,
    )
  },

  get: (id: number) =>
    api.get<MenuItemDetail>(`/api/v1/menu-items/${id}`),

  create: (payload: CreateMenuItemPayload) =>
    api.post<MenuItem>('/api/v1/menu-items', payload),

  update: (id: number, payload: UpdateMenuItemPayload) =>
    api.put<MenuItem>(`/api/v1/menu-items/${id}`, payload),

  /** Toggle availability via PATCH */
  updateAvailability: (id: number, isAvailable: boolean) =>
    api.patch<MenuItem>(`/api/v1/menu-items/${id}/availability`, {
      is_available: isAvailable,
    }),

  /** Soft-delete (sets is_active = false) */
  delete: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/menu-items/${id}`),

  /** Assign an existing modifier group to this menu item */
  assignModifierGroup: (itemId: number, modifierGroupId: number) =>
    api.post<ModifierGroup>(
      `/api/v1/menu-items/${itemId}/modifier-groups`,
      { modifier_group_id: modifierGroupId },
    ),

  /** Unassign a modifier group from this menu item */
  unassignModifierGroup: (itemId: number, groupId: number) =>
    api.delete<{ message: string }>(
      `/api/v1/menu-items/${itemId}/modifier-groups/${groupId}`,
    ),
}
