import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import type { InventoryMovement, MovementType } from '@/lib/services/inventory'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOVEMENT_TYPE_CONFIG: Record<
  MovementType,
  { label: string; className: string }
> = {
  purchase_in: {
    label: 'Purchase In',
    className:
      'border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950',
  },
  sale_out: {
    label: 'Sale Out',
    className:
      'border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950',
  },
  adjustment: {
    label: 'Adjustment',
    className:
      'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950',
  },
  waste: {
    label: 'Waste',
    className:
      'border-orange-500 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950',
  },
  transfer: {
    label: 'Transfer',
    className:
      'border-purple-500 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950',
  },
}

function formatQty(n: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(n)
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getMovementColumns(): ColumnDef<InventoryMovement>[] {
  return [
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: 'movement_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const cfg =
          MOVEMENT_TYPE_CONFIG[row.original.movement_type] ??
          MOVEMENT_TYPE_CONFIG.adjustment
        return (
          <Badge variant="outline" className={cn('whitespace-nowrap', cfg.className)}>
            {cfg.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'quantity_change',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Change" />
      ),
      cell: ({ row }) => {
        const val = row.original.quantity_change
        const positive = val > 0
        return (
          <span
            className={cn(
              'tabular-nums font-semibold',
              positive ? 'text-green-600 dark:text-green-400' : 'text-destructive',
            )}
          >
            {positive ? '+' : ''}
            {formatQty(val)}
          </span>
        )
      },
    },
    {
      accessorKey: 'quantity_before',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Before" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {formatQty(row.original.quantity_before)}
        </span>
      ),
    },
    {
      accessorKey: 'quantity_after',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="After" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums font-medium">
          {formatQty(row.original.quantity_after)}
        </span>
      ),
    },
    {
      accessorKey: 'user_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const name = row.original.user_name
        return name ? (
          <span className="text-sm">{name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">System</span>
        )
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: ({ row }) => {
        const reason = row.original.reason
        return reason ? (
          <span className="max-w-[200px] truncate text-sm">{reason}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
  ]
}
