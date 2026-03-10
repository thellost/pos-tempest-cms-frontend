import type { ColumnDef } from '@tanstack/react-table'
import { BanIcon, PencilIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Branch } from '@/lib/services/branches'

interface GetBranchColumnsOptions {
  onEdit: (branch: Branch) => void
  onDeactivate: (branch: Branch) => void
  /** Only admins see edit / deactivate actions */
  isAdmin: boolean
}

export function getBranchColumns({
  onEdit,
  onDeactivate,
  isAdmin,
}: GetBranchColumnsOptions): ColumnDef<Branch>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
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
          <span
            className="block max-w-[200px] truncate text-muted-foreground"
            title={address}
          >
            {address}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => row.original.phone ?? '—',
    },
    {
      accessorKey: 'tax_rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tax Rate" />
      ),
      cell: ({ row }) => `${row.original.tax_rate}%`,
    },
    {
      accessorKey: 'service_charge_rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Service Charge" />
      ),
      cell: ({ row }) => `${row.original.service_charge_rate}%`,
    },
    {
      accessorKey: 'currency',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Currency" />
      ),
    },
    {
      accessorKey: 'timezone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Timezone" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.timezone}
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
              hidden: () => !isAdmin,
            },
            {
              label: 'Deactivate',
              icon: BanIcon,
              variant: 'destructive',
              separator: true,
              onClick: onDeactivate,
              hidden: (branch) => !isAdmin || !branch.is_active,
            },
          ]}
        />
      ),
    },
  ]
}
