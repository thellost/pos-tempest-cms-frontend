import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { format, parseISO, subDays } from 'date-fns'
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { useCancelCashTransaction, useGlobalCashTransactions, useReactivateCashTransaction } from '@/hooks/use-sales-cash-flow'
import { useAuth } from '@/hooks/use-auth'
import { useBranches } from '@/hooks/use-branches'
import { useCashTransactionReasonLabels } from '@/hooks/use-cash-reasons'
import { PageHeader } from '@/components/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { requireRole } from '@/lib/auth-guards'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/reports/cash-transactions/')({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: typeof search.reason === 'string' ? search.reason : undefined,
    type:
      search.type === 'cash_in' || search.type === 'cash_out'
        ? (search.type)
        : undefined,
    shift_id: typeof search.shift_id === 'string' ? search.shift_id : undefined,
    branch_id:
      typeof search.branch_id === 'string' ? Number(search.branch_id) : undefined,
    date_from: typeof search.date_from === 'string' ? search.date_from : undefined,
    date_to: typeof search.date_to === 'string' ? search.date_to : undefined,
  }),
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: CashTransactionsPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'dd MMM yyyy, HH:mm')
  } catch {
    return '—'
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CashTransactionsPage() {
  const { reason, type, shift_id, branch_id, date_from, date_to } = Route.useSearch()
  const navigate = useNavigate()
  const { branchId: userBranchId } = useAuth()
  const { data: branchesData } = useBranches()
  const branches = branchesData?.data ?? []

  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultFrom = format(subDays(new Date(), 29), 'yyyy-MM-dd')

  const [filterReason, setFilterReason] = useState(reason ?? '')
  const [filterType, setFilterType] = useState<'all' | 'cash_in' | 'cash_out'>(type ?? 'all')
  const [filterBranchId, setFilterBranchId] = useState<number | undefined>(branch_id ?? userBranchId ?? undefined)
  const [filterDateFrom, setFilterDateFrom] = useState(date_from ?? defaultFrom)
  const [filterDateTo, setFilterDateTo] = useState(date_to ?? today)
  const [page, setPage] = useState(1)

  const filters = {
    reason: filterReason || undefined,
    type: filterType === 'all' ? undefined : filterType,
    shiftId: shift_id,
    branchId: filterBranchId,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    page,
    pageSize: 25,
  }

  const { data, isLoading, isError } = useGlobalCashTransactions(filters)
  const transactions = data?.data ?? []
  const meta = data?.meta

  const { labelForReason, reasonOptions } = useCashTransactionReasonLabels(filterBranchId)
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const cancelMutation = useCancelCashTransaction()
  const reactivateMutation = useReactivateCashTransaction()

  function handleFilterChange() {
    setPage(1)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/reports/expenses">
            <ArrowLeftIcon className="size-4 mr-1" />
            Back to Expense Report
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Cash Transactions"
        description={
          reason
            ? `Showing transactions for reason: ${labelForReason(reason)}`
            : 'All manual shift cash transactions.'
        }
      />

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-3">
            <Select
              value={filterReason || 'all'}
              onValueChange={(v) => { setFilterReason(v === 'all' ? '' : v); handleFilterChange() }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {reasonOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterType}
              onValueChange={(v) => { setFilterType(v as 'all' | 'cash_in' | 'cash_out'); handleFilterChange() }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="cash_in">Cash In</SelectItem>
                <SelectItem value="cash_out">Cash Out</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterBranchId !== undefined ? String(filterBranchId) : 'all'}
              onValueChange={(v) => { setFilterBranchId(v === 'all' ? undefined : Number(v)); handleFilterChange() }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); handleFilterChange() }}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); handleFilterChange() }}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              />
            </div>
          </div>

          {(filterReason || filterType !== 'all' || shift_id) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filterReason && (
                <Badge variant="secondary" className="gap-1">
                  Reason: {labelForReason(filterReason)}
                </Badge>
              )}
              {filterType !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {filterType === 'cash_in' ? 'Cash In only' : 'Cash Out only'}
                </Badge>
              )}
              {shift_id && (
                <Badge variant="secondary" className="gap-1 font-mono text-xs">
                  Shift: {shift_id.slice(0, 8)}…
                </Badge>
              )}
              <button
                className="text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => {
                  setFilterReason('')
                  setFilterType('all')
                  void navigate({ to: '/reports/cash-transactions', search: { reason: undefined, type: undefined, shift_id: undefined, branch_id: undefined, date_from: undefined, date_to: undefined } })
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : isError ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          Failed to load transactions. Please try again.
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No transactions found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Note</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cashier</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Branch</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className={cn(
                  'border-b last:border-0 hover:bg-muted/30 transition-colors',
                  !tx.is_active && 'opacity-60',
                )}>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatDateTime(tx.created_at)}
                  </td>
                  <td className={cn('px-4 py-3 font-medium', !tx.is_active && 'line-through')}>
                    {labelForReason(tx.reason)}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className={cn(
                    'px-4 py-3 text-right tabular-nums font-semibold',
                    tx.type === 'cash_in'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400',
                  )}>
                    {tx.type === 'cash_in' ? '+' : '−'}{formatIDR(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {tx.note ?? <span className="italic opacity-50">no note</span>}
                  </td>
                  <td className="px-4 py-3">{tx.user_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tx.shift_branch_name}</td>
                  <td className="px-4 py-3">
                    {tx.is_active ? (
                      <Badge variant="secondary" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 text-xs">
                        Canceled
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                        {tx.reason === 'purchase_order' ? (
                          <Link
                            to="/purchases"
                            search={{ date_from: tx.created_at ? tx.created_at.slice(0, 10) : undefined, date_to: tx.created_at ? tx.created_at.slice(0, 10) : undefined }}
                          >
                            <ExternalLinkIcon className="size-3.5" />
                            <span className="sr-only">View purchase orders</span>
                          </Link>
                        ) : (
                          <Link
                            to="/reports/cash-transactions/$transactionId"
                            params={{ transactionId: tx.id }}
                          >
                            <ExternalLinkIcon className="size-3.5" />
                            <span className="sr-only">View detail</span>
                          </Link>
                        )}
                      </Button>
                      {isAdmin && (
                        tx.is_active ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs cursor-pointer"
                            disabled={cancelMutation.isPending}
                            onClick={() =>
                              cancelMutation.mutate({ id: tx.id, shiftId: tx.shift_id })
                            }
                          >
                            {cancelMutation.isPending ? 'Canceling…' : 'Cancel'}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs cursor-pointer"
                            disabled={reactivateMutation.isPending}
                            onClick={() =>
                              reactivateMutation.mutate({ id: tx.id, shiftId: tx.shift_id })
                            }
                          >
                            {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate'}
                          </Button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {meta.total_pages} ({meta.total.toLocaleString('id-ID')} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ArrowLeftIcon className="size-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
