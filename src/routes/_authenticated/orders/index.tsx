import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronDownIcon, ChevronUpIcon, SearchIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useOrders } from '@/hooks/use-orders'
import { useBranches } from '@/hooks/use-branches'
import { useUsers } from '@/hooks/use-users'
import { useCustomers } from '@/hooks/use-customers'
import { useTables } from '@/hooks/use-tables'
import { useShifts } from '@/hooks/use-shifts'
import type { Order } from '@/lib/services/orders'
import { getOrderColumns } from '@/components/orders/columns'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useDebounce } from '@/hooks/use-debounce'
import { requireRole } from '@/lib/auth-guards'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/orders/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: OrdersPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'served', label: 'Served' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
]

const ORDER_TYPE_OPTIONS = [
  { value: 'dine_in', label: 'Dine In' },
  { value: 'takeaway', label: 'Takeaway' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrdersPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter panel visibility
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [branchId, setBranchId] = useState(
    userBranchId ? String(userBranchId) : '',
  )
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [orderType, setOrderType] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [tableId, setTableId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Filter option data
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const { data: usersData } = useUsers({ pageSize: 100 })
  const { data: customersData } = useCustomers({ pageSize: 200 })
  const { data: tablesData } = useTables({ pageSize: 200 })
  const { data: shiftsData } = useShifts({ pageSize: 100 })

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const cashierOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((u) => ({
        value: String(u.id),
        label: u.name,
      })),
    [usersData],
  )

  const customerOptions = useMemo(
    () =>
      (customersData?.data ?? []).map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [customersData],
  )

  const tableOptions = useMemo(
    () =>
      (tablesData?.data ?? []).map((t) => ({
        value: String(t.id),
        label: `${t.table_number}${t.floor_area_name ? ` (${t.floor_area_name})` : ''}`,
      })),
    [tablesData],
  )

  const shiftOptions = useMemo(
    () =>
      (shiftsData?.data ?? []).map((s) => ({
        value: String(s.id),
        label: `#${s.id} — ${s.user_name}`,
      })),
    [shiftsData],
  )

  // Build query from filter state
  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      status: (status || undefined) as
        | 'pending'
        | 'confirmed'
        | 'preparing'
        | 'ready'
        | 'served'
        | 'completed'
        | 'cancelled'
        | undefined,
      paymentStatus: (paymentStatus || undefined) as
        | 'unpaid'
        | 'partial'
        | 'paid'
        | 'refunded'
        | undefined,
      orderType: (orderType || undefined) as 'dine_in' | 'takeaway' | undefined,
      cashierId: cashierId ? parseInt(cashierId, 10) : undefined,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
      shiftId: shiftId ? parseInt(shiftId, 10) : undefined,
      tableId: tableId ? parseInt(tableId, 10) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    }),
    [
      debouncedSearch,
      branchId,
      status,
      paymentStatus,
      orderType,
      cashierId,
      customerId,
      shiftId,
      tableId,
      dateFrom,
      dateTo,
      page,
      pageSize,
    ],
  )

  const { data, isLoading } = useOrders(queryFilters)

  // Reset to page 1 when debounced search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const hasActiveFilters = !!(
    search ||
    branchId ||
    status ||
    paymentStatus ||
    orderType ||
    cashierId ||
    customerId ||
    shiftId ||
    tableId ||
    dateFrom ||
    dateTo
  )

  function clearFilters() {
    setSearch('')
    setBranchId(userBranchId ? String(userBranchId) : '')
    setStatus('')
    setPaymentStatus('')
    setOrderType('')
    setCashierId('')
    setCustomerId('')
    setShiftId('')
    setTableId('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const columns = useMemo(
    () =>
      getOrderColumns({
        onViewDetail: (order: Order) =>
          navigate({ to: '/orders/$orderId', params: { orderId: String(order.id) } }),
      }),
    [navigate],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Read-only view of all orders processed through the POS."
      />

      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersExpanded((v) => !v)}
          className={cn(hasActiveFilters && 'border-primary text-primary')}
        >
          Filters
          {filtersExpanded ? (
            <ChevronUpIcon className="ml-2 size-4" />
          ) : (
            <ChevronDownIcon className="ml-2 size-4" />
          )}
          {hasActiveFilters && (
            <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              !
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Collapsible filter panel */}
      {filtersExpanded && (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs">Branch</Label>
              <Select
                value={branchId || '_all'}
                onValueChange={(v) => {
                  setBranchId(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All branches</SelectItem>
                  {branchOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Order Status</Label>
              <Select
                value={status || '_all'}
                onValueChange={(v) => {
                  setStatus(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All statuses</SelectItem>
                  {ORDER_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Status</Label>
              <Select
                value={paymentStatus || '_all'}
                onValueChange={(v) => {
                  setPaymentStatus(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All payment statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All payment statuses</SelectItem>
                  {PAYMENT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Order Type</Label>
              <Select
                value={orderType || '_all'}
                onValueChange={(v) => {
                  setOrderType(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All types</SelectItem>
                  {ORDER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cashier */}
            <div className="space-y-1.5">
              <Label className="text-xs">Cashier</Label>
              <Select
                value={cashierId || '_all'}
                onValueChange={(v) => {
                  setCashierId(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All cashiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All cashiers</SelectItem>
                  {cashierOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer */}
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Select
                value={customerId || '_all'}
                onValueChange={(v) => {
                  setCustomerId(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All customers</SelectItem>
                  {customerOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Shift */}
            <div className="space-y-1.5">
              <Label className="text-xs">Shift</Label>
              <Select
                value={shiftId || '_all'}
                onValueChange={(v) => {
                  setShiftId(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All shifts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All shifts</SelectItem>
                  {shiftOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="space-y-1.5">
              <Label className="text-xs">Table</Label>
              <Select
                value={tableId || '_all'}
                onValueChange={(v) => {
                  setTableId(v === '_all' ? '' : v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All tables</SelectItem>
                  {tableOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Date range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
                className="h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Data table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
         meta={data?.meta}
        pagination={{ page, pageSize }}
        initialColumnVisibility={isMobile ? { branch_name: false, cashier_name: false, customer_name: false, created_at: false } : {}}
        onPaginationChange={({ page: p, pageSize: ps }) => {
          setPage(p)
          setPageSize(ps)
        }}
      />
    </div>
  )
}
