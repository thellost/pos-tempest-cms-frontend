import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Branch } from '@/lib/services/branches'


// ─── Props ────────────────────────────────────────────────────────────────────

interface GetTaxConfigColumnsOptions {
  onEdit: (branch: Branch) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getTaxConfigColumns({
  onEdit,
}: GetTaxConfigColumnsOptions): ColumnDef<Branch>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'tax_rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tax Rate" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.tax_rate.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
          %
        </span>
      ),
    },
    {
      accessorKey: 'service_charge_rate',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Service Charge" />
      ),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.service_charge_rate.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}
          %
        </span>
      ),
    },
    {
      accessorKey: 'currency',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Currency" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.currency}</span>
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
          ]}
        />
      ),
    },
  ]
}
