import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableSkeletonProps {
  /** Number of data columns to render skeleton cells for */
  columnCount: number
  /** Number of skeleton rows to render. Defaults to 10. */
  rowCount?: number
  /** Whether to include a leading checkbox column */
  withCheckbox?: boolean
  /** Whether to show an actions column on the right */
  withActions?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  withCheckbox = false,
  withActions = false,
}: DataTableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {withCheckbox && (
            <TableHead className="w-10">
              <Skeleton className="h-4 w-4" />
            </TableHead>
          )}
          {Array.from({ length: columnCount }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-24" />
            </TableHead>
          ))}
          {withActions && (
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>

      <TableBody>
        {Array.from({ length: rowCount }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {withCheckbox && (
              <TableCell className="w-10">
                <Skeleton className="h-4 w-4" />
              </TableCell>
            )}
            {Array.from({ length: columnCount }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                {/* Vary widths so skeleton looks natural */}
                <Skeleton
                  className={
                    colIndex === 0
                      ? 'h-4 w-36'
                      : colIndex % 3 === 0
                        ? 'h-4 w-20'
                        : 'h-4 w-28'
                  }
                />
              </TableCell>
            ))}
            {withActions && (
              <TableCell className="w-10">
                <Skeleton className="h-8 w-8 rounded-md" />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
