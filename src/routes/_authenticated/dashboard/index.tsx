import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  DollarSignIcon,
  LayoutGridIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardStats } from '@/hooks/use-statistics'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Compute percentage trend between two periods.
 * Returns `undefined` when there is no baseline to compare against.
 */
function computeTrend(today: number, yesterday: number): number | undefined {
  if (yesterday === 0) return today > 0 ? 100 : undefined
  return ((today - yesterday) / yesterday) * 100
}

/** Format a number as IDR currency — e.g. "Rp 4.200.000". */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

function DashboardPage() {
  const { branchId, user } = useAuth()
  const { data, isLoading } = useDashboardStats(branchId ?? undefined)

  const stats = data?.data

  const revenueTrend = stats
    ? computeTrend(stats.today_revenue, stats.yesterday_revenue)
    : undefined
  const ordersTrend = stats
    ? computeTrend(stats.today_orders, stats.yesterday_orders)
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.name ?? 'there'}. Here's what's happening today.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1 — Today's Revenue */}
        <CardLink to="/orders">
          {isLoading || !stats ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Today's Revenue"
              value={formatCurrency(stats.today_revenue)}
              icon={<DollarSignIcon className="size-5" />}
              trend={revenueTrend}
              trendLabel="vs yesterday"
            />
          )}
        </CardLink>

        {/* 2 — Today's Orders */}
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

        {/* 3 — Active Tables */}
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

        {/* 4 — Open Shifts */}
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

        {/* 5 — Low Stock Alerts  (linked to inventory; highlighted red when > 0) */}
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
                    stats.low_stock_items > 0
                      ? 'text-red-500'
                      : 'text-muted-foreground',
                  )}
                />
              }
              className={
                stats.low_stock_items > 0
                  ? 'border-red-200 dark:border-red-900'
                  : undefined
              }
            />
          )}
        </CardLink>

        {/* 6 — Pending Reservations */}
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
      </div>
    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Wraps children in a TanStack Router Link with hover styling. */
function CardLink({
  to,
  children,
}: {
  to: string
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  )
}

/** Skeleton placeholder that matches a StatCard's dimensions while loading. */
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
