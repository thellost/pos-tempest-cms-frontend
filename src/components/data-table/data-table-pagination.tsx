import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaginationMeta } from '@/lib/api-client'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTablePaginationProps {
  /** Pagination meta returned by the API (total, total_pages, etc.) */
  meta?: PaginationMeta
  pagination: { page: number; pageSize: number }
  onPaginationChange: (pagination: { page: number; pageSize: number }) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTablePagination({
  meta,
  pagination,
  onPaginationChange,
}: DataTablePaginationProps) {
  const { page, pageSize } = pagination
  const totalPages = meta?.total_pages ?? 1
  const total = meta?.total ?? 0

  return (
    <div className="flex flex-col items-center gap-3 px-2 py-4 sm:flex-row sm:justify-between sm:gap-4">
      {/* Total count */}
      <p className="hidden text-sm text-muted-foreground sm:block">
        {total === 0
          ? 'No results'
          : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
      </p>

      <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <p className="hidden text-sm font-medium lg:block">Rows per page</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              onPaginationChange({ page: 1, pageSize: Number(value) })
            }
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="flex w-auto min-w-[80px] items-center justify-center text-sm font-medium">
          Page {page} of {totalPages}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPaginationChange({ page: 1, pageSize })}
            disabled={page <= 1}
            aria-label="Go to first page"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPaginationChange({ page: page - 1, pageSize })}
            disabled={page <= 1}
            aria-label="Go to previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPaginationChange({ page: page + 1, pageSize })}
            disabled={page >= totalPages}
            aria-label="Go to next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPaginationChange({ page: totalPages, pageSize })}
            disabled={page >= totalPages}
            aria-label="Go to last page"
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
