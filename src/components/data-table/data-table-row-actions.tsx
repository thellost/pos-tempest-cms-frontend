import { useState, type ElementType } from 'react'
import { MoreHorizontalIcon } from 'lucide-react'
import type { Row } from '@tanstack/react-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RowAction<TData> {
  /** Menu item label */
  label: string
  /** Optional lucide icon */
  icon?: ElementType
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
  const isMobile = useIsMobile()
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)

  const visibleActions = actions.filter(
    (action) => !action.hidden?.(row.original),
  )

  if (visibleActions.length === 0) return null

  const handleActionClick = (action: RowAction<TData>) => {
    action.onClick(row.original)
    if (isMobile) {
      setIsMobileSheetOpen(false)
    }
  }

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      className="touch-target-icon data-[state=open]:bg-muted"
      aria-label="Open row actions"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <MoreHorizontalIcon className="h-4 w-4" />
    </Button>
  )

  if (isMobile) {
    return (
      <div
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <Button
            type="button"
            variant="ghost"
            className="touch-target-icon"
            aria-label="Open row actions"
            onClick={(event) => {
              event.stopPropagation()
              setIsMobileSheetOpen(true)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>

          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="mobile-safe-pb rounded-t-xl px-0 pb-0"
            onPointerDownOutside={(event) => {
              event.preventDefault()
              setIsMobileSheetOpen(false)
            }}
          >
            <SheetHeader className="px-4 pb-2 pt-4">
              <SheetTitle>Row actions</SheetTitle>
              <SheetDescription>Choose an action for this item.</SheetDescription>
            </SheetHeader>

            <div className="px-2 pb-2">
              {visibleActions.map((action, index) => (
                <div key={`${action.label}-${index}`}>
                  {action.separator && index > 0 && <div className="mx-2 my-1 h-px bg-border" />}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={action.disabled?.(row.original) ?? false}
                    className={cn(
                      'touch-target w-full justify-start gap-2 rounded-md px-3 text-left',
                      action.variant === 'destructive' &&
                        'text-destructive hover:text-destructive',
                    )}
                    onClick={(event) => {
                      event.stopPropagation()
                      handleActionClick(action)
                    }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    {action.icon && <action.icon className="h-4 w-4" />}
                    {action.label}
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="touch-target mt-2 w-full"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsMobileSheetOpen(false)
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                Cancel
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[180px] mobile-safe-pb" sideOffset={8}>
          {visibleActions.map((action, index) => (
            <div key={`${action.label}-${index}`}>
              {action.separator && index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                className={cn(
                  'touch-target',
                  action.variant === 'destructive' &&
                    'text-destructive focus:text-destructive',
                )}
                disabled={action.disabled?.(row.original) ?? false}
                onClick={() => handleActionClick(action)}
              >
                {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                {action.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
