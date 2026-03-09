import { useEffect, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { InboxIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PaginationMeta } from '@/lib/api-client'
import { DataTablePagination } from './data-table-pagination'
import { DataTableSkeleton } from './data-table-skeleton'
import { DataTableToolbar } from './data-table-toolbar'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableProps<TData, TValue> {
  /** TanStack Table column definitions */
  columns: ColumnDef<TData, TValue>[]
  /** Row data (current page — comes straight from the API) */
  data: TData[]
  /**
   * Pagination metadata from the API response (`meta` field).
   * When provided, the pagination bar shows totals and page counts.
   */
  meta?: PaginationMeta
  /** Show skeleton rows instead of real data while fetching */
  isLoading?: boolean
  /** Current pagination state passed down from the page */
  pagination: { page: number; pageSize: number }
  /** Called when the user changes page or page size */
  onPaginationChange: (pagination: { page: number; pageSize: number }) => void
  /**
   * Sorting state (server-side). Pass `sorting` + `onSortingChange` from the
   * parent page to propagate sort params to the API. Leave undefined to use
   * local (client-side) sorting.
   */
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  /**
   * Slot for filter controls rendered above the table (search, selects, etc.).
   * Passed directly into `DataTableToolbar`.
   */
  toolbar?: React.ReactNode
  /** Message shown when `data` is empty and `isLoading` is false */
  emptyMessage?: string
  /** Hide the toolbar entirely (e.g. for embedded/read-only tables) */
  hideToolbar?: boolean
  /** Hide the pagination bar (e.g. for small embedded tables) */
  hidePagination?: boolean
  /** Initial column visibility state (e.g. for hiding columns on mobile) */
  initialColumnVisibility?: Record<string, boolean>
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic server-side data table.
 *
 * Wraps `@tanstack/react-table` + shadcn `Table` with:
 * - Sortable column headers (`DataTableColumnHeader`)
 * - Column visibility toggle (`DataTableToolbar`)
 * - Skeleton loading state (`DataTableSkeleton`)
 * - Pagination bar with page size selector (`DataTablePagination`)
 * - Empty state
 *
 * All pagination and (optionally) sorting is server-side — this component
 * never fetches data itself.
 *
 * Usage:
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={data ?? []}
 *   meta={meta}
 *   isLoading={isLoading}
 *   pagination={{ page, pageSize }}
 *   onPaginationChange={({ page, pageSize }) => { setPage(page); setPageSize(pageSize) }}
 *   toolbar={<Input placeholder="Search…" … />}
 * />
 * ```
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  meta,
  isLoading = false,
  pagination,
  onPaginationChange,
  sorting: externalSorting,
  onSortingChange,
  toolbar,
  emptyMessage = 'No results found.',
  hideToolbar = false,
  hidePagination = false,
  initialColumnVisibility,
}: DataTableProps<TData, TValue>) {
  // Local state for sorting (used when caller doesn't provide server-side sorting)
  const [localSorting, setLocalSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(initialColumnVisibility ?? {})

  // Sync column visibility when responsive breakpoint changes
  const initialVisibilityKey = JSON.stringify(initialColumnVisibility)
  useEffect(() => {
    if (initialColumnVisibility) {
      setColumnVisibility(initialColumnVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVisibilityKey])

  const isServerSideSorting = externalSorting !== undefined && onSortingChange !== undefined
  const sorting = isServerSideSorting ? externalSorting : localSorting
  const handleSortingChange = isServerSideSorting
    ? (updater: SortingState | ((prev: SortingState) => SortingState)) => {
        const next = typeof updater === 'function' ? updater(externalSorting) : updater
        onSortingChange(next)
      }
    : (updater: SortingState | ((prev: SortingState) => SortingState)) => {
        setLocalSorting((prev) =>
          typeof updater === 'function' ? updater(prev) : updater,
        )
      }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      // Tell TanStack Table the current page so it renders the right row count.
      // We use manual pagination so it doesn't slice the data itself.
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      },
    },
    // ── Server-side pagination ──────────────────────────────────────────────
    manualPagination: true,
    pageCount: meta?.total_pages ?? -1,
    onPaginationChange: (updater) => {
      const currentState = {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      }
      const next =
        typeof updater === 'function' ? updater(currentState) : updater
      onPaginationChange({
        page: next.pageIndex + 1,
        pageSize: next.pageSize,
      })
    },
    // ── Sorting ────────────────────────────────────────────────────────────
    manualSorting: isServerSideSorting,
    onSortingChange: handleSortingChange as Parameters<typeof useReactTable>[0]['onSortingChange'],
    // ── Column visibility ──────────────────────────────────────────────────
    onColumnVisibilityChange: setColumnVisibility,
    // ── Row models ─────────────────────────────────────────────────────────
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="space-y-2">
      {/* ── Toolbar ── */}
      {!hideToolbar && (
        <DataTableToolbar table={table}>{toolbar}</DataTableToolbar>
      )}

      {/* ── Table ── */}
      <div className="rounded-md border">
        {isLoading ? (
          <DataTableSkeleton
            columnCount={columns.length}
            rowCount={pagination.pageSize}
            withActions={columns.some((c) => (c as { id?: string }).id === 'actions')}
          />
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <InboxIcon className="h-8 w-8 opacity-40" />
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!hidePagination && (
        <DataTablePagination
          meta={meta}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      )}
    </div>
  )
}
