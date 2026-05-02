import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { format, subDays, parseISO, startOfMonth } from 'date-fns'
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CreditCardIcon,
  ActivityIcon,
} from 'lucide-react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  useCashFlowStats,
  usePaymentMethodsStats,
} from '@/hooks/use-sales-cash-flow'
import { useBranches } from '@/hooks/use-branches'
import { PageHeader } from '@/components/page-header'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { requireRole } from '@/lib/auth-guards'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/reports/cash-flow')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: CashFlowReportPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#10b981',        // emerald
  debit_card: '#3b82f6',  // blue
  credit_card: '#8b5cf6', // violet
  ewallet: '#f59e0b',     // amber
  qris: '#06b6d4',        // cyan
  bank_transfer: '#f97316', // orange
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

function getPaymentColor(method: string, index: number): string {
  return PAYMENT_COLORS[method] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function formatShortIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return ''
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}K`
  return `${sign}Rp ${abs}`
}

function defaultDateRange() {
  const today = new Date()
  return {
    dateFrom: format(subDays(today, 29), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
  }
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

// ─── Section 1 — Cash Flow Over Time ─────────────────────────────────────────

interface CashFlowSectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

function CashFlowSection({ branchId, dateFrom, dateTo }: CashFlowSectionProps) {
  const { data, isLoading } = useCashFlowStats({ branchId, dateFrom, dateTo })
  const rawPoints = data?.data ?? []

  // Compute total_income and total_expense per point for the chart
  const points = useMemo(
    () =>
      rawPoints.map((p) => ({
        ...p,
        total_income: p.cash_in + p.non_cash_in + p.shift_cash_in,
        total_expense: p.cash_out + p.shift_cash_out + p.po_expenses,
      })),
    [rawPoints],
  )

  const chartConfig: ChartConfig = {
    total_income: { label: 'Total Income', color: '#10b981' },
    total_expense: { label: 'Total Expense', color: '#ef4444' },
  }

  // Summary totals
  const totals = useMemo(
    () =>
      points.reduce(
        (acc, p) => ({
          total_income: acc.total_income + p.total_income,
          total_expense: acc.total_expense + p.total_expense,
        }),
        { total_income: 0, total_expense: 0 },
      ),
    [points],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <ActivityIcon className="size-5 text-muted-foreground" />
        <CardTitle>Cash Flow Over Time</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : points.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No cash flow data for the selected period.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <ComposedChart data={points} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  try { return format(parseISO(v), 'd MMM') } catch { return v }
                }}
              />
              <YAxis
                yAxisId="amount"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortIDR}
                width={72}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        total_income: 'Total Income',
                        total_expense: 'Total Expense',
                      }
                      return [formatIDR(value as number), labels[name as string] ?? String(name)]
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="amount"
                dataKey="total_income"
                name="total_income"
                fill="var(--color-total_income)"
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                yAxisId="amount"
                dataKey="total_expense"
                name="total_expense"
                fill="var(--color-total_expense)"
                fillOpacity={0.75}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
            </ComposedChart>
          </ChartContainer>
        )}

        <Separator />

        {/* Daily detail table */}
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : points.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 text-right font-medium">Total Income</th>
                  <th className="pb-2 pr-4 text-right font-medium">Total Expense</th>
                  <th className="pb-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => {
                  const net = p.total_income - p.total_expense
                  return (
                    <tr key={p.date} className="border-b last:border-0">
                      <td className="py-1.5 pr-4 text-muted-foreground">
                        {(() => { try { return format(parseISO(p.date), 'EEE, d MMM yyyy') } catch { return p.date } })()}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-600">
                        {formatIDR(p.total_income)}
                      </td>
                      <td className="py-1.5 pr-4 text-right tabular-nums text-red-500">
                        {formatIDR(p.total_expense)}
                      </td>
                      <td
                        className={cn(
                          'py-1.5 text-right tabular-nums font-semibold',
                          net >= 0 ? 'text-emerald-600' : 'text-red-500',
                        )}
                      >
                        {formatIDR(net)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td className="pt-2 pr-4 font-semibold">Total</td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold text-emerald-600">
                    {formatIDR(totals.total_income)}
                  </td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold text-red-500">
                    {formatIDR(totals.total_expense)}
                  </td>
                  <td
                    className={cn(
                      'pt-2 text-right tabular-nums font-bold',
                      totals.total_income - totals.total_expense >= 0 ? 'text-emerald-600' : 'text-red-500',
                    )}
                  >
                    {formatIDR(totals.total_income - totals.total_expense)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ─── Section 2 — Payment Method Breakdown ─────────────────────────────────────

interface PaymentMethodSectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

function PaymentMethodSection({ branchId, dateFrom, dateTo }: PaymentMethodSectionProps) {
  const { data, isLoading } = usePaymentMethodsStats({ branchId, dateFrom, dateTo })
  const methods = data?.data ?? []

  const sorted = useMemo(
    () => [...methods].sort((a, b) => (b.total_amount ?? 0) - (a.total_amount ?? 0)),
    [methods],
  )

  const pieData = useMemo(
    () =>
      sorted.map((m, i) => ({
        name: labelForPaymentMethod(m.payment_method),
        value: m.total_amount,
        color: getPaymentColor(m.payment_method, i),
        pct: m.percentage?.toFixed(1) ?? '0.0',
      })),
    [sorted],
  )

  const chartConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        sorted.map((m, i) => [
          m.payment_method,
          {
            label: labelForPaymentMethod(m.payment_method),
            color: getPaymentColor(m.payment_method, i),
          },
        ]),
      ),
    [sorted],
  )

  const grandTotal = useMemo(
    () => sorted.reduce((s, m) => s + (m.total_amount ?? 0), 0),
    [sorted],
  )

  const grandCount = useMemo(
    () => sorted.reduce((s, m) => s + (m.count ?? 0), 0),
    [sorted],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <CreditCardIcon className="size-5 text-muted-foreground" />
        <CardTitle>Payment Method Breakdown</CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : methods.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No payment data for the selected period.
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {/* Donut chart */}
            <div className="shrink-0 md:w-56">
              <ChartContainer config={chartConfig} className="aspect-square w-full max-w-64 mx-auto">
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
                    <th className="pb-2 pr-4 text-right font-medium">Transactions</th>
                    <th className="pb-2 pr-4 text-right font-medium">Total Amount</th>
                    <th className="pb-2 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((m, i) => (
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
  )
}

// ─── Section 3 — Income vs Expense Summary ────────────────────────────────────

interface SummarySectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

function SummarySection({ branchId, dateFrom, dateTo }: SummarySectionProps) {
  const { data: cashFlowData, isLoading } = useCashFlowStats({ branchId, dateFrom, dateTo })
  const points = cashFlowData?.data ?? []

  const totals = useMemo(
    () =>
      points.reduce(
        (acc, p) => ({
          cashIn: acc.cashIn + p.cash_in,
          nonCashIn: acc.nonCashIn + p.non_cash_in,
          shiftCashIn: acc.shiftCashIn + p.shift_cash_in,
          cashOut: acc.cashOut + p.cash_out,
          poExpenses: acc.poExpenses + p.po_expenses,
          shiftCashOut: acc.shiftCashOut + p.shift_cash_out,
        }),
        { cashIn: 0, nonCashIn: 0, shiftCashIn: 0, cashOut: 0, poExpenses: 0, shiftCashOut: 0 },
      ),
    [points],
  )

  const totalIncome = totals.cashIn + totals.nonCashIn + totals.shiftCashIn
  const totalExpense = totals.cashOut + totals.poExpenses + totals.shiftCashOut

  // Monthly breakdown — group by YYYY-MM
  const monthlyData = useMemo(() => {
    const months: Record<
      string,
      { label: string; income: number; expense: number }
    > = {}
    for (const p of points) {
      try {
        const d = parseISO(p.date)
        const key = format(startOfMonth(d), 'yyyy-MM')
        const label = format(startOfMonth(d), 'MMM yyyy')
        if (!months[key]) months[key] = { label, income: 0, expense: 0 }
        months[key].income += p.cash_in + p.non_cash_in + p.shift_cash_in
        months[key].expense += p.cash_out + p.shift_cash_out + p.po_expenses
      } catch {
        /* skip unparseable dates */
      }
    }
    return Object.values(months)
  }, [points])

  const showMonthlyTable = monthlyData.length > 1

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Top: Total Income & Total Expense ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="py-0 border-emerald-200 dark:border-emerald-900">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUpIcon className="size-3.5" />
              Total Income
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatIDR(totalIncome)}
            </p>
          </CardContent>
        </Card>

        <Card className="py-0 border-red-200 dark:border-red-900">
          <CardContent className="p-5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
              <TrendingDownIcon className="size-3.5" />
              Total Expense
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-red-500">
              {formatIDR(totalExpense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Breakdown cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Income breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUpIcon className="size-4" />
              Income breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BreakdownRow label="Cash In" value={totals.cashIn} total={totalIncome} color="emerald" />
            <BreakdownRow label="Non-Cash In" value={totals.nonCashIn} total={totalIncome} color="emerald" />
            <BreakdownRow label="Shift Cash In" value={totals.shiftCashIn} total={totalIncome} color="emerald" />
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatIDR(totalIncome)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expense breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-500">
              <TrendingDownIcon className="size-4" />
              Expense breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <BreakdownRow label="Cash Out" value={totals.cashOut} total={totalExpense} color="red" />
            <BreakdownRow label="PO Purchases" value={totals.poExpenses} total={totalExpense} color="red" />
            <BreakdownRow label="Shift Cash Out" value={totals.shiftCashOut} total={totalExpense} color="red" />
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums text-red-500">
                {formatIDR(totalExpense)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly comparison table — only if date range spans > 1 month */}
      {showMonthlyTable && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ActivityIcon className="size-4 text-muted-foreground" />
              Monthly comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Month</th>
                    <th className="pb-2 pr-4 text-right font-medium">Income</th>
                    <th className="pb-2 pr-4 text-right font-medium">Expense</th>
                    <th className="pb-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((m) => {
                    const net = m.income - m.expense
                    return (
                      <tr key={m.label} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{m.label}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-emerald-600">
                          {formatIDR(m.income)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-red-500">
                          {formatIDR(m.expense)}
                        </td>
                        <td
                          className={cn(
                            'py-2 text-right tabular-nums font-semibold',
                            net >= 0 ? 'text-emerald-600' : 'text-red-500',
                          )}
                        >
                          {formatIDR(net)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Breakdown Row ────────────────────────────────────────────────────────────

function BreakdownRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: 'emerald' | 'red'
}) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const barColor = color === 'emerald' ? 'bg-emerald-500' : 'bg-red-500'
  const textColor = color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('tabular-nums font-medium', textColor)}>{formatIDR(value)}</span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full', barColor)}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
      <p className="text-right text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
    </div>
  )
}

// ─── Cash Flow Report Page ─────────────────────────────────────────────────────

function CashFlowReportPage() {
  const defaults = defaultDateRange()

  const [branchId, setBranchId] = useState<number | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState<string>(defaults.dateFrom)
  const [dateTo, setDateTo] = useState<string>(defaults.dateTo)

  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branches = branchesData?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financial Reports"
        description="Analyse cash flow, payment methods, and income vs expense over time."
      />

      {/* ── Shared Filter Bar ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
          {/* Branch */}
          <div className="flex flex-col gap-1.5 min-w-40">
            <label className="text-xs font-medium text-muted-foreground">Branch</label>
            <Select
              value={branchId ? String(branchId) : 'all'}
              onValueChange={(v) => setBranchId(v === 'all' ? undefined : Number(v))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className={cn(
                'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-2',
              )}
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className={cn(
                'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm',
                'ring-offset-background focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-2',
              )}
            />
          </div>

          {/* Quick range shortcuts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Last 7 days', days: 6 },
              { label: 'Last 30 days', days: 29 },
              { label: 'Last 90 days', days: 89 },
            ].map(({ label, days }) => {
              const from = format(subDays(new Date(), days), 'yyyy-MM-dd')
              const to = format(new Date(), 'yyyy-MM-dd')
              const isActive = dateFrom === from && dateTo === to
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setDateFrom(from)
                    setDateTo(to)
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 1 — Cash Flow Over Time ──────────────────────────────── */}
      <CashFlowSection branchId={branchId} dateFrom={dateFrom} dateTo={dateTo} />

      {/* ── Section 2 — Payment Method Breakdown ─────────────────────────── */}
      <PaymentMethodSection branchId={branchId} dateFrom={dateFrom} dateTo={dateTo} />

      {/* ── Section 3 — Income vs Expense Summary ────────────────────────── */}
      <SummarySection branchId={branchId} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  )
}
