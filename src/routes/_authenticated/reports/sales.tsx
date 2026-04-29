import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { format, subDays } from 'date-fns'
import {
  BarChartIcon,
  TrendingUpIcon,
  PackageIcon,
} from 'lucide-react'
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  LabelList,
} from 'recharts'
import {
  useSalesStats,
  useRevenueByCategoryStats,
  useTopItemsStats,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { requireRole } from '@/lib/auth-guards'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/reports/sales')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: SalesReportPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

// Explicit vibrant palette — avoids CSS-variable-in-SVG resolution issues
const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function formatShortIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return ''
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}K`
  return `Rp ${value}`
}

function defaultDateRange() {
  const today = new Date()
  return {
    dateFrom: format(subDays(today, 29), 'yyyy-MM-dd'),
    dateTo: format(today, 'yyyy-MM-dd'),
  }
}

// ─── Section 1 — Sales Over Time ──────────────────────────────────────────────

interface SalesOverTimeSectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
  groupBy: 'day' | 'week' | 'month'
  onGroupByChange: (v: 'day' | 'week' | 'month') => void
}

function SalesOverTimeSection({
  branchId,
  dateFrom,
  dateTo,
  groupBy,
  onGroupByChange,
}: SalesOverTimeSectionProps) {
  const { data, isLoading } = useSalesStats({ branchId, dateFrom, dateTo, groupBy })

  // API returns a flat array — compute summary client-side
  const points = data?.data ?? []
  const summary = points.length
    ? {
        total_orders: points.reduce((s, p) => s + (p.total_orders ?? 0), 0),
        total_revenue: points.reduce((s, p) => s + (p.total_revenue ?? 0), 0),
        average_order_value:
          points.reduce((s, p) => s + (p.total_revenue ?? 0), 0) /
          Math.max(1, points.reduce((s, p) => s + (p.total_orders ?? 0), 0)),
      }
    : null

  const chartConfig: ChartConfig = {
    net_revenue: { label: 'Net Revenue', color: '#3b82f6' },
    total_orders: { label: 'Orders', color: '#10b981' },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="size-5 text-muted-foreground" />
          <CardTitle>Sales Over Time</CardTitle>
        </div>

        {/* Group By tabs */}
        <Tabs value={groupBy} onValueChange={(v) => onGroupByChange(v as 'day' | 'week' | 'month')}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Chart */}
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : points.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No sales data for the selected period.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ComposedChart data={points} margin={{ top: 4, right: 20, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => {
                  // Show short label: for day show "Mar 8", for week show "W10", for month show "Mar"
                  if (groupBy === 'day') {
                    try { return format(new Date(v + 'T00:00:00'), 'd MMM') } catch { return v }
                  }
                  return v
                }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatShortIDR}
                width={70}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (name === 'net_revenue') return [formatIDR(value as number), 'Net Revenue']
                      if (name === 'total_orders') return [String(value), 'Orders']
                      return [String(value), String(name)]
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="net_revenue"
                name="net_revenue"
                stroke="var(--color-net_revenue)"
                fill="var(--color-net_revenue)"
                fillOpacity={0.15}
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'var(--color-net_revenue)', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Bar
                yAxisId="orders"
                dataKey="total_orders"
                name="total_orders"
                fill="var(--color-total_orders)"
                fillOpacity={0.75}
                radius={[3, 3, 0, 0]}
                maxBarSize={20}
              >
                <LabelList dataKey="total_orders" position="top" style={{ fontSize: 9, fill: 'var(--color-total_orders)' }} />
              </Bar>
            </ComposedChart>
          </ChartContainer>
        )}

        <Separator />

        {/* Summary row */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryItem label="Total Orders" value={String(summary.total_orders)} />
            <SummaryItem label="Total Revenue" value={formatIDR(summary.total_revenue)} />
            <SummaryItem
              label="Average Order Value"
              value={formatIDR(summary.average_order_value)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

// ─── Section 2 — Revenue by Category ─────────────────────────────────────────

interface RevenueByCategorySectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

function RevenueByCategorySection({
  branchId,
  dateFrom,
  dateTo,
}: RevenueByCategorySectionProps) {
  const [sortBy, setSortBy] = useState<'total_revenue' | 'items_sold'>('total_revenue')
  const { data, isLoading } = useRevenueByCategoryStats({ branchId, dateFrom, dateTo })

  const categories = data?.data ?? []

  // Compute total for percentage calculation
  const grandTotal = useMemo(
    () => categories.reduce((s, c) => s + (c.total_revenue ?? 0), 0),
    [categories],
  )

  const sorted = useMemo(
    () => [...categories].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)),
    [categories, sortBy],
  )

  const chartConfig: ChartConfig = useMemo(
    () =>
      Object.fromEntries(
        categories.map((c, i) => [
          `cat_${c.category_id ?? 'null'}`,
          {
            label: c.category_name,
            color: CHART_COLORS[i % CHART_COLORS.length],
          },
        ]),
      ),
    [categories],
  )

  const pieData = useMemo(
    () =>
      categories.map((c, i) => ({
        name: c.category_name,
        value: c.total_revenue,
        color: CHART_COLORS[i % CHART_COLORS.length],
        pct: grandTotal > 0 ? (((c.total_revenue ?? 0) / grandTotal) * 100).toFixed(1) : '0.0',
      })),
    [categories, grandTotal],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChartIcon className="size-5 text-muted-foreground" />
          <CardTitle>Revenue by Category</CardTitle>
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'total_revenue' | 'items_sold')}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total_revenue">Sort by Revenue</SelectItem>
            <SelectItem value="items_sold">Sort by Items Sold</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : categories.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No category data for the selected period.
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
                    innerRadius="45%"
                    outerRadius="72%"
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
                        formatter={(value) => [formatIDR(value as number), 'Revenue']}
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
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 text-right font-medium">Revenue</th>
                    <th className="pb-2 pr-4 text-right font-medium">Items Sold</th>
                    <th className="pb-2 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((cat, i) => (
                    <tr key={cat.category_id ?? i} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block size-3 rounded-full shrink-0"
                            style={{ backgroundColor: CHART_COLORS[categories.indexOf(cat) % CHART_COLORS.length] }}
                          />
                          {cat.category_name}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatIDR(cat.total_revenue)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{(cat.items_sold ?? 0).toLocaleString('id-ID')}</td>
                      <td className="py-2 text-right tabular-nums">
                        <Badge variant="secondary">
                          {grandTotal > 0 ? (((cat.total_revenue ?? 0) / grandTotal) * 100).toFixed(1) : '0.0'}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Section 3 — Top Selling Items ────────────────────────────────────────────

interface TopItemsSectionProps {
  branchId?: number
  dateFrom?: string
  dateTo?: string
}

function TopItemsSection({ branchId, dateFrom, dateTo }: TopItemsSectionProps) {
  const [limit, setLimit] = useState<10 | 20 | 50>(10)
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue')

  const { data, isLoading } = useTopItemsStats({ branchId, dateFrom, dateTo, limit })

  const items = data?.data ?? []

  const sorted = useMemo(() => {
    const copy = [...items]
    if (sortBy === 'quantity') copy.sort((a, b) => (b.quantity_sold ?? 0) - (a.quantity_sold ?? 0))
    else copy.sort((a, b) => (b.total_revenue ?? 0) - (a.total_revenue ?? 0))
    return copy
  }, [items, sortBy])

  const chartData = useMemo(
    () =>
      sorted.slice(0, 15).map((item) => ({
        name: item.menu_item_name.length > 22 ? `${item.menu_item_name.slice(0, 22)}…` : item.menu_item_name,
        total_revenue: item.total_revenue,
        quantity_sold: item.quantity_sold,
      })),
    [sorted],
  )

  const chartConfig: ChartConfig = {
    total_revenue: { label: 'Revenue', color: '#3b82f6' },
    quantity_sold: { label: 'Qty Sold', color: '#10b981' },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <PackageIcon className="size-5 text-muted-foreground" />
          <CardTitle>Top Selling Items</CardTitle>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'revenue' | 'quantity')}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">By Revenue</SelectItem>
              <SelectItem value="quantity">By Quantity</SelectItem>
            </SelectContent>
          </Select>

          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v) as 10 | 20 | 50)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : sorted.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No item sales data for the selected period.
          </div>
        ) : (
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
            {/* Horizontal bar chart — top 15 */}
            <div className="shrink-0 xl:w-96">
              <ChartContainer config={chartConfig} className="w-full" style={{ height: Math.max(160, chartData.length * 28 + 32) }}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={sortBy === 'revenue' ? formatShortIDR : (v) => String(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => {
                          if (name === 'total_revenue') return [formatIDR(value as number), 'Revenue']
                          return [String(value), 'Qty Sold']
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey={sortBy === 'revenue' ? 'total_revenue' : 'quantity_sold'}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={18}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey={sortBy === 'revenue' ? 'total_revenue' : 'quantity_sold'}
                      position="right"
                      formatter={(v: number) =>
                        sortBy === 'revenue' ? formatShortIDR(v) : String(v)
                      }
                      style={{ fontSize: 10, fill: '#64748b' }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-3 w-10 font-medium text-center">#</th>
                    <th className="pb-2 pr-4 font-medium">Product</th>
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 text-right font-medium">Qty Sold</th>
                    <th className="pb-2 pr-4 text-right font-medium">Revenue</th>
                    <th className="pb-2 text-right font-medium">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item, idx) => (
                    <tr key={item.menu_item_id} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-center text-muted-foreground tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2 pr-4 font-medium">{item.menu_item_name}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        —
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {item.quantity_sold.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatIDR(item.total_revenue)}</td>
                      <td className="py-2 text-right tabular-nums">{item.order_count.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Stat Summary Item ────────────────────────────────────────────────────────

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}

// ─── Sales Report Page ────────────────────────────────────────────────────────

function SalesReportPage() {
  const defaults = defaultDateRange()

  const [branchId, setBranchId] = useState<number | undefined>(undefined)
  const [dateFrom, setDateFrom] = useState<string>(defaults.dateFrom)
  const [dateTo, setDateTo] = useState<string>(defaults.dateTo)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branches = branchesData?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sales Report"
        description="Analyse revenue, category performance, and top-selling products."
      />

      {/* ── Shared Filter Bar ───────────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
          {/* Branch */}
          <div className="flex flex-col gap-1.5 min-w-[160px]">
            <label className="text-xs font-medium text-muted-foreground">Branch</label>
            <Select
              value={branchId ? String(branchId) : 'all'}
              onValueChange={(v) => setBranchId(v === 'all' ? undefined : Number(v))}
            >
              <SelectTrigger className="w-full min-w-[140px]">
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
                  onClick={() => { setDateFrom(from); setDateTo(to) }}
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

      {/* ── Section 1 — Sales Over Time ─────────────────────────────────────── */}
      <SalesOverTimeSection
        branchId={branchId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {/* ── Section 2 — Revenue by Category ─────────────────────────────────── */}
      <RevenueByCategorySection
        branchId={branchId}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      {/* ── Section 3 — Top Selling Items ───────────────────────────────────── */}
      <TopItemsSection
        branchId={branchId}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  )
}
