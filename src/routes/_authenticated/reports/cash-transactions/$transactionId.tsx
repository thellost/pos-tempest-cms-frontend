import { createFileRoute, Link } from '@tanstack/react-router'
import { format, parseISO } from 'date-fns'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  BuildingIcon,
  CalendarIcon,
  ClipboardListIcon,
  HashIcon,
  UserIcon,
} from 'lucide-react'
import { useGlobalCashTransaction } from '@/hooks/use-sales-cash-flow'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { requireRole } from '@/lib/auth-guards'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute(
  '/_authenticated/reports/cash-transactions/$transactionId',
)({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: CashTransactionDetailPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  purchase_order: 'Purchase Order',
  supply_purchase: 'Supply Purchase',
  pengeluaran_pribadi: 'Pengeluaran Pribadi',
  owner_withdrawal: 'Owner Withdrawal',
  gaji: 'Gaji',
  staff_advance: 'Staff Advance',
  petty_cash: 'Petty Cash',
  tip_out: 'Tip Out',
  cash_deposit: 'Cash Deposit',
  change_refill: 'Change Refill',
  other: 'Other',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function labelForReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM yyyy, HH:mm')
  } catch {
    return '—'
  }
}

function InfoRow({
  label,
  icon,
  value,
  className,
}: {
  label: string
  icon?: React.ReactNode
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
        {icon}
        {label}
      </div>
      <div className={cn('text-sm font-medium text-right', className)}>{value}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CashTransactionDetailPage() {
  const { transactionId } = Route.useParams()
  const { data, isLoading, isError } = useGlobalCashTransaction(transactionId)
  const tx = data?.data

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/reports/cash-transactions"
            search={{ reason: undefined, type: undefined, shift_id: undefined, branch_id: undefined, date_from: undefined, date_to: undefined }}
          >
            <ArrowLeftIcon className="size-4 mr-1" />
            Back to transactions
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Cash Transaction Detail"
        description={tx ? `${labelForReason(tx.reason)} — ${formatDateTime(tx.created_at)}` : 'Loading…'}
      />

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : isError || !tx ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          Transaction not found or failed to load.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Main detail card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardListIcon className="size-4 text-muted-foreground" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow
                label="Amount"
                value={
                  <span className={cn(
                    'text-xl font-bold tabular-nums',
                    tx.type === 'cash_in'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400',
                  )}>
                    {tx.type === 'cash_in' ? '+' : '−'}{formatIDR(tx.amount)}
                  </span>
                }
              />
              <Separator className="my-1" />
              <InfoRow
                label="Type"
                value={
                  <Badge
                    variant="secondary"
                    className={cn(
                      'gap-1',
                      tx.type === 'cash_in'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400',
                    )}
                  >
                    {tx.type === 'cash_in'
                      ? <><ArrowUpIcon className="size-3" />Cash In</>
                      : <><ArrowDownIcon className="size-3" />Cash Out</>}
                  </Badge>
                }
              />
              <Separator className="my-1" />
              <InfoRow
                label="Reason"
                value={<span className="font-semibold">{labelForReason(tx.reason)}</span>}
              />
              <Separator className="my-1" />
              <InfoRow
                label="Note"
                value={
                  tx.note
                    ? <span className="max-w-[240px] text-right leading-relaxed">{tx.note}</span>
                    : <span className="italic text-muted-foreground">No note provided</span>
                }
              />
              <Separator className="my-1" />
              <InfoRow
                label="Date"
                icon={<CalendarIcon className="size-3.5" />}
                value={formatDateTime(tx.created_at)}
              />
            </CardContent>
          </Card>

          {/* Context card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="size-4 text-muted-foreground" />
                Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow
                label="Cashier"
                icon={<UserIcon className="size-3.5" />}
                value={tx.user_name}
              />
              <Separator className="my-1" />
              <InfoRow
                label="Branch"
                icon={<BuildingIcon className="size-3.5" />}
                value={tx.shift_branch_name}
              />
              <Separator className="my-1" />
              <InfoRow
                label="Transaction ID"
                icon={<HashIcon className="size-3.5" />}
                value={
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                    {tx.id}
                  </code>
                }
              />
              <Separator className="my-1" />
              <InfoRow
                label="Shift ID"
                icon={<HashIcon className="size-3.5" />}
                value={
                  <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                    {tx.shift_id}
                  </code>
                }
              />
              <Separator className="my-1" />
              <div className="pt-3">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link
                    to="/reports/cash-transactions"
                    search={{ reason: undefined, type: undefined, shift_id: tx.shift_id, branch_id: undefined, date_from: undefined, date_to: undefined }}
                  >
                    View all transactions in this shift
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
