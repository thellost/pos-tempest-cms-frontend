import type { ColumnDef } from '@tanstack/react-table'
import { BanIcon, PencilIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import type { CashTransactionReason } from '@/lib/services/cash-reasons'

interface GetCashReasonColumnsOptions {
  onEdit: (reason: CashTransactionReason) => void
  onDeactivate: (reason: CashTransactionReason) => void
  canEdit: boolean
}

const TYPE_LABEL: Record<string, string> = {
  cash_in: 'Cash In',
  cash_out: 'Cash Out',
}

export function getCashReasonColumns({
  onEdit,
  onDeactivate,
  canEdit,
}: GetCashReasonColumnsOptions): ColumnDef<CashTransactionReason>[] {
  return [
    {
      accessorKey: 'label',
      meta: { mobileTitle: true, mobileLabel: 'Label' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Label" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.label}</span>
      ),
    },
    {
      accessorKey: 'key',
      meta: { mobileOrder: 1, mobileLabel: 'Key' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Key" />
      ),
      cell: ({ row }) => (
        <code className="text-xs bg-muted rounded px-1 py-0.5">
          {row.original.key}
        </code>
      ),
    },
    {
      accessorKey: 'type',
      meta: { mobileOrder: 2, mobileLabel: 'Type' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.original.type
        if (!type) return <Badge variant="secondary">Both</Badge>
        return (
          <Badge
            variant="secondary"
            className={
              type === 'cash_in'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400'
            }
          >
            {TYPE_LABEL[type]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'sort_order',
      meta: { mobileOrder: 3, mobileLabel: 'Order' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sort_order}
        </span>
      ),
    },
    {
      accessorKey: 'is_active',
      meta: { mobileOrder: 4, mobileLabel: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_active ? 'active' : 'inactive'}
        />
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
              hidden: () => !canEdit,
            },
            {
              label: 'Deactivate',
              icon: BanIcon,
              variant: 'destructive',
              separator: true,
              onClick: onDeactivate,
              hidden: (reason) => !canEdit || !reason.is_active,
            },
          ]}
        />
      ),
    },
  ]
}
