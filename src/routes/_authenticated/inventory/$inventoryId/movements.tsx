import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useInventoryMovements } from '@/hooks/use-inventory'
import { getMovementColumns } from '@/components/inventory/movement-columns'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { requireRole } from '@/lib/auth-guards'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  '/_authenticated/inventory/$inventoryId/movements',
)({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: MovementHistoryPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function MovementHistoryPage() {
  const { inventoryId } = Route.useParams()
  const id = parseInt(inventoryId, 10)

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const filters = useMemo(() => ({ page, pageSize }), [page, pageSize])

  const { data, isLoading } = useInventoryMovements(id, filters)

  const columns = useMemo(() => getMovementColumns(), [])

  // Try to get a display name from the first row
  const firstRow = data?.data?.[0]
  const pageTitle = firstRow
    ? `Movement History`
    : 'Movement History'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/inventory">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to Inventory</span>
          </Link>
        </Button>
        <PageHeader
          title={pageTitle}
          description={`Stock movement history for inventory #${inventoryId}.`}
        />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        pagination={{ page, pageSize }}
        onPaginationChange={({ page: p, pageSize: ps }) => {
          setPage(p)
          setPageSize(ps)
        }}
        emptyMessage="No movement records found for this inventory item."
      />
    </div>
  )
}
