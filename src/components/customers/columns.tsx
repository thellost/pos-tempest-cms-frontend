import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, UserIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Customer } from '@/lib/services/customers'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetCustomerColumnsOptions {
  onView: (customer: Customer) => void
  onEdit: (customer: Customer) => void
  /** True when the current user has admin or manager role */
  canManage: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getCustomerColumns({
  onView,
  onEdit,
  canManage,
}: GetCustomerColumnsOptions): ColumnDef<Customer>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserIcon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{customer.name}</p>
              {customer.email && (
                <p className="truncate text-xs text-muted-foreground">
                  {customer.email}
                </p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) =>
        row.original.phone ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'loyalty_points',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Points" />
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {row.original.loyalty_points.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'total_visits',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Visits" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.total_visits}</span>
      ),
    },
    {
      accessorKey: 'total_spent',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total Spent" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {formatCurrency(row.original.total_spent)}
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
              label: 'View Details',
              icon: UserIcon,
              onClick: onView,
            },
            {
              label: 'Edit',
              icon: PencilIcon,
              onClick: onEdit,
              hidden: () => !canManage,
            },
          ]}
        />
      ),
    },
  ]
}
