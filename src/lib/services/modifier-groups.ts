import { api, buildQueryParams } from '@/lib/api-client'
import type { ModifierGroupFilters } from '@/lib/query-keys'
import type { Modifier, ModifierGroup } from '@/lib/services/menu-items'

export type { Modifier, ModifierGroup }

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface CreateModifierGroupPayload {
  name: string
  description?: string | null
  is_required?: boolean
  min_selections?: number
  max_selections: number
  sort_order?: number
}

export interface UpdateModifierGroupPayload {
  name?: string
  description?: string | null
  is_required?: boolean
  min_selections?: number
  max_selections?: number
  sort_order?: number
  is_active?: boolean
}

export interface CreateModifierPayload {
  name: string
  extra_price?: number
  sort_order?: number
}

export interface UpdateModifierPayload {
  name?: string
  extra_price?: number
  sort_order?: number
  is_active?: boolean
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const modifierGroupsService = {
  list: (filters?: ModifierGroupFilters) =>
    api.get<ModifierGroup[]>(
      `/api/v1/modifier-groups${buildQueryParams(
        {},
        { page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 100 },
      )}`,
    ),

  get: (id: number) =>
    api.get<ModifierGroup>(`/api/v1/modifier-groups/${id}`),

  create: (payload: CreateModifierGroupPayload) =>
    api.post<ModifierGroup>('/api/v1/modifier-groups', payload),

  update: (id: number, payload: UpdateModifierGroupPayload) =>
    api.put<ModifierGroup>(`/api/v1/modifier-groups/${id}`, payload),

  delete: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/modifier-groups/${id}`),

  // ── Modifiers (options inside a group) ──────────────────────────────────

  createModifier: (groupId: number, payload: CreateModifierPayload) =>
    api.post<Modifier>(
      `/api/v1/modifier-groups/${groupId}/modifiers`,
      payload,
    ),

  updateModifier: (modifierId: number, payload: UpdateModifierPayload) =>
    api.put<Modifier>(`/api/v1/modifiers/${modifierId}`, payload),

  deleteModifier: (modifierId: number) =>
    api.delete<{ message: string }>(`/api/v1/modifiers/${modifierId}`),
}
