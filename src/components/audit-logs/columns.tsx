import { Badge } from '@/components/ui/badge'
import type { AuditAction, AuditLog } from '@/lib/services/audit-logs'

// ─── Action badge config ───────────────────────────────────────────────────────

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface ActionConfig {
  label: string
  variant: BadgeVariant
  className: string
}

const ACTION_CONFIG: Record<AuditAction, ActionConfig> = {
  INSERT: {
    label: 'INSERT',
    variant: 'default',
    className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
  },
  UPDATE: {
    label: 'UPDATE',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
  },
  DELETE: {
    label: 'DELETE',
    variant: 'default',
    className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
  },
  LOGIN: {
    label: 'LOGIN',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200',
  },
  LOGOUT: {
    label: 'LOGOUT',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200',
  },
  VOID: {
    label: 'VOID',
    variant: 'default',
    className:
      'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
  },
  REFUND: {
    label: 'REFUND',
    variant: 'default',
    className:
      'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
  },
  PRINT: {
    label: 'PRINT',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200',
  },
  OPEN_DRAWER: {
    label: 'OPEN_DRAWER',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200',
  },
  OVERRIDE: {
    label: 'OVERRIDE',
    variant: 'default',
    className:
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200',
  },
  STATUS_CHANGE: {
    label: 'STATUS_CHANGE',
    variant: 'default',
    className:
      'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200',
  },
}

export function ActionBadge({ action }: { action: AuditAction }) {
  const config = ACTION_CONFIG[action] ?? {
    label: action,
    variant: 'outline' as BadgeVariant,
    className: '',
  }
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

// ─── Date formatter ────────────────────────────────────────────────────────────

export function formatAuditDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ─── JSON diff renderer ────────────────────────────────────────────────────────

/**
 * Computes which keys changed between old and new values.
 * Returns a map of key → { old, new } for changed/added/removed fields.
 */
export function computeDiff(
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
): Array<{ key: string; oldVal: string; newVal: string; changed: boolean }> {
  const allKeys = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ])
  const rows: Array<{
    key: string
    oldVal: string
    newVal: string
    changed: boolean
  }> = []
  for (const key of allKeys) {
    const oldVal = oldValues?.[key]
    const newVal = newValues?.[key]
    const oldStr =
      oldVal === undefined || oldVal === null ? '—' : JSON.stringify(oldVal)
    const newStr =
      newVal === undefined || newVal === null ? '—' : JSON.stringify(newVal)
    rows.push({ key, oldVal: oldStr, newVal: newStr, changed: oldStr !== newStr })
  }
  return rows.sort((a, b) => {
    // Changed fields first
    if (a.changed !== b.changed) return a.changed ? -1 : 1
    return a.key.localeCompare(b.key)
  })
}

// ─── Table name options (for filter select) ────────────────────────────────────

export const TABLE_NAME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'branches', label: 'branches' },
  { value: 'users', label: 'users' },
  { value: 'menu_items', label: 'menu_items' },
  { value: 'orders', label: 'orders' },
  { value: 'order_items', label: 'order_items' },
  { value: 'order_payments', label: 'order_payments' },
  { value: 'inventory', label: 'inventory' },
  { value: 'inventory_movements', label: 'inventory_movements' },
  { value: 'purchases', label: 'purchases' },
  { value: 'purchase_items', label: 'purchase_items' },
  { value: 'customers', label: 'customers' },
  { value: 'reservations', label: 'reservations' },
  { value: 'shifts', label: 'shifts' },
  { value: 'tables', label: 'tables' },
  { value: 'categories', label: 'categories' },
  { value: 'discounts', label: 'discounts' },
  { value: 'modifier_groups', label: 'modifier_groups' },
  { value: 'modifiers', label: 'modifiers' },
  { value: 'suppliers', label: 'suppliers' },
  { value: 'tax_configs', label: 'tax_configs' },
  { value: 'devices', label: 'devices' },
]

export const ACTION_OPTIONS: Array<{ value: AuditAction; label: string }> = [
  { value: 'INSERT', label: 'INSERT' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'VOID', label: 'VOID' },
  { value: 'REFUND', label: 'REFUND' },
  { value: 'PRINT', label: 'PRINT' },
  { value: 'OPEN_DRAWER', label: 'OPEN_DRAWER' },
  { value: 'OVERRIDE', label: 'OVERRIDE' },
  { value: 'STATUS_CHANGE', label: 'STATUS_CHANGE' },
]

// Re-export type for convenience
export type { AuditLog }
