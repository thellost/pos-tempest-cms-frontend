import { useMemo, useState, type ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import {
  ClockIcon,
  WalletIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  CreditCardIcon,
  CalendarIcon,
  UserIcon,
  MonitorIcon,
  BuildingIcon,
  SearchIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  ShoppingBagIcon,
} from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import { useShiftReport } from '@/hooks/use-statistics'
import { useShifts } from '@/hooks/use-shifts'
import { useBranches } from '@/hooks/use-branches'
import { PageHeader } from '@/components/page-header'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { requireRole } from '@/lib/auth-guards'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/reports/shifts')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: ShiftReportPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#10b981',
  debit_card: '#3b82f6',
  credit_card: '#8b5cf6',
  ewallet: '#f59e0b',
  qris: '#06b6d4',
  bank_transfer: '#f97316',
}

const FALLBACK_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#f97316',
  '#84cc16',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPaymentColor(method: string, index: number): string {
  return PAYMENT_COLORS[method] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function labelForPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    debit_card: 'Debit Card',
    credit_card: 'Credit Card',
    ewallet: 'E-Wallet',
    qris: 'QRIS',
    bank_transfer: 'Bank Transfer',
  }
  return labels[method] ?? method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const CASH_TX_REASON_LABELS: Record<string, string> = {
  owner_withdrawal: 'Owner Withdrawal',
  supply_purchase: 'Supply Purchase',
  staff_advance: 'Staff Advance',
  petty_cash: 'Petty Cash',
  tip_out: 'Tip Out',
  cash_deposit: 'Cash Deposit',
  change_refill: 'Change Refill',
  other: 'Other',
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM yyyy, HH:mm')
  } catch {
    return '—'
  }
}

function formatDuration(openedAt: string | null, closedAt: string | null): string {
  if (!openedAt || !closedAt) return 'Still Open'
  try {
    const mins = differenceInMinutes(parseISO(closedAt), parseISO(openedAt))
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  } catch {
    return '—'
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, className }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium text-right', className)}>{value}</span>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Empty / Placeholder ──────────────────────────────────────────────────────

function EmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <SearchIcon className="mb-4 size-10 text-muted-foreground/40" />
      <p className="text-base font-medium text-muted-foreground">No shift selected</p>
      <p className="mt-1 text-sm text-muted-foreground/70">
        Use the selector above to choose a shift and view its financial report.
      </p>
    </div>
  )
}

// ─── Shift Report Content ─────────────────────────────────────────────────────

interface ShiftReportContentProps {
  shiftId: number
}

function ShiftReportContent({ shiftId }: ShiftReportContentProps) {
  const { data, isLoading, isError } = useShiftReport(shiftId)

  if (isLoading) return <SectionSkeleton />

  if (isError || !data?.data) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-destructive">
        Failed to load shift report. Please try again.
      </div>
    )
  }

  const report = data.data
  const { shift } = report
  const payment_breakdown = report.payment_breakdown ?? []
  const cashDiff = shift.cash_difference ?? 0
  const diffPositive = cashDiff >= 0

  // Payment pie data
  const pieData = payment_breakdown.map((m, i) => ({
    name: labelForPaymentMethod(m.payment_method),
    value: m.total_amount,
    color: getPaymentColor(m.payment_method, i),
    pct: m.percentage?.toFixed(1) ?? '0.0',
  }))

  const paymentChartConfig = Object.fromEntries(
    payment_breakdown.map((m, i) => [
      m.payment_method,
      { label: labelForPaymentMethod(m.payment_method), color: getPaymentColor(m.payment_method, i) },
    ]),
  ) satisfies ChartConfig

  const grandTotal = payment_breakdown.reduce((s, m) => s + (m.total_amount ?? 0), 0)
  const grandCount = payment_breakdown.reduce((s, m) => s + (m.count ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Top row: Shift Info + Cash Drawer */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* ── Shift Info ── */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ClockIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Shift Info</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label={<><UserIcon className="mr-1 inline size-3.5" />Cashier</>}
              value={shift.user_name}
            />
            <Separator className="my-1" />
            <InfoRow
              label={<><MonitorIcon className="mr-1 inline size-3.5" />Device</>}
              value={shift.device_name}
            />
            <Separator className="my-1" />
            <InfoRow
              label={<><BuildingIcon className="mr-1 inline size-3.5" />Branch</>}
              value={shift.branch_name}
            />
            <Separator className="my-1" />
            <InfoRow
              label={<><CalendarIcon className="mr-1 inline size-3.5" />Opened At</>}
              value={formatDateTime(shift.opened_at)}
            />
            <Separator className="my-1" />
            <InfoRow
              label={<><CalendarIcon className="mr-1 inline size-3.5" />Closed At</>}
              value={formatDateTime(shift.closed_at)}
            />
            <Separator className="my-1" />
            <InfoRow label="Duration" value={formatDuration(shift.opened_at, shift.closed_at)} />
            <Separator className="my-1" />
            <InfoRow
              label="Status"
              value={
                shift.status === 'open' ? (
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500">Open</Badge>
                ) : (
                  <Badge variant="secondary">Closed</Badge>
                )
              }
            />
          </CardContent>
        </Card>

        {/* ── Cash Drawer ── */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <WalletIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Cash Drawer</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Opening Cash" value={formatIDR(shift.opening_cash)} />
            <Separator className="my-1" />
            <InfoRow
              label="Cash Sales"
              value={
                <span className="text-emerald-600">
                  +{formatIDR(
                    payment_breakdown.find((p) => p.payment_method === 'cash')?.total_amount ?? 0,
                  )}
                </span>
              }
            />

            {/* Individual cash transactions */}
            {report.cash_transactions?.length > 0 && (
              <>
                <Separator className="my-2" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Cash Transactions
                </p>
                {report.cash_transactions.map((tx) => {
                  const isCashIn = tx.type === 'cash_in'
                  return (
                    <div key={tx.id}>
                      <InfoRow
                        label={
                          <span className="flex items-center gap-1.5">
                            {isCashIn ? (
                              <ArrowDownCircleIcon className="size-3.5 text-emerald-500" />
                            ) : (
                              <ArrowUpCircleIcon className="size-3.5 text-destructive" />
                            )}
                            {CASH_TX_REASON_LABELS[tx.reason] ?? tx.reason}
                          </span>
                        }
                        value={
                          <span className={isCashIn ? 'text-emerald-600' : 'text-destructive'}>
                            {isCashIn ? '+' : '-'}{formatIDR(tx.amount)}
                          </span>
                        }
                      />
                      <Separator className="my-1" />
                    </div>
                  )
                })}
                {report.total_cash_in > 0 && (
                  <InfoRow
                    label="Total Cash In"
                    value={
                      <span className="font-medium text-emerald-600">
                        +{formatIDR(report.total_cash_in)}
                      </span>
                    }
                  />
                )}
                {report.total_cash_out > 0 && (
                  <InfoRow
                    label="Total Cash Out"
                    value={
                      <span className="font-medium text-destructive">
                        -{formatIDR(report.total_cash_out)}
                      </span>
                    }
                  />
                )}
              </>
            )}

            {report.total_po_expenses > 0 && (
              <>
                <Separator className="my-1" />
                <InfoRow
                  label="PO Expenses"
                  value={
                    <span className="font-medium text-amber-600">
                      -{formatIDR(report.total_po_expenses)}
                    </span>
                  }
                />
              </>
            )}

            <Separator className="my-2 border-foreground/20" />
            <InfoRow
              label="Net Cash Movement"
              value={
                <span className={cn('font-semibold', report.net_cash_movement >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                  {report.net_cash_movement >= 0 ? '+' : ''}{formatIDR(report.net_cash_movement)}
                </span>
              }
            />
            <Separator className="my-2 border-foreground/20" />
            <InfoRow
              label="Expected Cash"
              value={
                <span className="font-semibold">
                  {shift.expected_cash != null ? formatIDR(shift.expected_cash) : '—'}
                </span>
              }
            />
            <Separator className="my-1" />
            <InfoRow
              label="Actual Cash"
              value={shift.closing_cash != null ? formatIDR(shift.closing_cash) : <span className="text-muted-foreground">Not closed</span>}
            />
            <Separator className="my-1" />
            <InfoRow
              label="Difference"
              value={
                shift.cash_difference != null ? (
                  <span className={cn('font-semibold', diffPositive ? 'text-emerald-600' : 'text-destructive')}>
                    {diffPositive ? '+' : ''}{formatIDR(cashDiff)}
                  </span>
                ) : '—'
              }
            />
            {shift.cash_difference != null && !diffPositive && (
              <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Cash drawer is short. Verify count and investigate missing amount.
              </p>
            )}
            {shift.cash_difference != null && diffPositive && cashDiff > 0 && (
              <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Cash drawer has a surplus of {formatIDR(cashDiff)}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second row: Order Summary + Revenue */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* ── Order Summary ── */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShoppingCartIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow
              label="Total Orders"
              value={<span className="text-lg font-bold">{report.total_orders.toLocaleString('id-ID')}</span>}
            />
            <Separator className="my-1" />
            <InfoRow
              label="Completed"
              value={
                <span className="font-medium text-emerald-600">
                  {report.completed_orders.toLocaleString('id-ID')}
                </span>
              }
            />
            <Separator className="my-1" />
            <InfoRow
              label="Cancelled"
              value={
                <span className={cn('font-medium', report.cancelled_orders > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                  {report.cancelled_orders.toLocaleString('id-ID')}
                </span>
              }
            />
            <Separator className="my-1" />
            <InfoRow
              label="Voided"
              value={
                <span className={cn('font-medium', report.voided_orders > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {report.voided_orders.toLocaleString('id-ID')}
                </span>
              }
            />
          </CardContent>
        </Card>

        {/* ── Revenue ── */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <TrendingUpIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label="Gross Revenue" value={formatIDR(report.gross_revenue)} />
            <Separator className="my-1" />
            <InfoRow
              label="Discounts"
              value={
                <span className={report.total_discounts > 0 ? 'text-amber-600' : ''}>
                  {report.total_discounts > 0 ? `− ` : ''}{formatIDR(report.total_discounts)}
                </span>
              }
            />
            <Separator className="my-1" />
            <InfoRow label="Tax" value={formatIDR(report.total_tax)} />
            <Separator className="my-1" />
            <InfoRow label="Service Charge" value={formatIDR(report.total_service_charge)} />
            <Separator className="my-2 border-foreground/20" />
            <InfoRow
              label="Net Revenue"
              value={
                <span className="text-lg font-bold text-emerald-600">
                  {formatIDR(report.net_revenue)}
                </span>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders */}
      {report.po_expenses && report.po_expenses.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ShoppingBagIcon className="size-5 text-muted-foreground" />
            <CardTitle className="text-base">Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">PO Number</th>
                    <th className="pb-2 pr-4 font-medium">Supplier</th>
                    <th className="pb-2 pr-4 font-medium">Received By</th>
                    <th className="pb-2 pr-4 font-medium">Received At</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.po_expenses.map((po) => (
                    <tr key={po.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{po.purchase_number}</td>
                      <td className="py-2 pr-4">{po.supplier_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{po.received_by_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{formatDateTime(po.received_at)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-amber-600">
                        {formatIDR(po.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2">
                  <tr>
                    <td colSpan={4} className="pt-2 font-semibold">Total PO Expenses</td>
                    <td className="pt-2 text-right tabular-nums font-bold text-amber-600">
                      {formatIDR(report.total_po_expenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <CreditCardIcon className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {payment_breakdown.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No payment data recorded for this shift.
            </div>
          ) : (
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              {/* Donut chart */}
              <div className="shrink-0 md:w-56">
                <ChartContainer config={paymentChartConfig} className="aspect-square w-full max-w-64 mx-auto">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="42%"
                      outerRadius="70%"
                      dataKey="value"
                      paddingAngle={2}
                      label={({ name, pct }) => `${name} ${pct}%`}
                      labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [formatIDR(value as number), 'Amount']}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Payment Method</th>
                      <th className="pb-2 pr-4 text-right font-medium">Txns</th>
                      <th className="pb-2 pr-4 text-right font-medium">Amount</th>
                      <th className="pb-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment_breakdown.map((m, i) => (
                      <tr key={m.payment_method} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-3 rounded-full shrink-0"
                              style={{ backgroundColor: getPaymentColor(m.payment_method, i) }}
                            />
                            {labelForPaymentMethod(m.payment_method)}
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {m.count.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatIDR(m.total_amount)}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="secondary">{m.percentage?.toFixed(1) ?? '0.0'}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr>
                      <td className="pt-2 pr-4 font-semibold">Total</td>
                      <td className="pt-2 pr-4 text-right tabular-nums font-semibold">
                        {grandCount.toLocaleString('id-ID')}
                      </td>
                      <td className="pt-2 pr-4 text-right tabular-nums font-semibold">
                        {formatIDR(grandTotal)}
                      </td>
                      <td className="pt-2 text-right">
                        <Badge>100%</Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Shift Selector ───────────────────────────────────────────────────────────

interface ShiftSelectorProps {
  selectedShiftId: number | null
  onSelect: (id: number | null) => void
}

function ShiftSelector({ selectedShiftId, onSelect }: ShiftSelectorProps) {
  const [branchId, setBranchId] = useState<number | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: branches } = useBranches()
  const { data: shifts, isFetching } = useShifts({
    branchId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    pageSize: 100,
  })

  const shiftList = useMemo(() => shifts?.data ?? [], [shifts])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Select Shift</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          {/* Branch filter */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Branch</Label>
            <Select
              value={branchId?.toString() ?? 'all'}
              onValueChange={(v) => {
                setBranchId(v === 'all' ? undefined : Number(v))
                onSelect(null)
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {(branches?.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="w-36"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                onSelect(null)
              }}
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="w-36"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                onSelect(null)
              }}
            />
          </div>

          {/* Shift select */}
          <div className="flex flex-col gap-1 min-w-64 flex-1">
            <Label className="text-xs">Shift</Label>
            <Select
              value={selectedShiftId?.toString() ?? ''}
              onValueChange={(v) => onSelect(v ? Number(v) : null)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isFetching ? 'Loading shifts…' : 'Choose a shift…'} />
              </SelectTrigger>
              <SelectContent>
                {shiftList.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {isFetching ? 'Loading…' : 'No shifts found. Adjust filters.'}
                  </div>
                ) : (
                  shiftList.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id.toString()}
                      textValue={`#${s.id} ${s.user_name} · ${s.branch_name} · ${format(parseISO(s.opened_at), 'dd MMM yyyy')}${s.status === 'open' ? ' (Open)' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">#{s.id}</span>
                        <span>{s.user_name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{s.branch_name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(s.opened_at), 'dd MMM yyyy')}
                        </span>
                        {s.status === 'open' && (
                          <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1 py-0 hover:bg-amber-500">
                            Open
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ShiftReportPage() {
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Financial Report"
        description="View detailed revenue, cash drawer, and payment breakdowns for any shift."
      />

      <ShiftSelector selectedShiftId={selectedShiftId} onSelect={setSelectedShiftId} />

      {selectedShiftId == null ? (
        <EmptyPlaceholder />
      ) : (
        <ShiftReportContent shiftId={selectedShiftId} />
      )}
    </div>
  )
}
