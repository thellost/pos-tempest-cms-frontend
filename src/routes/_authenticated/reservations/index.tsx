import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListIcon,
  PlusIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { useBranches } from '@/hooks/use-branches'
import { useTables } from '@/hooks/use-tables'
import { useCustomers } from '@/hooks/use-customers'
import {
  useReservations,
  useCreateReservation,
  useUpdateReservation,
  useUpdateReservationStatus,
} from '@/hooks/use-reservations'
import type {
  Reservation,
  ReservationStatus,
  CreateReservationPayload,
  UpdateReservationPayload,
} from '@/lib/services/reservations'
import {
  getReservationColumns,
  formatReservationDateTime,
  getValidNextStatuses,
} from '@/components/reservations/columns'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/reservations/')({
  component: ReservationsPage,
})

// ─── Status colours (for calendar blocks) ────────────────────────────────────

const STATUS_BLOCK_CLASSES: Record<ReservationStatus, string> = {
  confirmed:
    'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  seated:
    'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  completed:
    'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  no_show:
    'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
  cancelled:
    'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDateStr(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function localDatetimeValue(isoStr: string): string {
  // Convert ISO UTC string to local datetime-local input value (YYYY-MM-DDTHH:mm)
  const d = new Date(isoStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReservationsPage() {
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()

  // ── View mode ────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  // ── Calendar state ───────────────────────────────────────────────────────────
  const today = new Date()
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth()) // 0-based

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '',
    table_id: '',
    status: '',
  })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // ── Dialog states ─────────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Reservation | null>(null)
  const [statusTarget, setStatusTarget] = useState<{
    reservation: Reservation
    status: ReservationStatus
  } | null>(null)

  // ── Data for filter dropdowns ─────────────────────────────────────────────────
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const filterBranchId = filterValues.branch_id
    ? parseInt(filterValues.branch_id, 10)
    : undefined
  const { data: tablesData } = useTables({
    branchId: filterBranchId,
    pageSize: 200,
  })

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const tableOptions = useMemo(
    () =>
      (tablesData?.data ?? []).map((t) => ({
        value: String(t.id),
        label: `Table ${t.table_number}`,
      })),
    [tablesData],
  )

  // ── Calendar date range for fetching ─────────────────────────────────────────
  const calendarDateFrom = isoDateStr(new Date(calendarYear, calendarMonth, 1))
  const calendarDateTo = isoDateStr(new Date(calendarYear, calendarMonth + 1, 0))

  // ── Query filters ─────────────────────────────────────────────────────────────
  const listFilters = useMemo(
    () => ({
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      tableId: filterValues.table_id
        ? parseInt(filterValues.table_id, 10)
        : undefined,
      status: (filterValues.status || undefined) as ReservationStatus | undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    }),
    [filterValues, dateFrom, dateTo, page, pageSize],
  )

  const calendarFilters = useMemo(
    () => ({
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      status: (filterValues.status || undefined) as ReservationStatus | undefined,
      dateFrom: calendarDateFrom,
      dateTo: calendarDateTo,
      pageSize: 200,
    }),
    [filterValues.branch_id, filterValues.status, calendarDateFrom, calendarDateTo],
  )

  const { data: listData, isLoading: listLoading } = useReservations(
    viewMode === 'list' ? listFilters : undefined,
  )
  const { data: calendarData, isLoading: calendarLoading } = useReservations(
    viewMode === 'calendar' ? calendarFilters : undefined,
  )

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const updateStatusMutation = useUpdateReservationStatus()

  // ── Columns ───────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () =>
      getReservationColumns({
        onEdit: (r) => setEditTarget(r),
        onStatusChange: (r, s) => {
          // Destructive actions get a confirm dialog; others are direct
          if (s === 'cancelled' || s === 'no_show') {
            setStatusTarget({ reservation: r, status: s })
          } else {
            updateStatusMutation.mutate({ id: r.id, payload: { status: s } })
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ── Filter handlers ───────────────────────────────────────────────────────────
  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => {
      if (key === 'branch_id') return { ...prev, branch_id: value, table_id: '' }
      return { ...prev, [key]: value }
    })
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterValues({
      branch_id: userBranchId ? String(userBranchId) : '',
      table_id: '',
      status: '',
    })
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────────
  const calendarReservations = calendarData?.data ?? []
  const reservationsByDay = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    for (const r of calendarReservations) {
      const day = r.reservation_datetime.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(r)
    }
    return map
  }, [calendarReservations])

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1)
      setCalendarMonth(11)
    } else {
      setCalendarMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1)
      setCalendarMonth(0)
    } else {
      setCalendarMonth((m) => m + 1)
    }
  }

  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleString(
    undefined,
    { month: 'long', year: 'numeric' },
  )

  // Build calendar grid (6 weeks × 7 days)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const startPad = firstDay.getDay() // 0=Sun
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(calendarYear, calendarMonth, d))
    }
    // Pad to fill last row
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [calendarYear, calendarMonth])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations"
        description="Manage table reservations and seating."
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-md border bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <ListIcon className="size-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm font-medium transition-colors',
                  viewMode === 'calendar'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <CalendarIcon className="size-4" />
                Calendar
              </button>
            </div>

            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              New Reservation
            </Button>
          </div>
        }
      />

      {/* ── Filters ── */}
      <FilterBar
        filters={[
          {
            type: 'select',
            key: 'branch_id',
            label: 'Branch',
            options: branchOptions,
            allLabel: 'All branches',
          },
          {
            type: 'select',
            key: 'table_id',
            label: 'Table',
            options: tableOptions,
            allLabel: 'All tables',
          },
          {
            type: 'select',
            key: 'status',
            label: 'Status',
            options: [
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'seated', label: 'Seated' },
              { value: 'completed', label: 'Completed' },
              { value: 'no_show', label: 'No-Show' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
            allLabel: 'All statuses',
          },
        ]}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      >
        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
            <Input
              type="date"
              className="h-9 w-full min-w-[120px] text-sm"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
            <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
            <Input
              type="date"
              className="h-9 w-full min-w-[120px] text-sm"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </div>
        )}
      </FilterBar>

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <DataTable
          columns={columns}
          data={listData?.data ?? []}
          meta={listData?.meta}
          isLoading={listLoading}
          pagination={{ page, pageSize }}
          onPaginationChange={({ page: p, pageSize: ps }) => {
            setPage(p)
            setPageSize(ps)
          }}
          initialColumnVisibility={isMobile ? { branch_name: false, duration_minutes: false } : {}}
          emptyMessage="No reservations found."
        />
      )}

      {/* ── Calendar View ── */}
      {viewMode === 'calendar' && (
        <div className="rounded-lg border bg-card">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded p-1 hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <span className="text-sm font-semibold">{monthLabel}</span>
            <button
              type="button"
              onClick={nextMonth}
              className="rounded p-1 hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

          {/* Scrollable calendar — min-width ensures readable cells on mobile */}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div
                    key={d}
                    className="py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {calendarLoading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : (
                <div className="grid grid-cols-7">
              {calendarDays.map((date, idx) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[100px] border-b border-r bg-muted/20 last:border-r-0"
                    />
                  )
                }
                const dayKey = isoDateStr(date)
                const dayReservations = reservationsByDay[dayKey] ?? []
                const isToday = dayKey === isoDateStr(today)

                return (
                  <div
                    key={dayKey}
                    className={cn(
                      'min-h-[100px] border-b border-r p-1.5 last:border-r-0',
                      isToday && 'bg-primary/5',
                    )}
                  >
                    {/* Day number */}
                    <div
                      className={cn(
                        'mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {date.getDate()}
                    </div>

                    {/* Reservation blocks */}
                    <div className="space-y-0.5">
                      {dayReservations.slice(0, 3).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setEditTarget(r)}
                          className={cn(
                            'w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80',
                            STATUS_BLOCK_CLASSES[r.status],
                          )}
                          title={`${r.customer_name} · ${new Date(r.reservation_datetime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                        >
                          {new Date(r.reservation_datetime).toLocaleTimeString(
                            undefined,
                            { hour: '2-digit', minute: '2-digit' },
                          )}{' '}
                          {r.customer_name}
                        </button>
                      ))}
                      {dayReservations.length > 3 && (
                        <div className="px-1 text-[11px] text-muted-foreground">
                          +{dayReservations.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 border-t px-4 py-3">
            {(
              ['confirmed', 'seated', 'completed', 'no_show', 'cancelled'] as const
            ).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block size-2.5 rounded-sm border',
                    STATUS_BLOCK_CLASSES[s],
                  )}
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {s.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Create Reservation Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Reservation</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-1">
            <ReservationForm
              key={createOpen ? 'create-open' : 'create-closed'}
              mode="create"
              defaultBranchId={filterBranchId}
              onSuccess={() => setCreateOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Edit Reservation Dialog ── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Reservation</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <ScrollArea className="max-h-[80vh] pr-1">
              <div className="mb-4 flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{editTarget.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatReservationDateTime(editTarget.reservation_datetime)}
                  </p>
                </div>
                <StatusBadge status={editTarget.status} />
              </div>

              {/* Status transition buttons */}
              {getValidNextStatuses(editTarget.status).length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Change status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getValidNextStatuses(editTarget.status).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={
                          s === 'cancelled' || s === 'no_show'
                            ? 'destructive'
                            : 'outline'
                        }
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          if (s === 'cancelled' || s === 'no_show') {
                            setStatusTarget({ reservation: editTarget, status: s })
                          } else {
                            updateStatusMutation.mutate(
                              { id: editTarget.id, payload: { status: s } },
                              {
                                onSuccess: (updated) => {
                                  setEditTarget(updated.data)
                                },
                              },
                            )
                          }
                        }}
                      >
                        {statusLabel(s)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <ReservationForm
                key={`edit-${editTarget.id}`}
                mode="edit"
                reservation={editTarget}
                onSuccess={() => setEditTarget(null)}
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Destructive status confirm dialog ── */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => { if (!open) setStatusTarget(null) }}
        title={
          statusTarget?.status === 'cancelled'
            ? 'Cancel Reservation'
            : 'Mark as No-Show'
        }
        description={
          statusTarget?.status === 'cancelled'
            ? `Are you sure you want to cancel the reservation for ${statusTarget?.reservation.customer_name}? This action cannot be undone.`
            : `Mark the reservation for ${statusTarget?.reservation.customer_name} as a no-show?`
        }
        variant="destructive"
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => {
          if (!statusTarget) return
          updateStatusMutation.mutate(
            {
              id: statusTarget.reservation.id,
              payload: { status: statusTarget.status },
            },
            {
              onSuccess: () => {
                setStatusTarget(null)
                if (editTarget?.id === statusTarget.reservation.id) {
                  setEditTarget(null)
                }
              },
            },
          )
        }}
      />
    </div>
  )
}

// ─── Status label helper ──────────────────────────────────────────────────────

function statusLabel(s: ReservationStatus): string {
  switch (s) {
    case 'seated': return 'Seat Guest'
    case 'completed': return 'Complete'
    case 'no_show': return 'No-Show'
    case 'cancelled': return 'Cancel'
    default: return s
  }
}

// ─── Reservation Form ─────────────────────────────────────────────────────────

interface ReservationFormProps {
  mode: 'create' | 'edit'
  reservation?: Reservation
  defaultBranchId?: number
  onSuccess: (updated?: Reservation) => void
}

function ReservationForm({
  mode,
  reservation,
  defaultBranchId,
  onSuccess,
}: ReservationFormProps) {
  const { branchId: userBranchId } = useAuth()

  const createMutation = useCreateReservation()
  const updateMutation = useUpdateReservation()

  // Branch + table selectors (managed outside TanStack Form for cascading)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    reservation?.branch_id
      ? String(reservation.branch_id)
      : defaultBranchId
        ? String(defaultBranchId)
        : userBranchId
          ? String(userBranchId)
          : '',
  )

  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branchId = selectedBranchId ? parseInt(selectedBranchId, 10) : undefined
  const { data: tablesData } = useTables({ branchId, pageSize: 200 })
  const { data: customersData } = useCustomers({ pageSize: 100 })

  const branchOptions = (branchesData?.data ?? []).map((b) => ({
    value: String(b.id),
    label: b.name,
  }))
  const tableOptions = (tablesData?.data ?? []).map((t) => ({
    value: String(t.id),
    label: `Table ${t.table_number} (cap. ${t.capacity})`,
  }))
  const customerOptions = (customersData?.data ?? []).map((c) => ({
    value: String(c.id),
    label: c.name + (c.phone ? ` · ${c.phone}` : ''),
  }))

  // Default datetime: next hour rounded
  const defaultDatetime = useMemo(() => {
    if (reservation) return localDatetimeValue(reservation.reservation_datetime)
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return localDatetimeValue(d.toISOString())
  }, [reservation])

  const form = useAppForm({
    defaultValues: {
      customer_name: reservation?.customer_name ?? '',
      customer_phone: reservation?.customer_phone ?? '',
      customer_id: reservation?.customer_id ? String(reservation.customer_id) : '',
      table_id: reservation?.table_id ? String(reservation.table_id) : '',
      guest_count: reservation?.guest_count ?? 2,
      reservation_datetime: defaultDatetime,
      duration_minutes: reservation?.duration_minutes ?? 120,
      notes: reservation?.notes ?? '',
    },
    onSubmit: async ({ value }) => {
      const datetimeISO = new Date(value.reservation_datetime).toISOString()

      if (mode === 'create') {
        if (!selectedBranchId) return
        const payload: CreateReservationPayload = {
          branch_id: parseInt(selectedBranchId, 10),
          customer_name: value.customer_name,
          ...(value.customer_phone ? { customer_phone: value.customer_phone } : {}),
          ...(value.customer_id ? { customer_id: parseInt(value.customer_id, 10) } : {}),
          ...(value.table_id ? { table_id: parseInt(value.table_id, 10) } : {}),
          guest_count: value.guest_count,
          reservation_datetime: datetimeISO,
          duration_minutes: value.duration_minutes,
          ...(value.notes ? { notes: value.notes } : {}),
        }
        await createMutation.mutateAsync(payload)
        onSuccess()
      } else if (reservation) {
        const payload: UpdateReservationPayload = {
          customer_name: value.customer_name,
          customer_phone: value.customer_phone || null,
          ...(value.customer_id ? { customer_id: parseInt(value.customer_id, 10) } : {}),
          table_id: value.table_id ? parseInt(value.table_id, 10) : null,
          guest_count: value.guest_count,
          reservation_datetime: datetimeISO,
          duration_minutes: value.duration_minutes,
          notes: value.notes || null,
        }
        const result = await updateMutation.mutateAsync({
          id: reservation.id,
          payload,
        })
        onSuccess(result.data)
      }
    },
  })

  return (
    <form
      className="space-y-4 px-1 py-1"
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      {/* Branch (create only) */}
      {mode === 'create' && (
        <div className="flex flex-col gap-1.5">
          <Label>
            Branch <span className="text-destructive">*</span>
          </Label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            required
          >
            <option value="">Select branch…</option>
            {branchOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Customer name */}
      <form.AppField
        name="customer_name"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Customer name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
          onSubmit: ({ value }) => {
            if (!value?.trim()) return 'Customer name is required'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Customer Name"
            placeholder="e.g. Budi Santoso"
            required
          />
        )}
      </form.AppField>

      {/* Customer phone */}
      <form.AppField name="customer_phone">
        {(field) => (
          <field.TextField
            label="Phone Number"
            placeholder="e.g. 081234567890"
          />
        )}
      </form.AppField>

      {/* Link to existing customer (optional) */}
      {customerOptions.length > 0 && (
        <form.AppField name="customer_id">
          {(field) => (
            <field.SelectField
              label="Link to Existing Customer (optional)"
              placeholder="No link — walk-in"
              options={customerOptions}
            />
          )}
        </form.AppField>
      )}

      {/* Table */}
      <form.AppField name="table_id">
        {(field) => (
          <field.SelectField
            label="Table (optional)"
            placeholder="No specific table"
            options={tableOptions}
          />
        )}
      </form.AppField>

      {/* Guest count */}
      <form.AppField name="guest_count">
        {(field) => (
          <field.NumberField
            label="Number of Guests"
            min={1}
          />
        )}
      </form.AppField>

      {/* Reservation datetime */}
      <div className="flex flex-col gap-1.5">
        <Label>
          Date & Time <span className="text-destructive">*</span>
        </Label>
        <form.AppField name="reservation_datetime">
          {(field) => (
            <Input
              type="datetime-local"
              className="h-9 text-sm"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              required
            />
          )}
        </form.AppField>
      </div>

      {/* Duration */}
      <form.AppField name="duration_minutes">
        {(field) => (
          <field.NumberField
            label="Duration (minutes)"
            min={15}
            description="Minimum 15 minutes"
          />
        )}
      </form.AppField>

      {/* Notes */}
      <form.AppField name="notes">
        {(field) => (
          <field.TextareaField
            label="Notes"
            placeholder="e.g. Birthday dinner, window seat preferred"
            rows={3}
          />
        )}
      </form.AppField>

      <form.AppForm>
        <form.SubscribeButton label={mode === 'create' ? 'Create Reservation' : 'Save Changes'} />
      </form.AppForm>
    </form>
  )
}
