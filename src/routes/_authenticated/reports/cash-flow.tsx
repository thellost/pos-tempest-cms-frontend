import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { format, subDays, parseISO, startOfMonth } from 'date-fns'
import {
  TrendingUpIcon,
  TrendingDownIcon,
  WalletIcon,
  CreditCardIcon,
  ActivityIcon,
} from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
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
} from '@/hooks/use-statistics'
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
  beforeLoad: requireRole(['admin', 'manager']),
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

function formatPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
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

  // Enrich each point with effective totals that include shift cash movements
  const points = useMemo(
    () =>
      rawPoints.map((p) => ({
        ...p,
        effective_cash_in: (p.cash_in ?? 0) + (p.shift_cash_in ?? 0),
        effective_cash_out: (p.cash_out ?? 0) + (p.shift_cash_out ?? 0),
      })),
    [rawPoints],
  )

  const chartConfig: ChartConfig = {
    effective_cash_in: { label: 'Cash In', color: '#10b981' },
    non_cash_in: { label: 'Non-Cash In', color: '#3b82f6' },
    effective_cash_out: { label: 'Cash Out', color: '#ef4444' },
    net_cash: { label: 'Net Cash', color: '#8b5cf6' },
  }

  // Summary totals
  const totals = useMemo(
    () =>
      points.reduce(
        (acc, p) => ({
          cash_in: acc.cash_in + p.effective_cash_in,
          non_cash_in: acc.non_cash_in + (p.non_cash_in ?? 0),
          cash_out: acc.cash_out + p.effective_cash_out,
          total_revenue: acc.total_revenue + (p.total_revenue ?? 0),
          net_cash: acc.net_cash + (p.net_cash ?? 0),
        }),
        { cash_in: 0, non_cash_in: 0, cash_out: 0, total_revenue: 0, net_cash: 0 },
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
                        effective_cash_in: 'Cash In',
                        non_cash_in: 'Non-Cash In',
                        effective_cash_out: 'Cash Out',
                        net_cash: 'Net Cash',
                      }
                      return [formatIDR(value as number), labels[name as string] ?? String(name)]
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {/* Stacked bars: Cash In + Non-Cash In */}
              <Bar
                yAxisId="amount"
                dataKey="effective_cash_in"
                name="effective_cash_in"
                stackId="income"
                fill="var(--color-effective_cash_in)"
                fillOpacity={0.85}
                radius={[0, 0, 0, 0]}
                maxBarSize={24}
              />
              <Bar
                yAxisId="amount"
                dataKey="non_cash_in"
                name="non_cash_in"
                stackId="income"
                fill="var(--color-non_cash_in)"
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
              {/* Cash Out as negative-direction bar (includes shift cash-outs) */}
              <Bar
                yAxisId="amount"
                dataKey="effective_cash_out"
                name="effective_cash_out"
                fill="var(--color-effective_cash_out)"
                fillOpacity={0.75}
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
              />
              {/* Net Cash as line overlay */}
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="net_cash"
                name="net_cash"
                stroke="var(--color-net_cash)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--color-net_cash)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
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
                  <th className="pb-2 pr-4 text-right font-medium">Cash In</th>
                  <th className="pb-2 pr-4 text-right font-medium">Non-Cash In</th>
                  <th className="pb-2 pr-4 text-right font-medium">Total Revenue</th>
                  <th className="pb-2 pr-4 text-right font-medium">Cash Out</th>
                  <th className="pb-2 text-right font-medium">Net Cash</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date} className="border-b last:border-0">
                    <td className="py-1.5 pr-4 text-muted-foreground">
                      {(() => { try { return format(parseISO(p.date), 'EEE, d MMM yyyy') } catch { return p.date } })()}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-emerald-600">
                      {formatIDR(p.effective_cash_in)}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-blue-600">
                      {formatIDR(p.non_cash_in)}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums font-medium">
                      {formatIDR(p.total_revenue)}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-red-500">
                      {formatIDR(p.effective_cash_out)}
                    </td>
                    <td
                      className={cn(
                        'py-1.5 text-right tabular-nums font-semibold',
                        p.net_cash >= 0 ? 'text-emerald-600' : 'text-red-500',
                      )}
                    >
                      {formatIDR(p.net_cash)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td className="pt-2 pr-4 font-semibold">Total</td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold text-emerald-600">
                    {formatIDR(totals.cash_in)}
                  </td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold text-blue-600">
                    {formatIDR(totals.non_cash_in)}
                  </td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold">
                    {formatIDR(totals.total_revenue)}
                  </td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold text-red-500">
                    {formatIDR(totals.cash_out)}
                  </td>
                  <td
                    className={cn(
                      'pt-2 text-right tabular-nums font-bold',
                      totals.net_cash >= 0 ? 'text-emerald-600' : 'text-red-500',
                    )}
                  >
                    {formatIDR(totals.net_cash)}
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

  // Aggregate totals from cash flow data (expenses include shift cash-outs)
  const { totalIncome, totalExpense } = useMemo(
    () =>
      points.reduce(
        (acc, p) => ({
          totalIncome: acc.totalIncome + (p.total_revenue ?? 0),
          totalExpense: acc.totalExpense + (p.cash_out ?? 0) + (p.shift_cash_out ?? 0),
        }),
        { totalIncome: 0, totalExpense: 0 },
      ),
    [points],
  )

  const netProfit = totalIncome - totalExpense
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0

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
        months[key].income += p.total_revenue ?? 0
        months[key].expense += (p.cash_out ?? 0) + (p.shift_cash_out ?? 0)
      } catch {
        /* skip unparseable dates */
      }
    }
    return Object.values(months)
  }, [points])

  const showMonthlyTable = monthlyData.length > 1

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <WalletIcon className="size-5 text-muted-foreground" />
        <CardTitle>Income vs Expense Summary</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard
                label="Total Income"
                value={formatIDR(totalIncome)}
                icon={<TrendingUpIcon className="size-4 text-emerald-500" />}
                valueClass="text-emerald-600"
              />
              <SummaryCard
                label="Total Expense"
                value={formatIDR(totalExpense)}
                icon={<TrendingDownIcon className="size-4 text-red-500" />}
                valueClass="text-red-500"
              />
              <SummaryCard
                label="Net Profit"
                value={formatIDR(netProfit)}
                icon={<WalletIcon className="size-4 text-muted-foreground" />}
                valueClass={cn(
                  'font-bold',
                  netProfit >= 0 ? 'text-emerald-600' : 'text-red-500',
                )}
              />
              <SummaryCard
                label="Profit Margin"
                value={formatPct(profitMargin)}
                icon={<ActivityIcon className="size-4 text-muted-foreground" />}
                valueClass={cn(
                  'font-bold',
                  profitMargin >= 0 ? 'text-emerald-600' : 'text-red-500',
                )}
              />
            </div>

            {/* Monthly comparison table — only if date range spans > 1 month */}
            {showMonthlyTable && (
              <>
                <Separator />
                <div>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    Monthly Comparison
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Month</th>
                          <th className="pb-2 pr-4 text-right font-medium">Income</th>
                          <th className="pb-2 pr-4 text-right font-medium">Expense</th>
                          <th className="pb-2 pr-4 text-right font-medium">Net Profit</th>
                          <th className="pb-2 text-right font-medium">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((m) => {
                          const net = m.income - m.expense
                          const margin = m.income > 0 ? (net / m.income) * 100 : 0
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
                                  'py-2 pr-4 text-right tabular-nums font-semibold',
                                  net >= 0 ? 'text-emerald-600' : 'text-red-500',
                                )}
                              >
                                {formatIDR(net)}
                              </td>
                              <td className="py-2 text-right">
                                <Badge
                                  variant={margin >= 0 ? 'default' : 'destructive'}
                                  className={cn(
                                    margin >= 0
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                      : '',
                                  )}
                                >
                                  {formatPct(margin)}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string
  icon?: React.ReactNode
  valueClass?: string
}

function SummaryCard({ label, value, icon, valueClass }: SummaryCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={cn('text-xl font-bold tabular-nums leading-none', valueClass)}>
        {value}
      </span>
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
              <SelectTrigger className="w-44">
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
