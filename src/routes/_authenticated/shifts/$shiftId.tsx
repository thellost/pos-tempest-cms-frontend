import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, LockIcon } from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import { useShift, useShiftSummary, useCloseShift } from '@/hooks/use-shifts'
import { useAppForm } from '@/hooks/use-form'
import type { CloseShiftPayload } from '@/lib/services/shifts'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function ShiftDetailPage() {
  const { shiftId } = Route.useParams()
  const id = parseInt(shiftId, 10)

  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  const { data: shiftResult, isLoading: shiftLoading } = useShift(id)
  const { data: summaryResult, isLoading: summaryLoading } = useShiftSummary(id)

  const shift = shiftResult?.data
  const summary = summaryResult?.data

  const isLoading = shiftLoading || summaryLoading

  // ── Pie chart data ──────────────────────────────────────────────────────────

  const chartData: {
    name: string
    value: number
    count: number
    percentage: number
    fill: string
  }[] =
    summary?.payment_breakdown?.map((item, i) => ({
      name: item.payment_method,
      value: item.total_amount,
      count: item.count,
      percentage: item.percentage,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    })) ?? []

  const chartConfig: ChartConfig = Object.fromEntries(
    (summary?.payment_breakdown ?? []).map((item, i) => [
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

  const cashDiff = summary?.cash_difference ?? null

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

        {/* Financial Summary */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Total Orders"
                value={summary.total_orders.toLocaleString('id-ID')}
              />
              <InfoRow
                label="Total Revenue"
                value={formatIDR(summary.total_revenue)}
              />
              <InfoRow
                label="Discount"
                value={formatIDR(summary.total_discount)}
              />
              <InfoRow label="Tax" value={formatIDR(summary.total_tax)} />
              <InfoRow
                label="Service Charge"
                value={formatIDR(summary.total_service)}
              />
              <Separator />
              <InfoRow
                label="Net Revenue"
                value={
                  <span className="font-semibold">
                    {formatIDR(summary.net_revenue)}
                  </span>
                }
              />
            </CardContent>
          </Card>
        )}

        {/* Cash Reconciliation */}
        {summary && (
          <Card>
            <CardHeader>
              <CardTitle>Cash Reconciliation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Opening Cash"
                value={formatIDR(summary.opening_cash)}
              />
              <InfoRow
                label="Expected Cash"
                value={formatIDR(summary.expected_cash)}
              />
              <InfoRow
                label="Actual Cash"
                value={formatIDR(summary.closing_cash)}
              />
              <Separator />
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Payment Breakdown Pie Chart ─────────────────────────────────── */}
      {summary && chartData.length > 0 && (
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
                {summary.payment_breakdown.map((item, i) => (
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
}: {
  label: string
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
  shiftId: number
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
