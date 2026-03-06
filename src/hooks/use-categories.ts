import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  categoriesService,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/lib/services/categories'
import { queryKeys, type CategoryFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useCategories(filters?: CategoryFilters) {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: () => categoriesService.list(filters),
  })
}

export function useCategoryTree() {
  return useQuery({
    queryKey: queryKeys.categories.tree,
    queryFn: () => categoriesService.tree(),
  })
}

export function useCategory(id: number) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoriesService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      categoriesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      toast.success('Category created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateCategoryPayload
    }) => categoriesService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories.detail(id),
      })
      toast.success('Category updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => categoriesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      toast.success('Category deleted successfully')
    },
    onError: (err: Error) => {
      if (err.message.toLowerCase().includes('reassign')) {
        toast.error(
          'Move or delete this category\'s menu items before deleting the category.',
        )
      } else {
        toast.error(err.message)
      }
    },
  })
}
