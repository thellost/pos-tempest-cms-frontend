import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ChevronDownIcon, ChevronRightIcon, ShieldAlertIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { useBranches } from '@/hooks/use-branches'
import { useUsers } from '@/hooks/use-users'
import {
  ActionBadge,
  ACTION_OPTIONS,
  TABLE_NAME_OPTIONS,
  computeDiff,
  formatAuditDate,
} from '@/components/audit-logs/columns'
import type { AuditAction, AuditLog } from '@/lib/services/audit-logs'
import { PageHeader } from '@/components/page-header'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/audit-logs/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: AuditLogsPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function AuditLogsPage() {
  const { branchId: userBranchId } = useAuth()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [userId, setUserId] = useState('')
  const [branchId, setBranchId] = useState(userBranchId ? String(userBranchId) : '1')
  const [action, setAction] = useState('')
  const [tableName, setTableName] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // Filter option data
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const { data: usersData } = useUsers({ pageSize: 200 })

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const userOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((u) => ({
        value: String(u.id),
        label: u.name,
      })),
    [usersData],
  )

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      userId: userId ? parseInt(userId, 10) : undefined,
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      action: (action || undefined) as AuditAction | undefined,
      tableName: tableName || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    }),
    [userId, branchId, action, tableName, dateFrom, dateTo, page, pageSize],
  )

  const { data, isLoading } = useAuditLogs(queryFilters)
  const logs = data?.data ?? []

  const hasActiveFilters = !!(
    userId ||
    branchId ||
    action ||
    tableName ||
    dateFrom ||
    dateTo
  )

  function clearFilters() {
    setUserId('')
    setBranchId('1')
    setAction('')
    setTableName('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Read-only history of all actions performed in the system."
      />

      {/* Filter bar */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* User */}
          <div className="space-y-1.5">
            <Label className="text-xs">User</Label>
            <Select
              value={userId || '_all'}
              onValueChange={(v) => {
                setUserId(v === '_all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All users</SelectItem>
                {userOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch */}
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <Select
              value={branchId || '_all'}
              onValueChange={(v) => {
                setBranchId(v === '_all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All branches</SelectItem>
                {branchOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <Label className="text-xs">Action</Label>
            <Select
              value={action || '_all'}
              onValueChange={(v) => {
                setAction(v === '_all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All actions</SelectItem>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Table Name</Label>
            <Select
              value={tableName || '_all'}
              onValueChange={(v) => {
                setTableName(v === '_all' ? '' : v)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All tables</SelectItem>
                {TABLE_NAME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Date range + controls */}
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Date From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
              className="h-9 w-full min-w-[130px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
              className="h-9 w-full min-w-[130px]"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Expand toggle column */}
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead className="max-w-xs">Description</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              /* Skeleton rows */
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-16 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ShieldAlertIcon className="size-8 opacity-30" />
                    <span className="text-sm">No audit log entries found.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  isExpanded={expanded.has(log.id)}
                  onToggle={() => toggleExpand(log.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination
        meta={data?.meta}
        pagination={{ page, pageSize }}
        onPaginationChange={({ page: p, pageSize: ps }) => {
          setPage(p)
          setPageSize(ps)
        }}
      />
    </div>
  )
}

// ─── Audit Log Row ─────────────────────────────────────────────────────────────

interface AuditLogRowProps {
  log: AuditLog
  isExpanded: boolean
  onToggle: () => void
}

function AuditLogRow({ log, isExpanded, onToggle }: AuditLogRowProps) {
  const diffRows = useMemo(
    () => computeDiff(log.old_values, log.new_values),
    [log.old_values, log.new_values],
  )
  const hasValues = log.old_values !== null || log.new_values !== null

  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer transition-colors',
          isExpanded && 'bg-muted/40',
        )}
        onClick={onToggle}
      >
        {/* Expand icon */}
        <TableCell className="w-8 pr-0">
          {hasValues ? (
            isExpanded ? (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            )
          ) : (
            <span className="inline-block size-4" />
          )}
        </TableCell>

        {/* Timestamp */}
        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
          {formatAuditDate(log.created_at)}
        </TableCell>

        {/* User */}
        <TableCell className="text-sm">
          {log.user_name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Branch */}
        <TableCell className="text-sm text-muted-foreground">
          {log.branch_name ?? '—'}
        </TableCell>

        {/* Action */}
        <TableCell>
          <ActionBadge action={log.action} />
        </TableCell>

        {/* Table name */}
        <TableCell>
          {log.table_name ? (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {log.table_name}
            </code>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Record ID */}
        <TableCell className="text-sm text-muted-foreground">
          {log.record_id ?? '—'}
        </TableCell>

        {/* Description */}
        <TableCell className="max-w-xs truncate text-sm">
          {log.description ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* IP Address */}
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.ip_address ?? '—'}
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={9} className="pb-4 pt-2">
            <div className="space-y-4 pl-6">
              {/* Values diff */}
              {hasValues && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Value Changes
                  </p>
                  <div className="overflow-auto rounded border text-xs">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium">
                            Field
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Old Value
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3}
                              className="px-3 py-2 text-muted-foreground"
                            >
                              No field data available.
                            </td>
                          </tr>
                        ) : (
                          diffRows.map((row) => (
                            <tr
                              key={row.key}
                              className={cn(
                                'border-b last:border-0',
                                row.changed && 'bg-yellow-50 dark:bg-yellow-950/20',
                              )}
                            >
                              <td className="px-3 py-1.5">
                                <code className="font-mono">{row.key}</code>
                                {row.changed && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 border-yellow-300 bg-yellow-100 px-1 py-0 text-[10px] text-yellow-800"
                                  >
                                    changed
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                <code
                                  className={cn(
                                    'font-mono',
                                    row.changed &&
                                      'text-red-700 dark:text-red-400',
                                  )}
                                >
                                  {row.oldVal}
                                </code>
                              </td>
                              <td className="px-3 py-1.5">
                                <code
                                  className={cn(
                                    'font-mono',
                                    row.changed &&
                                      'text-green-700 dark:text-green-400',
                                  )}
                                >
                                  {row.newVal}
                                </code>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
                {log.session_id && (
                  <span>
                    <span className="font-medium text-foreground">Session:</span>{' '}
                    <code>{log.session_id}</code>
                  </span>
                )}
                {log.user_agent && (
                  <span className="max-w-md truncate">
                    <span className="font-medium text-foreground">
                      User Agent:
                    </span>{' '}
                    {log.user_agent}
                  </span>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
