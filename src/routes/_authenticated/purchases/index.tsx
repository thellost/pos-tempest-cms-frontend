import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { usePurchases, useReceivePurchase, useCancelPurchase } from '@/hooks/use-purchases'
import { useBranches } from '@/hooks/use-branches'
import { useSuppliers } from '@/hooks/use-suppliers'
import type { Purchase } from '@/lib/services/purchases'
import { getPurchaseColumns } from '@/components/purchases/columns'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatIDR } from '@/components/purchases/columns'
import { requireRole } from '@/lib/auth-guards'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/purchases/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: PurchasesPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function PurchasesPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '',
    supplier_id: '',
    status: '',
  })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Action dialogs
  const [receiveTarget, setReceiveTarget] = useState<Purchase | null>(null)
  const [receivePayment, setReceivePayment] = useState('')
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

  const receiveMutation = useReceivePurchase()
  const cancelMutation = useCancelPurchase()

  // Pre-fill payment amount when a receive target is selected
  useEffect(() => {
    if (receiveTarget) {
      const remaining = receiveTarget.total - (receiveTarget.paid_amount ?? 0)
      const amount = remaining > 0 ? remaining : receiveTarget.total
      setReceivePayment(String(amount))
    }
  }, [receiveTarget])

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
      <Dialog
        open={!!receiveTarget}
        onOpenChange={(open) => { if (!open) setReceiveTarget(null) }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {receiveTarget?.status === 'partial_received' ? 'Make Payment' : 'Mark as Received'}
            </DialogTitle>
            <DialogDescription>
              {receiveTarget?.status === 'partial_received'
                ? `Remaining: ${formatIDR((receiveTarget?.total ?? 0) - (receiveTarget?.paid_amount ?? 0))}`
                : `Record payment for ${receiveTarget?.purchase_number ?? 'this PO'}. Inventory will be updated on the first payment.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="receive-amount">Payment Amount (IDR)</Label>
              <Input
                id="receive-amount"
                type="text"
                inputMode="numeric"
                value={receivePayment}
                onChange={(e) => {
                  const str = e.target.value
                  if (str !== '' && !/^\d*\.?\d*$/.test(str)) return
                  setReceivePayment(str)
                }}
                onBlur={() => {
                  const n = parseFloat(receivePayment)
                  if (!isNaN(n)) setReceivePayment(String(n))
                }}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setReceiveTarget(null)}
                disabled={receiveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                disabled={receiveMutation.isPending || !receivePayment || parseFloat(receivePayment) <= 0}
                onClick={async () => {
                  if (!receiveTarget) return
                  await receiveMutation.mutateAsync({
                    id: receiveTarget.id,
                    payload: { paid_amount: parseFloat(receivePayment) || 0 },
                  })
                  setReceiveTarget(null)
                }}
              >
                {receiveMutation.isPending ? 'Saving…' : (
                  receiveTarget?.status === 'partial_received' ? 'Record Payment' : 'Mark Received'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
