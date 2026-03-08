import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  devicesService,
  type CreateDevicePayload,
  type UpdateDevicePayload,
  type Device,
} from '@/lib/services/devices'
import { queryKeys, type DeviceFilters } from '@/lib/query-keys'
import type { ApiResult } from '@/lib/api-client'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useDevices(filters?: DeviceFilters) {
  return useQuery({
    queryKey: queryKeys.devices.list(filters),
    queryFn: () => devicesService.list(filters),
    enabled: !!filters?.branchId,
  })
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: queryKeys.devices.detail(id),
    queryFn: () => devicesService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDevicePayload) =>
      devicesService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all })
      toast.success('Device registered successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateDevicePayload
    }) => devicesService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.detail(id) })
      toast.success('Device updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number
      status: 'active' | 'inactive'
    }) => devicesService.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.devices.all })
      const previousData = queryClient.getQueriesData<ApiResult<Device[]>>({
        queryKey: queryKeys.devices.all,
      })
      queryClient.setQueriesData<ApiResult<Device[]>>(
        { queryKey: queryKeys.devices.all },
        (old) => {
          if (!old?.data) return old
          return {
            ...old,
            data: old.data.map((device) =>
              device.id === id ? { ...device, status } : device,
            ),
          }
        },
      )
      return { previousData }
    },
    onSuccess: (_, { status }) => {
      toast.success(
        status === 'active' ? 'Device activated' : 'Device deactivated',
      )
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
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all })
    },
  })
}
