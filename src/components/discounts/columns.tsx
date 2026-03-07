import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Discount } from '@/lib/services/discounts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDiscountValue(discount: Discount): string {
  if (discount.discount_type === 'percentage') {
    return `${discount.value}%`
  }
  return new Intl.NumberFormat(undefined, {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(discount.value)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetDiscountColumnsOptions {
  onEdit: (discount: Discount) => void
  onDelete: (discount: Discount) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getDiscountColumns({
  onEdit,
  onDelete,
}: GetDiscountColumnsOptions): ColumnDef<Discount>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const { name, description } = row.original
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            {description && (
              <p className="truncate text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'discount_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.discount_type
        return (
          <Badge
            variant="secondary"
            className={
              type === 'percentage'
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                : 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300'
            }
          >
            {type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'value',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Value" />
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatDiscountValue(row.original)}
        </span>
      ),
    },
    {
      accessorKey: 'min_order_amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Min Order" />
      ),
      cell: ({ row }) => {
        const v = row.original.min_order_amount
        return v != null ? (
          <span className="tabular-nums">
            {new Intl.NumberFormat().format(v)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'max_discount_amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Max Discount" />
      ),
      cell: ({ row }) => {
        const v = row.original.max_discount_amount
        return v != null ? (
          <span className="tabular-nums">
            {new Intl.NumberFormat().format(v)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'valid_from',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valid From" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.valid_from)}
        </span>
      ),
    },
    {
      accessorKey: 'valid_until',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valid Until" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.valid_until)}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: 'Edit',
              icon: PencilIcon,
              onClick: onEdit,
            },
            {
              label: 'Delete',
              icon: Trash2Icon,
              onClick: onDelete,
              variant: 'destructive',
            },
          ]}
        />
      ),
    },
  ]
}
