import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { format, subDays, parseISO } from 'date-fns'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  LayoutGridIcon,
  ShoppingCartIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardStats, useSalesStats, useCashFlowStats } from '@/hooks/use-sales-cash-flow'
import { useBranches } from '@/hooks/use-branches'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeTrend(today: number, yesterday: number): number | undefined {
  if (yesterday === 0) return today > 0 ? 100 : undefined
  return ((today - yesterday) / yesterday) * 100
}

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function formatShortIDR(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}Rp ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}Rp ${(abs / 1_000).toFixed(0)}K`
  return `${sign}Rp ${abs}`
}

function getLast7DayRange() {
  const today = new Date()
  return {
    dateFrom: format(subDays(today, 6), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
  }
}

// ─── Revenue Chart Card ───────────────────────────────────────────────────────

const revenueChartConfig: ChartConfig = {
  total_revenue: { label: 'Revenue', color: '#8b5cf6' },
}

function RevenueChartCard({ branchId }: { branchId?: number }) {
  const { dateFrom, dateTo } = getLast7DayRange()
  const { data, isLoading } = useSalesStats({ branchId, dateFrom, dateTo, groupBy: 'day' })
  const points = data?.data ?? []

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <DollarSignIcon className="size-5 text-muted-foreground" />
          <CardTitle>Revenue — Last 7 Days</CardTitle>
        </div>
        <Link
          to="/reports/cash-flow"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          More <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : points.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No revenue data for the last 7 days.
          </div>
        ) : (
          <ChartContainer config={revenueChartConfig} className="h-64 w-full">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  try {
                    return format(parseISO(v), 'EEE d')
                  } catch {
                    return v
                  }
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortIDR}
                width={72}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [formatIDR(value as number), 'Revenue']}
                    labelFormatter={(label) => {
                      try {
                        return format(parseISO(label as string), 'EEE, d MMM yyyy')
                      } catch {
                        return String(label)
                      }
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="total_revenue"
                name="total_revenue"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#revenueFill)"
                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Cash Flow Summary Card ───────────────────────────────────────────────────

function CashFlowSummaryCard({ branchId }: { branchId?: number }) {
  const { dateFrom, dateTo } = getLast7DayRange()
  const { data, isLoading } = useCashFlowStats({ branchId, dateFrom, dateTo })
  const points = data?.data ?? []

  // Income = all cash + non-cash + deposits; Expense = change given + withdrawals + PO costs
  const { totalIncome, totalExpense } = useMemo(
    () =>
      points.reduce(
        (acc, p) => ({
          totalIncome: acc.totalIncome + p.cash_in + p.non_cash_in + p.shift_cash_in,
          totalExpense: acc.totalExpense + p.cash_out + p.shift_cash_out + p.po_expenses,
        }),
        { totalIncome: 0, totalExpense: 0 },
      ),
    [points],
  )

  const incomeRatio =
    totalIncome + totalExpense > 0
      ? (totalIncome / (totalIncome + totalExpense)) * 100
      : 50

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <WalletIcon className="size-5 text-muted-foreground" />
          <CardTitle>Cash Flow</CardTitle>
        </div>
        <Link
          to="/reports/cash-flow"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          More <ArrowRightIcon className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-[4.5rem] w-full rounded-lg" />
            <Skeleton className="h-[4.5rem] w-full rounded-lg" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-[4.5rem] w-full rounded-lg" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">Last 7 days</p>

            {/* Income */}
            <Link
              to="/reports/sales"
              search={{ date_from: dateFrom, date_to: dateTo }}
              className="block cursor-pointer rounded-lg bg-emerald-50 px-4 py-3 transition-opacity hover:opacity-80 dark:bg-emerald-950/30"
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <TrendingUpIcon className="size-3.5" />
                Total Income
              </div>
              <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatIDR(totalIncome)}
              </div>
            </Link>

            {/* Spending */}
            <Link
              to="/reports/expenses"
              search={{ date_from: dateFrom, date_to: dateTo }}
              className="block cursor-pointer rounded-lg bg-red-50 px-4 py-3 transition-opacity hover:opacity-80 dark:bg-red-950/30"
            >
              <div className="mb-1 flex items-center gap-1.5 text-xs text-red-500">
                <TrendingDownIcon className="size-3.5" />
                Total Expense
              </div>
              <div className="text-xl font-bold tabular-nums text-red-500">
                {formatIDR(totalExpense)}
              </div>
            </Link>

            {/* Income/expense ratio bar */}
            <div className="overflow-hidden rounded-full bg-red-200 h-2 dark:bg-red-900/50">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(Math.max(incomeRatio, 0), 100)}%` }}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

function DashboardPage() {
  const { user, branchId: userBranchId } = useAuth()
  const [branchId, setBranchId] = useState<number | undefined>(userBranchId ?? 1)
  const { data, isLoading } = useDashboardStats(branchId)
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branches = branchesData?.data ?? []

  const stats = data?.data

  const revenueTrend = stats
    ? computeTrend(stats.today_revenue, stats.yesterday_revenue)
    : undefined
  const ordersTrend = stats
    ? computeTrend(stats.today_orders, stats.yesterday_orders)
    : undefined
  const expensesTrend = stats
    ? computeTrend(stats.today_expenses, stats.yesterday_expenses)
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Dashboard"
          description={`Welcome back, ${user?.name ?? 'there'}. Here's what's happening today.`}
        />
        <Select
          value={branchId ? String(branchId) : 'all'}
          onValueChange={(v) => setBranchId(v === 'all' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-[180px] shrink-0 mt-1">
            <SelectValue placeholder="Select branch" />
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

      {/* ── Top row: Revenue chart + Cash flow ───────────────────────────── */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <div className="flex h-full flex-col lg:col-span-2">
          <RevenueChartCard branchId={branchId} />
        </div>
        <CashFlowSummaryCard branchId={branchId} />
      </div>

      {/* ── Bottom row: 6 KPI stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Today's Revenue */}
        <CardLink to="/orders">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Today's Revenue"
              value={formatIDR(stats.today_revenue)}
              icon={<DollarSignIcon className="size-5" />}
              trend={revenueTrend}
              trendLabel="vs yesterday"
            />
          )}
        </CardLink>

        {/* Today's Orders */}
        <CardLink to="/orders">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Today's Orders"
              value={stats.today_orders.toLocaleString()}
              icon={<ShoppingCartIcon className="size-5" />}
              trend={ordersTrend}
              trendLabel="vs yesterday"
            />
          )}
        </CardLink>

        {/* Active Tables */}
        <CardLink to="/tables">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Active Tables"
              value={`${stats.active_tables}`}
              icon={<LayoutGridIcon className="size-5" />}
            />
          )}
        </CardLink>

        {/* Open Shifts */}
        <CardLink to="/shifts">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Open Shifts"
              value={stats.open_shifts.toLocaleString()}
              icon={<ClockIcon className="size-5" />}
            />
          )}
        </CardLink>

        {/* Low Stock Alerts */}
        <CardLink to="/inventory">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Low Stock Alerts"
              value={stats.low_stock_items.toLocaleString()}
              icon={
                <AlertTriangleIcon
                  className={cn(
                    'size-5',
                    stats.low_stock_items > 0 ? 'text-red-500' : 'text-muted-foreground',
                  )}
                />
              }
              className={
                stats.low_stock_items > 0 ? 'border-red-200 dark:border-red-900' : undefined
              }
            />
          )}
        </CardLink>

        {/* Pending Reservations */}
        <CardLink to="/reservations">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Pending Reservations"
              value={stats.pending_reservations.toLocaleString()}
              icon={<CalendarIcon className="size-5" />}
            />
          )}
        </CardLink>

        {/* Today's Expenses */}
        <Link
          to="/reports/expenses"
          search={{ date_from: format(new Date(), 'yyyy-MM-dd'), date_to: format(new Date(), 'yyyy-MM-dd') }}
          className="block rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Today's Expenses"
              value={formatIDR(stats.today_expenses)}
              icon={<TrendingDownIcon className="size-5 text-red-500" />}
              trend={expensesTrend !== undefined ? -expensesTrend : undefined}
              trendLabel="vs yesterday"
            />
          )}
        </Link>

        </div>
    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function CardLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between pb-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-5 rounded" />
      </div>
      <Skeleton className="mt-3 h-8 w-28" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  )
}
