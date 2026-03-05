import { api, buildQueryParams } from '@/lib/api-client'
import type { CategoryFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number
  parent_id: number | null
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryTree extends Category {
  children?: CategoryTree[]
}

export interface CreateCategoryPayload {
  parent_id?: number | null
  name: string
  description?: string
  sort_order?: number
}

export interface UpdateCategoryPayload {
  parent_id?: number | null
  name?: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const categoriesService = {
  /** Flat list of all categories with pagination */
  list: (filters?: CategoryFilters) =>
    api.get<Category[]>(
      `/api/v1/categories${buildQueryParams(
        {},
        { page: filters?.page ?? 1, pageSize: filters?.pageSize ?? 100 },
      )}`,
    ),

  /** Nested tree structure (no pagination — returns full tree) */
  tree: () => api.get<CategoryTree[]>('/api/v1/categories/tree'),

  get: (id: number) => api.get<Category>(`/api/v1/categories/${id}`),

  create: (payload: CreateCategoryPayload) =>
    api.post<Category>('/api/v1/categories', payload),

  update: (id: number, payload: UpdateCategoryPayload) =>
    api.put<Category>(`/api/v1/categories/${id}`, payload),

  /** Soft-delete: fails if category has active menu items */
  delete: (id: number) =>
    api.delete<{ message: string }>(`/api/v1/categories/${id}`),
}
