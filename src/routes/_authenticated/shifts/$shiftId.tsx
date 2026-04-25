import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  LockIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  ShoppingBagIcon,
} from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import {
  useShift,
  useCloseShift,
} from '@/hooks/use-shifts'
import { useShiftReport } from '@/hooks/use-statistics'
import { useAppForm } from '@/hooks/use-form'
import type { CloseShiftPayload } from '@/lib/services/shifts'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/shifts/$shiftId')({
  component: ShiftDetailPage,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatIDR = (value: number | null | undefined) => {
  if (value == null) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(value)}`
}

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  debit_card: 'Debit Card',
  credit_card: 'Credit Card',
  qris: 'QRIS',
  bank_transfer: 'Bank Transfer',
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

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function ShiftDetailPage() {
  const { shiftId } = Route.useParams()
  const id = shiftId

  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  const { data: shiftResult, isLoading: shiftLoading } = useShift(id)
  const { data: reportResult, isLoading: reportLoading } = useShiftReport(id)

  const report = reportResult?.data
  const shift = shiftResult?.data ?? report?.shift
  const cashTransactions = report?.cash_transactions ?? []

  const isLoading = shiftLoading || reportLoading

  // ── Pie chart data ──────────────────────────────────────────────────────────

  const chartData: {
    name: string
    value: number
    count: number
    percentage: number
    fill: string
  }[] =
    report?.payment_breakdown?.map((item, i) => ({
      name: item.payment_method,
      value: item.total_amount,
      count: item.count,
      percentage: item.percentage,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })) ?? []

  const chartConfig: ChartConfig = Object.fromEntries(
    (report?.payment_breakdown ?? []).map((item, i) => [
      item.payment_method,
      {
        label: PAYMENT_LABELS[item.payment_method] ?? item.payment_method,
        color: CHART_COLORS[i % CHART_COLORS.length],
      },
    ]),
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <ShiftDetailSkeleton />
  }

  if (!shift) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Shift not found.
      </div>
    )
  }

  const cashDiff = shift?.cash_difference ?? null

  const cashDiffPositive = cashDiff !== null && cashDiff >= 0

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/shifts">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title={`Shift #${shift.id}`}
          description={`${shift.user_name} · ${shift.device_name} · ${shift.branch_name}`}
          actions={
            shift.status === 'open' ? (
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setCloseDialogOpen(true)}
              >
                <LockIcon className="mr-2 size-4" />
                Close Shift
              </Button>
            ) : null
          }
        />
      </div>

      {/* Status pill row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <StatusBadge status={shift.status} />
        <span>Opened: {formatDate(shift.opened_at)}</span>
        {shift.closed_at && <span>Closed: {formatDate(shift.closed_at)}</span>}
      </div>

      {/* ── Cards grid ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Shift Info */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Cashier" value={shift.user_name} />
            <InfoRow label="Device" value={shift.device_name} />
            <InfoRow label="Branch" value={shift.branch_name} />
            <InfoRow
              label="Status"
              value={<StatusBadge status={shift.status} />}
            />
            <Separator />
            <InfoRow label="Opening Cash" value={formatIDR(shift.opening_cash)} />
            {shift.closing_cash != null && (
              <InfoRow
                label="Closing Cash"
                value={formatIDR(shift.closing_cash)}
              />
            )}
            {shift.notes && (
              <InfoRow label="Notes" value={shift.notes} />
            )}
          </CardContent>
        </Card>

        {/* Order Summary */}
        {report && (
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Total Orders"
                value={report.total_orders.toLocaleString('id-ID')}
              />
              <InfoRow
                label="Completed"
                value={
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {report.completed_orders.toLocaleString('id-ID')}
                  </span>
                }
              />
              {report.cancelled_orders > 0 && (
                <InfoRow
                  label="Cancelled"
                  value={
                    <span className="text-destructive">
                      {report.cancelled_orders.toLocaleString('id-ID')}
                    </span>
                  }
                />
              )}
              {report.voided_orders > 0 && (
                <InfoRow
                  label="Voided"
                  value={
                    <span className="text-destructive">
                      {report.voided_orders.toLocaleString('id-ID')}
                    </span>
                  }
                />
              )}
              <Separator />
              <InfoRow
                label="Gross Revenue"
                value={formatIDR(report.gross_revenue)}
              />
              <InfoRow
                label="Discounts"
                value={formatIDR(report.total_discounts)}
              />
              <InfoRow label="Tax" value={formatIDR(report.total_tax)} />
              <InfoRow
                label="Service Charge"
                value={formatIDR(report.total_service_charge)}
              />
              <Separator />
              <InfoRow
                label="Net Revenue"
                value={
                  <span className="font-semibold">
                    {formatIDR(report.net_revenue)}
                  </span>
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Cash Drawer Summary */}
        {report && (
          <Card>
            <CardHeader>
              <CardTitle>Cash Drawer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Opening Cash"
                value={formatIDR(shift?.opening_cash)}
              />
              <Separator />
              <InfoRow
                label="Cash Sales"
                value={
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{formatIDR(
                      (report.payment_breakdown ?? []).find(
                        (p) => p.payment_method === 'cash',
                      )?.total_amount ?? 0,
                    )}
                  </span>
                }
              />

              {/* Individual cash transactions */}
              {cashTransactions.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Cash Transactions
                  </p>
                  {cashTransactions.map((tx) => {
                    const isCashIn = tx.type === 'cash_in'
                    return (
                      <InfoRow
                        key={tx.id}
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
                          <span
                            className={
                              isCashIn
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-destructive'
                            }
                          >
                            {isCashIn ? '+' : '-'}
                            {formatIDR(tx.amount)}
                          </span>
                        }
                      />
                    )
                  })}
                </>
              )}

              {/* Totals */}
              {(report.total_cash_in > 0 || report.total_cash_out > 0 || report.total_po_expenses > 0) && (
                <>
                  <Separator />
                  {report.total_cash_in > 0 && (
                    <InfoRow
                      label="Total Cash In"
                      value={
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
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
                  {report.total_po_expenses > 0 && (
                    <InfoRow
                      label="PO Expenses"
                      value={
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          -{formatIDR(report.total_po_expenses)}
                        </span>
                      }
                    />
                  )}
                </>
              )}
              <Separator />
              <InfoRow
                label="Net Cash Movement"
                value={
                  <span
                    className={cn(
                      'font-semibold',
                      report.net_cash_movement >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-destructive',
                    )}
                  >
                    {report.net_cash_movement >= 0 ? '+' : ''}
                    {formatIDR(report.net_cash_movement)}
                  </span>
                }
              />

              <Separator />
              <InfoRow
                label="Expected Cash"
                value={
                  <span className="font-semibold">
                    {formatIDR(shift?.expected_cash)}
                  </span>
                }
              />
              {shift?.closing_cash != null && (
                <>
                  <InfoRow
                    label="Actual Cash"
                    value={formatIDR(shift.closing_cash)}
                  />
                  <InfoRow
                    label="Difference"
                    value={
                      <span
                        className={cn(
                          'font-semibold',
                          cashDiff === null
                            ? 'text-muted-foreground'
                            : cashDiffPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-destructive',
                        )}
                      >
                        {cashDiff !== null
                          ? `${cashDiff >= 0 ? '+' : ''}${formatIDR(cashDiff)}`
                          : '—'}
                      </span>
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Payment Breakdown Pie Chart ─────────────────────────────────── */}
      {report && chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {/* Pie */}
              <ChartContainer
                config={chartConfig}
                className="aspect-square h-[240px] w-full max-w-[240px] shrink-0"
              >
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          formatIDR(Number(value)),
                          PAYMENT_LABELS[name as string] ?? name,
                        ]}
                      />
                    }
                  />
                </PieChart>
              </ChartContainer>

              {/* Legend table */}
              <div className="w-full space-y-2 text-sm">
                {(report.payment_breakdown ?? []).map((item, i) => (
                  <div
                    key={item.payment_method}
                    className="flex items-center justify-between gap-4 rounded-md px-3 py-2 odd:bg-muted/40"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="font-medium">
                        {PAYMENT_LABELS[item.payment_method] ??
                          item.payment_method}
                      </span>
                      <span className="text-muted-foreground">
                        ×{item.count}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold tabular-nums">
                        {formatIDR(item.total_amount)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Cash Transactions ───────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Cash Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!cashTransactions.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No cash transactions recorded for this shift.
            </p>
          ) : (
            <div className="space-y-2">
              {cashTransactions.map((tx) => (
                <CashTransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Purchase Orders ─────────────────────────────────────────────── */}
      {report?.po_expenses && report.po_expenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBagIcon className="size-4 text-muted-foreground" />
              <CardTitle>Purchase Orders</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.po_expenses.map((po) => (
                <div
                  key={po.id}
                  className="flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {po.purchase_number}
                      </Badge>
                      <span className="font-medium">{po.supplier_name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Received by {po.received_by_name} · {formatDate(po.received_at)}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                    {formatIDR(po.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Close Shift Dialog ─────────────────────────────────────────── */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Shift #{shift.id}</DialogTitle>
          </DialogHeader>
          <CloseShiftForm
            key={closeDialogOpen ? 'open' : 'closed'}
            shiftId={shift.id}
            onSuccess={() => setCloseDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ─── Cash Transaction Row ─────────────────────────────────────────────────────

function CashTransactionRow({ tx }: { tx: { id: string; type: string; reason: string; amount: number; note: string | null; created_at: string; user_name: string } }) {
  const isCashIn = tx.type === 'cash_in'
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm">
      <div className="flex min-w-0 items-start gap-2.5">
        {isCashIn ? (
          <ArrowDownCircleIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
        ) : (
          <ArrowUpCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={isCashIn ? 'default' : 'destructive'}
              className="text-xs"
            >
              {isCashIn ? 'Cash In' : 'Cash Out'}
            </Badge>
            <span className="font-medium">
              {CASH_TX_REASON_LABELS[tx.reason] ?? tx.reason}
            </span>
          </div>
          {tx.note && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {tx.note}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tx.user_name} · {formatDate(tx.created_at)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          'shrink-0 font-semibold tabular-nums',
          isCashIn
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-destructive',
        )}
      >
        {isCashIn ? '+' : '-'}
        {formatIDR(tx.amount)}
      </span>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: React.ReactNode
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function ShiftDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2, 3, 4].map((j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Close Shift Form ─────────────────────────────────────────────────────────

function CloseShiftForm({
  shiftId,
  onSuccess,
}: {
  shiftId: string
  onSuccess: () => void
}) {
  const closeMutation = useCloseShift()

  const form = useAppForm({
    defaultValues: {
      closing_cash: 0,
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const payload: CloseShiftPayload = {
        closing_cash: Number(value.closing_cash),
        notes: value.notes?.trim() || undefined,
      }
      await closeMutation.mutateAsync({ id: shiftId, payload })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4 pb-2"
    >
      <form.AppField
        name="closing_cash"
        validators={{
          onChange: ({ value }) => {
            if (value === undefined || value === ('' as unknown as number))
              return 'Closing cash is required'
            if (Number(value) < 0) return 'Must be 0 or more'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Closing Cash"
            prefix="Rp"
            min={0}
            step={1000}
            placeholder="0"
          />
        )}
      </form.AppField>

      <form.AppField name="notes">
        {(field) => (
          <field.TextareaField
            label="Notes"
            placeholder="Any notes about this shift (optional)…"
            rows={3}
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Close Shift"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
