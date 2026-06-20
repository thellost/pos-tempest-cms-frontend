import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { format, subDays } from 'date-fns'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrendingDownIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts'
import {
  useCashTransactionBreakdown,
  useExpenseBreakdown,
} from '@/hooks/use-sales-cash-flow'
import { useBranches } from '@/hooks/use-branches'
import { useCashTransactionReasonLabels } from '@/hooks/use-cash-reasons'
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
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/reports/expenses')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  validateSearch: (search: Record<string, unknown>) => ({
    date_from: typeof search.date_from === 'string' ? search.date_from : undefined,
    date_to: typeof search.date_to === 'string' ? search.date_to : undefined,
  }),
  component: ExpenseReportPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
]

const CASH_IN_COLOR = '#10b981'
const CASH_OUT_COLOR = '#ef4444'

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function defaultDateRange() {
  const today = new Date()
  return {
    dateFrom: format(subDays(today, 29), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
  }
}

// ─── Section 1 — Expense Breakdown ───────────────────────────────────────────

interface ExpenseBreakdownSectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

const expenseChartConfig = {
  total_amount: { label: 'Amount', color: EXPENSE_COLORS[0] },
} satisfies ChartConfig

function ExpenseBreakdownSection({ branchId, dateFrom, dateTo }: ExpenseBreakdownSectionProps) {
  const navigate = useNavigate()
  const { data, isLoading } = useExpenseBreakdown(branchId, dateFrom, dateTo)
  const { labelForReason } = useCashTransactionReasonLabels(branchId)
  const items = useMemo(() => (data?.data ?? []).slice().sort((a, b) => b.total_amount - a.total_amount), [data])

  const grandTotal = useMemo(() => items.reduce((sum, i) => sum + i.total_amount, 0), [items])
  const grandCount = useMemo(() => items.reduce((sum, i) => sum + i.count, 0), [items])

  const chartData = items.map((item) => ({
    reason: labelForReason(item.reason),
    rawReason: item.reason,
    total_amount: item.total_amount,
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDownIcon className="size-4 text-red-500" />
            Expense Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No expense data for the selected period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDownIcon className="size-4 text-red-500" />
          Expense Breakdown
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Expenses grouped by reason — cash withdrawals and purchase orders.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bar chart */}
        <ChartContainer config={expenseChartConfig} className="h-52 w-full cursor-pointer">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v: number) => {
                if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`
                if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
                return String(v)
              }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="reason"
              width={110}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatIDR(value as number), 'Amount']}
                />
              }
            />
            <Bar
              dataKey="total_amount"
              radius={[0, 4, 4, 0]}
              style={{ cursor: 'pointer' }}
              onClick={(data: { rawReason?: string }) => {
                if (data.rawReason === 'purchase_order') {
                  void navigate({
                    to: '/purchases',
                    search: { date_from: dateFrom, date_to: dateTo },
                  })
                } else {
                  void navigate({
                    to: '/reports/cash-transactions',
                    search: {
                      reason: data.rawReason,
                      type: undefined,
                      shift_id: undefined,
                      branch_id: undefined,
                      date_from: dateFrom,
                      date_to: dateTo,
                    },
                  })
                }
              }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Detail table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Reason</th>
                <th className="pb-2 pr-4 text-right font-medium">Transactions</th>
                <th className="pb-2 pr-4 text-right font-medium">Total Amount</th>
                <th className="pb-2 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.reason} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
                      />
                      {labelForReason(item.reason)}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{item.count.toLocaleString('id-ID')}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{formatIDR(item.total_amount)}</td>
                  <td className="py-2 text-right">
                    <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2">
              <tr>
                <td className="pt-2 pr-4 font-semibold">Total</td>
                <td className="pt-2 pr-4 text-right tabular-nums font-semibold">{grandCount.toLocaleString('id-ID')}</td>
                <td className="pt-2 pr-4 text-right tabular-nums font-semibold">{formatIDR(grandTotal)}</td>
                <td className="pt-2 text-right"><Badge>100%</Badge></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Section 2 — Cash Transaction Breakdown ───────────────────────────────────

interface CashTxBreakdownSectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

function CashTxBreakdownTable({
  title,
  icon,
  color,
  items,
  emptyMsg,
  labelForReason,
}: {
  title: string
  icon: React.ReactNode
  color: string
  items: Array<{ reason: string; count: number; total_amount: number; percentage: number }>
  emptyMsg: string
  labelForReason: (key: string) => string
}) {
  const grandTotal = items.reduce((sum, i) => sum + i.total_amount, 0)
  const grandCount = items.reduce((sum, i) => sum + i.count, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base" style={{ color }}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyMsg}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Reason</th>
                  <th className="pb-2 pr-4 text-right font-medium">Count</th>
                  <th className="pb-2 pr-4 text-right font-medium">Total Amount</th>
                  <th className="pb-2 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.reason} className="border-b last:border-0">
                    <td className="py-2 pr-4">{labelForReason(item.reason)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{item.count.toLocaleString('id-ID')}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatIDR(item.total_amount)}</td>
                    <td className="py-2 text-right">
                      <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td className="pt-2 pr-4 font-semibold">Total</td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold">{grandCount.toLocaleString('id-ID')}</td>
                  <td className="pt-2 pr-4 text-right tabular-nums font-semibold">{formatIDR(grandTotal)}</td>
                  <td className="pt-2 text-right"><Badge>100%</Badge></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CashTxBreakdownSection({ branchId, dateFrom, dateTo }: CashTxBreakdownSectionProps) {
  const { data, isLoading } = useCashTransactionBreakdown(branchId, dateFrom, dateTo)
  const { labelForReason } = useCashTransactionReasonLabels(branchId)
  const items = data?.data ?? []

  const cashOutItems = useMemo(
    () => items.filter((i) => i.type === 'cash_out').sort((a, b) => b.total_amount - a.total_amount),
    [items],
  )
  const cashInItems = useMemo(
    () => items.filter((i) => i.type === 'cash_in').sort((a, b) => b.total_amount - a.total_amount),
    [items],
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-base font-semibold">Cash Transaction Breakdown</h2>
        <p className="text-sm text-muted-foreground">
          Shift cash transactions grouped by reason and direction.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CashTxBreakdownTable
          title="Cash Out (Withdrawals)"
          icon={<ArrowDownIcon className="size-4" />}
          color={CASH_OUT_COLOR}
          items={cashOutItems}
          emptyMsg="No cash-out transactions for this period."
          labelForReason={labelForReason}
        />
        <CashTxBreakdownTable
          title="Cash In (Deposits)"
          icon={<ArrowUpIcon className="size-4" />}
          color={CASH_IN_COLOR}
          items={cashInItems}
          emptyMsg="No cash-in transactions for this period."
          labelForReason={labelForReason}
        />
      </div>
    </div>
  )
}

// ─── Expense Report Page ──────────────────────────────────────────────────────

function ExpenseReportPage() {
  const { branchId: userBranchId } = useAuth()
  const { data: branchesData } = useBranches()
  const branches = branchesData?.data ?? []
  const search = Route.useSearch()

  const defaults = defaultDateRange()
  const [branchId, setBranchId] = useState<number | undefined>(userBranchId ?? 1)
  const [datePreset, setDatePreset] = useState('30')
  const [dateFrom, setDateFrom] = useState(search.date_from ?? defaults.dateFrom)
  const [dateTo, setDateTo] = useState(search.date_to ?? defaults.dateTo)

  function handlePresetChange(days: string) {
    setDatePreset(days)
    const today = new Date()
    setDateFrom(format(subDays(today, parseInt(days, 10) - 1), 'yyyy-MM-dd'))
    setDateTo(format(today, 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Expense Report"
        description="Breakdown of expenses and shift cash transactions by reason."
      />

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {/* Branch */}
        <Select
          value={branchId !== undefined ? String(branchId) : 'all'}
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

        {/* Date range preset */}
        <Select value={datePreset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.days} value={String(p.days)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDatePreset(''); setDateFrom(e.target.value) }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDatePreset(''); setDateTo(e.target.value) }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* ── Summary totals ──────────────────────────────────────────────────── */}
      <ExpenseTotals branchId={branchId} dateFrom={dateFrom} dateTo={dateTo} />

      {/* ── Section 1: Expense Breakdown ───────────────────────────────────── */}
      <ExpenseBreakdownSection branchId={branchId} dateFrom={dateFrom} dateTo={dateTo} />

      {/* ── Section 2: Cash Transaction Breakdown ──────────────────────────── */}
      <CashTxBreakdownSection branchId={branchId} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  )
}

// ─── Expense Totals (summary cards above sections) ───────────────────────────

function ExpenseTotals({
  branchId,
  dateFrom,
  dateTo,
}: {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}) {
  const { data: expData, isLoading: expLoading } = useExpenseBreakdown(branchId, dateFrom, dateTo)
  const { data: txData, isLoading: txLoading } = useCashTransactionBreakdown(branchId, dateFrom, dateTo)

  const totalExpense = useMemo(
    () => (expData?.data ?? []).reduce((sum, i) => sum + i.total_amount, 0),
    [expData],
  )
  const totalCashIn = useMemo(
    () => (txData?.data ?? []).filter((i) => i.type === 'cash_in').reduce((sum, i) => sum + i.total_amount, 0),
    [txData],
  )
  const totalCashOut = useMemo(
    () => (txData?.data ?? []).filter((i) => i.type === 'cash_out').reduce((sum, i) => sum + i.total_amount, 0),
    [txData],
  )

  if (expLoading || txLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="py-0 border-red-200 dark:border-red-900">
        <CardContent className="p-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
            <TrendingDownIcon className="size-3.5" />
            Total Expenses
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-500">{formatIDR(totalExpense)}</p>
        </CardContent>
      </Card>
      <Card className="py-0 border-red-100 dark:border-red-950">
        <CardContent className="p-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
            <ArrowDownIcon className="size-3.5" />
            Shift Cash Out
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums">{formatIDR(totalCashOut)}</p>
        </CardContent>
      </Card>
      <Card className="py-0 border-emerald-200 dark:border-emerald-900">
        <CardContent className="p-5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpIcon className="size-3.5" />
            Shift Cash In
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatIDR(totalCashIn)}</p>
        </CardContent>
      </Card>
    </div>
  )
}
