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
      meta: { mobileTitle: true, mobileLabel: 'Branch' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'address',
      meta: { mobileHidden: true },
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
      meta: { mobileOrder: 1, mobileLabel: 'Phone' },
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
      meta: { mobileOrder: 2, mobileLabel: 'Currency' },
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
      id: 'hours',
      meta: { mobileHidden: true },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hours" />
      ),
      cell: ({ row }) => {
        const { opening_time, closing_time, auto_shift } = row.original
        if (!opening_time || !closing_time) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-sm text-muted-foreground">
            {opening_time}–{closing_time}
            {!auto_shift && (
              <span className="ml-1 text-xs text-muted-foreground/60">(manual)</span>
            )}
          </span>
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
