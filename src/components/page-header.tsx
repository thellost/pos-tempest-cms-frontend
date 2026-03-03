import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  /** Slot for action buttons (e.g. "Add User") rendered on the right */
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="mt-3 flex shrink-0 items-center gap-2 sm:mt-0 sm:ml-4">
          {actions}
        </div>
      )}
    </div>
  )
}
