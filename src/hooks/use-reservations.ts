import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  reservationsService,
  type CreateReservationPayload,
  type UpdateReservationPayload,
  type UpdateReservationStatusPayload,
} from '@/lib/services/reservations'
import { queryKeys, type ReservationFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useReservations(filters?: ReservationFilters) {
  return useQuery({
    queryKey: queryKeys.reservations.list(filters),
    queryFn: () => reservationsService.list(filters),
  })
}

export function useReservation(id: number) {
  return useQuery({
    queryKey: queryKeys.reservations.detail(id),
    queryFn: () => reservationsService.get(id),
    enabled: id > 0,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateReservationPayload) =>
      reservationsService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      toast.success('Reservation created successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateReservationPayload
    }) => reservationsService.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(id),
      })
      toast.success('Reservation updated successfully')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateReservationStatusPayload
    }) => reservationsService.updateStatus(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.detail(id),
      })
      // Status changes can affect table status (e.g. seated → occupied)
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.all })
      toast.success('Reservation status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
