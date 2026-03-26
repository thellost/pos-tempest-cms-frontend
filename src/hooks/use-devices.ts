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

export function useDevice(device_uid: string) {
  return useQuery({
    queryKey: queryKeys.devices.detail(device_uid),
    queryFn: () => devicesService.get(device_uid),
    enabled: !!device_uid,
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
      device_uid,
      payload,
    }: {
      device_uid: string
      payload: UpdateDevicePayload
    }) => devicesService.update(device_uid, payload),
    onSuccess: (_, { device_uid }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.detail(device_uid) })
      toast.success('Device updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      device_uid,
      status,
    }: {
      device_uid: string
      status: 'active' | 'inactive'
    }) => devicesService.updateStatus(device_uid, status),
    onMutate: async ({ device_uid, status }) => {
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
              device.device_uid === device_uid ? { ...device, status } : device,
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
