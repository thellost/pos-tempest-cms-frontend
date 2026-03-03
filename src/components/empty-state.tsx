import { InboxIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /**
   * Icon to display. Defaults to an inbox icon.
   * Pass a Lucide icon element: `<SearchIcon className="size-10 text-muted-foreground" />`
   */
  icon?: React.ReactNode
  title?: string
  description?: string
  /** Optional CTA button label. Renders a button if provided alongside `onAction`. */
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon,
  title = 'No results found',
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className,
      )}
    >
      <div className="text-muted-foreground">
        {icon ?? <InboxIcon className="size-10" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
