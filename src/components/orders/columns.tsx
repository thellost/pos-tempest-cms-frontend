import type { ColumnDef } from '@tanstack/react-table'
import { EyeIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/lib/services/orders'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatIDR(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateStr: string | null | undefined): React.ReactNode {
  if (!dateStr) return <span className="text-muted-foreground">—</span>
  return (
    <span className="text-sm text-muted-foreground">
      {new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetOrderColumnsOptions {
  onViewDetail: (order: Order) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getOrderColumns({
  onViewDetail,
}: GetOrderColumnsOptions): ColumnDef<Order>[] {
  return [
    {
      accessorKey: 'order_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Order Number" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {row.original.order_number}
        </span>
      ),
    },
    {
      accessorKey: 'branch_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.branch_name}
        </span>
      ),
    },
    {
      accessorKey: 'table_number',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Table" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.table_number ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      accessorKey: 'cashier_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cashier" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.cashier_name}</span>
      ),
    },
    {
      accessorKey: 'customer_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.customer_name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'order_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {ORDER_TYPE_LABELS[row.original.order_type] ?? row.original.order_type}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'payment_status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Payment" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.payment_status} />,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold">{formatIDR(row.original.total)}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: 'View Detail',
              icon: EyeIcon,
              onClick: onViewDetail,
            },
          ]}
        />
      ),
    },
  ]
}
