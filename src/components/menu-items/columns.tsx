import type { ColumnDef } from '@tanstack/react-table'
import { ImageIcon, PencilIcon, Trash2Icon, ToggleLeftIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { MenuItem } from '@/lib/services/menu-items'

interface GetMenuItemColumnsOptions {
  onEdit: (item: MenuItem) => void
  onToggleAvailability: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
  isTogglingId?: number | null
}

export function getMenuItemColumns({
  onEdit,
  onToggleAvailability,
  onDelete,
  isTogglingId,
}: GetMenuItemColumnsOptions): ColumnDef<MenuItem>[] {
  return [
    {
      id: 'image',
      header: '',
      cell: ({ row }) =>
        row.original.image_url ? (
          <img
            src={row.original.image_url}
            alt={row.original.name}
            className="size-10 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted">
            <ImageIcon className="size-4 text-muted-foreground" />
          </div>
        ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="min-w-[160px]">
          <p className="font-medium leading-tight">{row.original.name}</p>
          {row.original.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'sku',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SKU" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.sku ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'barcode',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Barcode" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.original.barcode ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'category_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) =>
        row.original.category_name ? (
          <Badge variant="secondary">{row.original.category_name}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      enableSorting: false,
    },
    {
      accessorKey: 'pricing_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.pricing_type === 'fixed' ? 'outline' : 'secondary'
          }
          className="capitalize"
        >
          {row.original.pricing_type === 'weight_based'
            ? 'Weight'
            : row.original.pricing_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {row.original.price.toLocaleString()}
          {row.original.pricing_type === 'weight_based'
            ? `/${row.original.unit_of_measure}`
            : ''}
        </span>
      ),
    },
    {
      accessorKey: 'cost',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cost" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.cost.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'is_available',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Available" />
      ),
      cell: ({ row }) => (
        <Switch
          checked={row.original.is_available}
          disabled={isTogglingId === row.original.id}
          onCheckedChange={() => onToggleAvailability(row.original)}
          aria-label={`Toggle availability for ${row.original.name}`}
        />
      ),
      enableSorting: false,
    },
    {
      id: 'is_active',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
      ),
      enableSorting: false,
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
              label: row.original.is_available
                ? 'Mark Unavailable'
                : 'Mark Available',
              icon: ToggleLeftIcon,
              onClick: onToggleAvailability,
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
