import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, EyeOffIcon } from 'lucide-react'
import type { Column } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for a `<TableHead>` content area that adds a sort
 * direction dropdown and a "Hide column" option. Use it inside column defs:
 *
 * ```tsx
 * header: ({ column }) => (
 *   <DataTableColumnHeader column={column} title="Name" />
 * )
 * ```
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  // Non-sortable column — just render the label
  if (!column.getCanSort()) {
    return <div className={cn('text-sm font-medium', className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === 'desc' ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          {column.getIsSorted() && (
            <DropdownMenuItem onClick={() => column.clearSorting()}>
              <ChevronsUpDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
              Clear sort
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOffIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
