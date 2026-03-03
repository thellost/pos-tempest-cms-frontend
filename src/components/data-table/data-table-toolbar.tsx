import { SlidersHorizontalIcon } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  /**
   * Filter controls rendered on the left (search input, selects, date pickers).
   * Pass these as children from each list page.
   */
  children?: React.ReactNode
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Toolbar that sits above the table. Provides:
 * - Left slot (`children`) for page-specific filter controls.
 * - Right-side column visibility toggle dropdown.
 *
 * Usage:
 * ```tsx
 * <DataTableToolbar table={table}>
 *   <Input placeholder="Search…" … />
 *   <Select … />
 * </DataTableToolbar>
 * ```
 */
export function DataTableToolbar<TData>({
  table,
  children,
}: DataTableToolbarProps<TData>) {
  const hidableColumns = table
    .getAllColumns()
    .filter((col) => col.getCanHide())

  return (
    <div className="flex items-start justify-between gap-2 py-4">
      {/* Left slot: filter controls */}
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>

      {/* Right: column visibility */}
      {hidableColumns.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-8 shrink-0"
            >
              <SlidersHorizontalIcon className="mr-2 h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {hidableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {/* Convert snake_case / camelCase id to human-readable label */}
                {column.id.replace(/[_-]/g, ' ')}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
