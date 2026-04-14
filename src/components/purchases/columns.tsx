import type { ColumnDef } from '@tanstack/react-table'
import { EyeIcon, XCircleIcon, CheckCircleIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import type { Purchase } from '@/lib/services/purchases'

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

function formatDate(dateStr: string | null | undefined): React.ReactNode {
  if (!dateStr) return <span className="text-muted-foreground">—</span>
  return (
    <span className="text-sm text-muted-foreground">
      {new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetPurchaseColumnsOptions {
  onViewDetail: (purchase: Purchase) => void
  onReceive: (purchase: Purchase) => void
  onCancel: (purchase: Purchase) => void
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getPurchaseColumns({
  onViewDetail,
  onReceive,
  onCancel,
}: GetPurchaseColumnsOptions): ColumnDef<Purchase>[] {
  return [
    {
      accessorKey: 'purchase_number',
      meta: { mobileTitle: true, mobileLabel: 'PO Number' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PO Number" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {row.original.purchase_number}
        </span>
      ),
    },
    {
      accessorKey: 'supplier_name',
      meta: { mobileOrder: 1, mobileLabel: 'Supplier' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Supplier" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.supplier_name}</span>
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
      accessorKey: 'ordered_by_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ordered By" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.ordered_by_name}</span>
      ),
    },
    {
      accessorKey: 'subtotal',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subtotal" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{formatIDR(row.original.subtotal)}</span>
      ),
    },
    {
      accessorKey: 'tax_amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tax" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatIDR(row.original.tax_amount)}
        </span>
      ),
    },
    {
      accessorKey: 'total',
      meta: { mobileOrder: 3, mobileLabel: 'Total' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold">{formatIDR(row.original.total)}</span>
      ),
    },
    {
      accessorKey: 'status',
      meta: { mobileOrder: 2, mobileLabel: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'ordered_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created At" />
      ),
      cell: ({ row }) => formatDate(row.original.ordered_at),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const po = row.original
        const isOrdered = po.status === 'ordered'
        const isPartialReceived = po.status === 'partial_received'
        const canReceive = isOrdered || isPartialReceived
        return (
          <DataTableRowActions
            row={row}
            actions={[
              {
                label: 'View Detail',
                icon: EyeIcon,
                onClick: onViewDetail,
              },
              ...(canReceive
                ? [
                    {
                      label: isOrdered ? 'Mark Received' : 'Make Payment',
                      icon: CheckCircleIcon,
                      onClick: onReceive,
                    },
                    {
                      label: 'Cancel',
                      icon: XCircleIcon,
                      onClick: onCancel,
                    },
                  ]
                : []),
            ]}
          />
        )
      },
    },
  ]
}
