import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangleIcon, HistoryIcon, PencilIcon, SlidersIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { InventoryItem } from '@/lib/services/inventory'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetInventoryColumnsOptions {
  onAdjust: (item: InventoryItem) => void
  onEditThreshold: (item: InventoryItem) => void
  onViewMovements: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getInventoryColumns({
  onAdjust,
  onEditThreshold,
  onViewMovements,
  onEdit,
  onDelete,
}: GetInventoryColumnsOptions): ColumnDef<InventoryItem>[] {
  return [
    {
      accessorKey: 'name',
      meta: { mobileTitle: true, mobileLabel: 'Ingredient' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ingredient" />
      ),
      cell: ({ row }) => {
        const { name, unit_of_measure } = row.original
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {unit_of_measure}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'branch_name',
      meta: { mobileOrder: 3, mobileLabel: 'Branch' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.branch_name}</span>
      ),
    },
    {
      accessorKey: 'stock_quantity',
      meta: { mobileOrder: 1, mobileLabel: 'Stock' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock Qty" />
      ),
      cell: ({ row }) => {
        const { stock_quantity, is_low_stock, unit_of_measure } = row.original
        return (
          <div className="flex items-center gap-1.5">
            {is_low_stock && (
              <AlertTriangleIcon className="size-3.5 shrink-0 text-destructive" />
            )}
            <span
              className={
                is_low_stock ? 'font-semibold text-destructive' : 'tabular-nums'
              }
            >
              {formatQuantity(stock_quantity)} {unit_of_measure}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'low_stock_threshold',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Threshold" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {formatQuantity(row.original.low_stock_threshold)}
        </span>
      ),
    },
    {
      id: 'stock_status',
      meta: { mobileOrder: 2, mobileLabel: 'Status' },
      header: 'Status',
      cell: ({ row }) => {
        const { is_low_stock } = row.original
        return is_low_stock ? (
          <Badge variant="destructive">LOW</Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-green-500 text-green-600 dark:text-green-400"
          >
            OK
          </Badge>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      meta: { mobileHidden: true },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Updated" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.updated_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
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
              onClick: (item) => onEdit(item),
            },
            {
              label: 'Adjust Stock',
              icon: SlidersIcon,
              onClick: (item) => onAdjust(item),
            },
            {
              label: 'Edit Threshold',
              icon: PencilIcon,
              onClick: (item) => onEditThreshold(item),
            },
            {
              label: 'Delete',
              icon: Trash2Icon,
              variant: 'destructive',
              onClick: (item) => onDelete(item),
            },
            {
              label: 'Movement History',
              icon: HistoryIcon,
              separator: true,
              onClick: (item) => onViewMovements(item),
            },
          ]}
        />
      ),
    },
  ]
}
