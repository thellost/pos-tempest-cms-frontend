import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import type { ModifierGroup } from '@/lib/services/modifier-groups'

interface GetModifierGroupColumnsOptions {
  onEdit: (group: ModifierGroup) => void
  onDelete: (group: ModifierGroup) => void
  onAddModifier: (group: ModifierGroup) => void
}

export function getModifierGroupColumns({
  onEdit,
  onDelete,
  onAddModifier,
}: GetModifierGroupColumnsOptions): ColumnDef<ModifierGroup>[] {
  return [
    {
      accessorKey: 'name',
      meta: { mobileTitle: true, mobileLabel: 'Modifier Group' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'is_required',
      meta: { mobileOrder: 1, mobileLabel: 'Required' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Required" />
      ),
      cell: ({ row }) =>
        row.original.is_required ? (
          <Badge variant="default" className="text-xs">
            Required
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Optional
          </Badge>
        ),
    },
    {
      id: 'selections',
      meta: { mobileOrder: 2, mobileLabel: 'Selections' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Selections" />
      ),
      cell: ({ row }) => {
        const { min_selections, max_selections } = row.original
        return (
          <span className="text-sm text-muted-foreground">
            {min_selections}–{max_selections}
          </span>
        )
      },
    },
    {
      accessorKey: 'sort_order',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sort Order" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sort_order}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      meta: { mobileOrder: 3, mobileLabel: 'Status' },
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
              label: 'Add Modifier',
              icon: PlusIcon,
              onClick: onAddModifier,
            },
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
