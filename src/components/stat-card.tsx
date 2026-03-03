import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  /** Card heading label (e.g. "Total Revenue") */
  label: string
  /** The primary large value (e.g. "Rp 4,200,000" or "128") */
  value: string | number
  /**
   * Optional icon rendered in the top-right of the card header.
   * Pass a Lucide icon element: `<CircleDollarSignIcon className="size-5 text-muted-foreground" />`
   */
  icon?: React.ReactNode
  /**
   * Trend percentage (positive = up, negative = down, omit to hide trend).
   * Pass as a number, e.g. `12.5` for "+12.5%", `-3.2` for "−3.2%".
   */
  trend?: number
  /** Label shown next to the trend (e.g. "vs last month"). */
  trendLabel?: string
  className?: string
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel = 'vs last period',
  className,
}: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== null

  return (
    <Card className={cn('gap-3 py-5', className)}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hasTrend && (
          <div
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              trend > 0
                ? 'text-green-600 dark:text-green-400'
                : trend < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-muted-foreground',
            )}
          >
            {trend > 0 ? (
              <TrendingUpIcon className="size-3.5" />
            ) : trend < 0 ? (
              <TrendingDownIcon className="size-3.5" />
            ) : null}
            <span>
              {trend > 0 ? '+' : ''}
              {trend.toFixed(1)}%
            </span>
            {trendLabel && (
              <span className="text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
