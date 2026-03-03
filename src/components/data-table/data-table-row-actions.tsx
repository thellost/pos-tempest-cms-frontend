import { MoreHorizontalIcon } from 'lucide-react'
import type { Row } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RowAction<TData> {
  /** Menu item label */
  label: string
  /** Optional lucide icon */
  icon?: React.ElementType
  /** Called with the row's original data when clicked */
  onClick: (row: TData) => void
  /** 'destructive' renders the item in red. Default: 'default' */
  variant?: 'default' | 'destructive'
  /** Return true to hide this action for a particular row */
  hidden?: (row: TData) => boolean
  /** Return true to disable (greyed-out) this action for a particular row */
  disabled?: (row: TData) => boolean
  /** Render a separator line BEFORE this action */
  separator?: boolean
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
  actions: RowAction<TData>[]
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic "⋯" row actions menu. Pass an array of `RowAction` objects —
 * visibility and disabled state can vary per-row via predicate functions.
 *
 * Usage in a column definition:
 * ```tsx
 * {
 *   id: 'actions',
 *   cell: ({ row }) => (
 *     <DataTableRowActions
 *       row={row}
 *       actions={[
 *         { label: 'Edit', icon: PencilIcon, onClick: (u) => navigate({ to: `/users/${u.id}` }) },
 *         { label: 'Deactivate', icon: BanIcon, variant: 'destructive', separator: true,
 *           onClick: (u) => setDeactivateTarget(u),
 *           hidden: (u) => !u.is_active },
 *       ]}
 *     />
 *   ),
 * }
 * ```
 */
export function DataTableRowActions<TData>({
  row,
  actions,
}: DataTableRowActionsProps<TData>) {
  const visibleActions = actions.filter(
    (action) => !action.hidden?.(row.original),
  )

  if (visibleActions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          aria-label="Open row actions"
        >
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[160px]">
        {visibleActions.map((action, index) => (
          <div key={`${action.label}-${index}`}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className={cn(
                action.variant === 'destructive' &&
                  'text-destructive focus:text-destructive',
              )}
              disabled={action.disabled?.(row.original) ?? false}
              onClick={() => action.onClick(row.original)}
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
