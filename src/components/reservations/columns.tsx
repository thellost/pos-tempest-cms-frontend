import type { ColumnDef } from '@tanstack/react-table'
import { UsersIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Reservation, ReservationStatus } from '@/lib/services/reservations'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatReservationDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Returns which next statuses are valid for a given current status. */
export function getValidNextStatuses(
  current: ReservationStatus,
): ReservationStatus[] {
  switch (current) {
    case 'confirmed':
      return ['seated', 'no_show', 'cancelled']
    case 'seated':
      return ['completed']
    default:
      return []
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetReservationColumnsOptions {
  onEdit: (reservation: Reservation) => void
  onStatusChange: (reservation: Reservation, status: ReservationStatus) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getReservationColumns({
  onEdit,
  onStatusChange,
}: GetReservationColumnsOptions): ColumnDef<Reservation>[] {
  return [
    {
      accessorKey: 'customer_name',
      meta: { mobileTitle: true, mobileLabel: 'Customer' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => {
        const { customer_name, customer_phone } = row.original
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UsersIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{customer_name}</p>
              {customer_phone && (
                <p className="truncate text-xs text-muted-foreground">
                  {customer_phone}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'branch_name',
      meta: { mobileOrder: 2, mobileLabel: 'Branch' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.branch_name}
        </span>
      ),
    },
    {
      accessorKey: 'table_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Table" />
      ),
      cell: ({ row }) => {
        const num = row.original.table_number
        return num ? (
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {num}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'guest_count',
      meta: { mobileOrder: 3, mobileLabel: 'Guests' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Guests" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.guest_count}</span>
      ),
    },
    {
      accessorKey: 'reservation_datetime',
      meta: { mobileOrder: 1, mobileLabel: 'When' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date & Time" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm">
          {formatReservationDateTime(row.original.reservation_datetime)}
        </span>
      ),
    },
    {
      accessorKey: 'duration_minutes',
      meta: { mobileHidden: true },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {row.original.duration_minutes} min
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const reservation = row.original
        const nextStatuses = getValidNextStatuses(reservation.status)

        const statusActions = nextStatuses.map((s) => ({
          label: statusActionLabel(s),
          onClick: (r: Reservation) => onStatusChange(r, s),
          variant:
            s === 'cancelled' || s === 'no_show'
              ? ('destructive' as const)
              : ('default' as const),
          separator: s === nextStatuses[0],
        }))

        return (
          <DataTableRowActions
            row={row}
            actions={[
              {
                label: 'Edit',
                onClick: onEdit,
              },
              ...statusActions,
            ]}
          />
        )
      },
    },
  ]
}

function statusActionLabel(status: ReservationStatus): string {
  switch (status) {
    case 'seated':
      return 'Mark as Seated'
    case 'completed':
      return 'Mark as Completed'
    case 'no_show':
      return 'Mark as No-Show'
    case 'cancelled':
      return 'Cancel Reservation'
    default:
      return status
  }
}
