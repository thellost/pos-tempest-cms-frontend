import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  usersService,
  type UpdateUserPayload,
  type User,
} from '@/lib/services/users'
import { queryKeys, type UserFilters } from '@/lib/query-keys'
import type { ApiResult } from '@/lib/api-client'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => usersService.list(filters),
  })
}

export function useUser(id: number) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      toast.success('User created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateUserPayload
    }) => usersService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
      toast.success('User updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: usersService.deactivate,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all })
      const previousData = queryClient.getQueriesData<ApiResult<User[]>>({
        queryKey: queryKeys.users.all,
      })
      queryClient.setQueriesData<ApiResult<User[]>>(
        { queryKey: queryKeys.users.all },
        (old) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((user) =>
              user.id === id ? { ...user, is_active: false } : user,
            ),
          }
        },
      )
      return { previousData }
    },
    onSuccess: () => {
      toast.success('User deactivated')
    },
    onError: (err: Error, _variables, context) => {
      if (context?.previousData) {
        for (const [key, value] of context.previousData) {
          queryClient.setQueryData(key, value)
        }
      }
      toast.error(err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
