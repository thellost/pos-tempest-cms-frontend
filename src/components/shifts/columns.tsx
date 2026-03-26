import type { ColumnDef } from '@tanstack/react-table'
import { XCircleIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'
import type { Shift } from '@/lib/services/shifts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatIDR(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateTime(dateStr: string | null | undefined): React.ReactNode {
  if (!dateStr) return <span className="text-muted-foreground">—</span>
  return (
    <span className="text-sm text-muted-foreground">
      {new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetShiftColumnsOptions {
  onClose: (shift: Shift) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getShiftColumns({
  onClose,
}: GetShiftColumnsOptions): ColumnDef<Shift>[] {
  return [
    {
      accessorKey: 'id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.original.id}
        </span>
      ),
    },
    {
      accessorKey: 'user_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.user_name}</span>
      ),
    },
    {
      accessorKey: 'device_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Device" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.device_name}</span>
      ),
    },
    {
      accessorKey: 'branch_name',
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
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'opening_cash',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Opening Cash" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatIDR(row.original.opening_cash)}
        </span>
      ),
    },
    {
      accessorKey: 'closing_cash',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Closing Cash" />
      ),
      cell: ({ row }) => {
        const val = row.original.closing_cash
        if (val === null)
          return <span className="text-muted-foreground">—</span>
        return <span className="tabular-nums">{formatIDR(val)}</span>
      },
    },
    {
      accessorKey: 'cash_difference',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Difference" />
      ),
      cell: ({ row }) => {
        const diff = row.original.cash_difference
        if (diff === null)
          return <span className="text-muted-foreground">—</span>
        const isNegative = diff < 0
        return (
          <span
            className={cn(
              'font-medium tabular-nums',
              isNegative
                ? 'text-destructive'
                : 'text-emerald-600 dark:text-emerald-400',
            )}
          >
            {diff >= 0 ? '+' : ''}
            {formatIDR(diff)}
          </span>
        )
      },
    },
    {
      accessorKey: 'opened_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Opened At" />
      ),
      cell: ({ row }) => formatDateTime(row.original.opened_at),
    },
    {
      accessorKey: 'closed_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Closed At" />
      ),
      cell: ({ row }) => formatDateTime(row.original.closed_at),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        // Stop propagation so clicking the actions menu doesn't trigger row navigation
        <div onClick={(e) => e.stopPropagation()}>
          <DataTableRowActions
            row={row}
            actions={[
              {
                label: 'Close Shift',
                icon: XCircleIcon,
                variant: 'destructive',
                onClick: onClose,
                hidden: (shift) => shift.status !== 'open',
              },
            ]}
          />
        </div>
      ),
    },
  ]
}
