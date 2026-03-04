import { api, buildQueryParams } from '@/lib/api-client'
import type { UserFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role_id: number
  role_name: string
  branch_id: number | null
  branch_name: string | null
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserPayload {
  email: string
  password: string
  name: string
  role_id: number
  branch_id: number
  phone?: string
  pin_code?: string
}

export type UpdateUserPayload = {
  name?: string
  phone?: string | null
  pin_code?: string
  avatar_url?: string | null
  is_active?: boolean
  role_id?: number
  branch_id?: number
}

// ─── Role constants ────────────────────────────────────────────────────────────
//
// Role IDs must match the seeded rows in the `roles` table.
// The values here are the `id` column of the `roles` table as strings so they
// work directly as SelectField / FilterBar select values.

export const ROLE_OPTIONS = [
  { value: '1', label: 'Admin' },
  { value: '2', label: 'Manager' },
  { value: '3', label: 'Cashier' },
  { value: '4', label: 'Chef' },
  { value: '5', label: 'Waiter' },
]

/** Subset available to managers — they cannot assign admin or manager role. */
export const STAFF_ROLE_OPTIONS = ROLE_OPTIONS.filter(
  (r) => !['1', '2'].includes(r.value),
)

// ─── Service ──────────────────────────────────────────────────────────────────

export const usersService = {
  list: (filters?: UserFilters) => {
    const { page, pageSize, branchId, roleId, isActive, search } = filters ?? {}
    return api.get<User[]>(
      `/api/v1/users${buildQueryParams(
        {
          ...(branchId !== undefined ? { branch_id: branchId } : {}),
          ...(roleId !== undefined ? { role_id: roleId } : {}),
          ...(isActive !== undefined ? { is_active: isActive } : {}),
          ...(search ? { search } : {}),
        },
        { page: page ?? 1, pageSize: pageSize ?? 20 },
      )}`,
    )
  },

  get: (id: number) => api.get<User>(`/api/v1/users/${id}`),

  create: (payload: CreateUserPayload) =>
    api.post<User>('/api/v1/users', payload),

  update: (id: number, payload: UpdateUserPayload) =>
    api.put<User>(`/api/v1/users/${id}`, payload),

  /** Soft-deactivate: sets is_active = false. */
  deactivate: (id: number) =>
    api.patch<{ message: string }>(`/api/v1/users/${id}/deactivate`, {}),
}
