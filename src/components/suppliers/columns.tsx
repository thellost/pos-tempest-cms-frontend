import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Supplier } from '@/lib/services/sales-cash-flow'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetSupplierColumnsOptions {
  onEdit: (supplier: Supplier) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getSupplierColumns({
  onEdit,
}: GetSupplierColumnsOptions): ColumnDef<Supplier>[] {
  return [
    {
      accessorKey: 'name',
      meta: { mobileTitle: true, mobileLabel: 'Supplier' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'contact_person',
      meta: { mobileOrder: 1, mobileLabel: 'Contact' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact Person" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.contact_person ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'phone',
      meta: { mobileOrder: 2, mobileLabel: 'Phone' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.phone ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.email ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'address',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Address" />
      ),
      cell: ({ row }) => {
        const address = row.original.address
        return address ? (
          <span className="max-w-[200px] truncate text-sm" title={address}>
            {address}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
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
              label: 'Edit',
              icon: PencilIcon,
              onClick: onEdit,
            },
          ]}
        />
      ),
    },
  ]
}
