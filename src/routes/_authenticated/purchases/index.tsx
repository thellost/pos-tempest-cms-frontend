import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePurchases, useCancelPurchase, useSuppliers } from '@/hooks/use-sales-cash-flow'
import { useBranches } from '@/hooks/use-branches'
import type { Purchase } from '@/lib/services/sales-cash-flow'
import { getPurchaseColumns } from '@/components/purchases/columns'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RecordPaymentDialog } from '@/components/purchases/record-payment-dialog'
import { requireRole } from '@/lib/auth-guards'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/purchases/')({
  validateSearch: (search: Record<string, unknown>) => ({
    date_from: typeof search.date_from === 'string' ? search.date_from : undefined,
    date_to: typeof search.date_to === 'string' ? search.date_to : undefined,
  }),
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: PurchasesPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function PurchasesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()
  const { date_from: searchDateFrom, date_to: searchDateTo } = Route.useSearch()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '',
    supplier_id: '',
    status: '',
  })
  const [dateFrom, setDateFrom] = useState(searchDateFrom ?? '')
  const [dateTo, setDateTo] = useState(searchDateTo ?? '')

  // Action dialogs
  const [receiveTarget, setReceiveTarget] = useState<Purchase | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null)

  // Filter option data
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const { data: suppliersData } = useSuppliers({ pageSize: 100 })

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const supplierOptions = useMemo(
    () =>
      (suppliersData?.data ?? []).map((s) => ({
        value: String(s.id),
        label: s.name,
      })),
    [suppliersData],
  )

  // Build query from filters
  const queryFilters = useMemo(
    () => ({
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      supplierId: filterValues.supplier_id
        ? parseInt(filterValues.supplier_id, 10)
        : undefined,
      status: (filterValues.status || undefined) as
        | 'ordered'
        | 'partial_received'
        | 'received'
        | 'cancelled'
        | undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    }),
    [filterValues, dateFrom, dateTo, page, pageSize],
  )

  const { data, isLoading } = usePurchases(queryFilters)

  const cancelMutation = useCancelPurchase()

  const columns = useMemo(
    () =>
      getPurchaseColumns({
        onViewDetail: (po) =>
          navigate({
            to: '/purchases/$purchaseId',
            params: { purchaseId: String(po.id) },
          }),
        onReceive: (po) => setReceiveTarget(po),
        onCancel: (po) => setCancelTarget(po),
      }),
    [navigate],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterValues({
      branch_id: userBranchId ? String(userBranchId) : '',
      supplier_id: '',
      status: '',
    })
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Manage stock replenishment from suppliers."
        actions={
          <Button onClick={() => navigate({ to: '/purchases/create' })}>
            <PlusIcon className="mr-2 size-4" />
            New Purchase Order
          </Button>
        }
      />

      <FilterBar
        filters={[
          {
            type: 'select',
            key: 'supplier_id',
            label: 'Supplier',
            options: supplierOptions,
            allLabel: 'All suppliers',
          },
          {
            type: 'select',
            key: 'branch_id',
            label: 'Branch',
            options: branchOptions,
            allLabel: 'All branches',
          },
          {
            type: 'select',
            key: 'status',
            label: 'Status',
            options: [
              { value: 'ordered', label: 'Ordered' },
              { value: 'partial_received', label: 'Partial Received' },
              { value: 'received', label: 'Received' },
              { value: 'cancelled', label: 'Cancelled' },
            ],
            allLabel: 'All statuses',
          },
        ]}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      >
        {/* Date range */}
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
          <Input
            type="date"
            className="h-9 w-full min-w-[120px] text-sm"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
          />
          <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
          <Input
            type="date"
            className="h-9 w-full min-w-[120px] text-sm"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </FilterBar>

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
        initialColumnVisibility={isMobile ? { branch_name: false, ordered_by_name: false, subtotal: false, tax_amount: false } : {}}
        emptyMessage="No purchase orders found."
      />

      {/* ── Receive / Payment Dialog ── */}
      <RecordPaymentDialog
        purchase={receiveTarget}
        open={!!receiveTarget}
        onOpenChange={(open) => { if (!open) setReceiveTarget(null) }}
      />

      {/* ── Cancel Confirm Dialog ── */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => { if (!open) setCancelTarget(null) }}
        title="Cancel Purchase Order?"
        description={`Are you sure you want to cancel ${cancelTarget?.purchase_number ?? 'this PO'}? This action cannot be undone.`}
        confirmLabel="Cancel PO"
        variant="destructive"
        isLoading={cancelMutation.isPending}
        onConfirm={async () => {
          if (!cancelTarget) return
          await cancelMutation.mutateAsync(cancelTarget.id)
          setCancelTarget(null)
        }}
      />
    </div>
  )
}
