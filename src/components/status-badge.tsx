import { cn } from '@/lib/utils'

// ─── Status → colour mapping ──────────────────────────────────────────────────
//
// Green   → active, available, completed, paid, open (shift)
// Yellow  → pending, reserved, partial, confirmed (reservation)
// Red     → cancelled, inactive, unpaid, maintenance, closed (shift)
// Blue    → confirmed (order), preparing, ready, seated
// Purple  → served, refunded
// Gray    → unknown / fallback

type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray'

const STATUS_COLORS: Record<string, StatusColor> = {
  // Generic active / inactive
  active: 'green',
  inactive: 'red',

  // Table statuses
  available: 'green',
  occupied: 'blue',
  reserved: 'yellow',
  maintenance: 'red',

  // Order statuses
  pending: 'yellow',
  confirmed: 'blue',
  preparing: 'blue',
  ready: 'blue',
  served: 'purple',
  completed: 'green',
  cancelled: 'red',

  // Payment statuses
  paid: 'green',
  unpaid: 'red',
  partial: 'yellow',
  refunded: 'purple',

  // Reservation statuses
  seated: 'blue',
  no_show: 'red',

  // Shift statuses
  open: 'green',
  closed: 'gray',

  // Device statuses  (already covered by active/inactive above)
}

const COLOR_CLASSES: Record<StatusColor, string> = {
  green:
    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  yellow:
    'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  purple:
    'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  gray: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
}

/** Formats a raw status string into a readable label (snake_case → Title Case). */
function formatLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

interface StatusBadgeProps {
  /** The raw backend status string (e.g. "no_show", "paid", "active") */
  status: string
  /** Override the display label */
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const color = STATUS_COLORS[status.toLowerCase()] ?? 'gray'
  const colorClasses = COLOR_CLASSES[color]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        colorClasses,
        className,
      )}
    >
      {label ?? formatLabel(status)}
    </span>
  )
}
