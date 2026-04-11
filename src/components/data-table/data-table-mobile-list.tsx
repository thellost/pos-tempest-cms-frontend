import { flexRender, type Column, type Row, type Table } from '@tanstack/react-table'
import { InboxIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface DataTableMobileListProps<TData> {
  table: Table<TData>
  /**
   * Pre-computed rows from the parent's render scope.
   * Passing these explicitly ensures React detects data changes
   * even when the `table` object reference stays the same.
   */
  rows?: Row<TData>[]
  isLoading?: boolean
  rowCount?: number
  emptyMessage?: string
  onRowClick?: (row: TData) => void
}

interface MobileColumnMeta {
  mobileTitle?: boolean
  mobileLabel?: string
  mobileOrder?: number
  mobileHidden?: boolean
}

function toLabel(id: string) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getColumnLabel(column: Column<unknown, unknown>) {
  const meta = getMobileMeta(column)
  if (meta?.mobileLabel) return meta.mobileLabel

  const header = column.columnDef.header
  if (typeof header === 'string') return header
  return toLabel(column.id)
}

function getMobileMeta(column: Column<unknown, unknown>): MobileColumnMeta | null {
  const meta = column.columnDef.meta
  if (!meta || typeof meta !== 'object') return null
  return meta as MobileColumnMeta
}

export function DataTableMobileList<TData>({
  table,
  rows: propRows,
  isLoading = false,
  rowCount = 10,
  emptyMessage = 'No results found.',
  onRowClick,
}: DataTableMobileListProps<TData>) {
  if (isLoading) {
    return (
      <div className="mobile-edge-safe-px space-y-2 py-1">
        {Array.from({ length: Math.max(3, Math.min(rowCount, 8)) }).map((_, idx) => (
          <div key={idx} className="rounded-lg border bg-card p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-11 w-11 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const rows = propRows ?? table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <div className="mobile-edge-safe-px py-10">
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-muted-foreground">
          <InboxIcon className="h-8 w-8 opacity-40" />
          <p className="text-sm text-center">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-edge-safe-px space-y-2 py-1">
      {rows.map((row) => {
        const visibleCells = row.getVisibleCells()
        const actionsCell = visibleCells.find((cell) => cell.column.id === 'actions')
        const detailCells = visibleCells.filter((cell) => {
          if (cell.column.id === 'actions') return false
          const meta = getMobileMeta(cell.column as Column<unknown, unknown>)
          return !meta?.mobileHidden
        })

        const titleCell =
          detailCells.find((cell) => {
            const meta = getMobileMeta(cell.column as Column<unknown, unknown>)
            return !!meta?.mobileTitle
          }) ?? detailCells[0]

        const metadataCells = detailCells
          .filter((cell) => cell.id !== titleCell?.id)
          .sort((a, b) => {
            const aOrder = getMobileMeta(a.column as Column<unknown, unknown>)?.mobileOrder ?? 99
            const bOrder = getMobileMeta(b.column as Column<unknown, unknown>)?.mobileOrder ?? 99
            return aOrder - bOrder
          })
          .slice(0, 3)

        return (
          <div
            key={row.id}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            onKeyDown={
              onRowClick
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onRowClick(row.original)
                    }
                  }
                : undefined
            }
            className={cn(
              'rounded-lg border bg-card p-3 text-card-foreground shadow-sm',
              onRowClick && 'cursor-pointer active:bg-muted/50',
            )}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {titleCell ? (
                  <div className="truncate text-sm font-medium">
                    {flexRender(titleCell.column.columnDef.cell, titleCell.getContext())}
                  </div>
                ) : (
                  <div className="text-sm font-medium text-muted-foreground">Row</div>
                )}
              </div>

              {actionsCell && (
                <div
                  className="shrink-0"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
                </div>
              )}
            </div>

            {metadataCells.length > 0 && (
              <div className="mobile-space-y text-sm">
                {metadataCells.map((cell) => (
                  <div key={cell.id} className="grid grid-cols-[minmax(92px,auto)_1fr] items-start gap-2">
                    <span className="text-muted-foreground">
                      {getColumnLabel(cell.column as Column<unknown, unknown>)}
                    </span>
                    <span className="min-w-0 break-words">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
