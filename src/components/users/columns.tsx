import type { ColumnDef } from '@tanstack/react-table'
import { BanIcon, PencilIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/services/users'

// ─── Role badge colours ────────────────────────────────────────────────────────

const ROLE_BADGE_CLASS: Record<string, string> = {
  admin:
    'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  manager:
    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  cashier:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  chef: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  waiter:
    'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetUserColumnsOptions {
  onEdit: (user: User) => void
  onDeactivate: (user: User) => void
  /** True when the current user has admin or manager role */
  canManage: boolean
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getUserColumns({
  onEdit,
  onDeactivate,
  canManage,
}: GetUserColumnsOptions): ColumnDef<User>[] {
  return [
    {
      id: 'user',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => {
        const user = row.original
        const initials = user.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()

        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) =>
        row.original.phone ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'role_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const role = row.original.role_name
        return (
          <Badge
            variant="outline"
            className={cn(ROLE_BADGE_CLASS[role] ?? '')}
          >
            {role}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'branch_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) =>
        row.original.branch_name ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'is_active',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      accessorKey: 'last_login_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Login" />
      ),
      cell: ({ row }) => {
        const date = row.original.last_login_at
        if (!date)
          return <span className="text-muted-foreground">Never</span>
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          actions={[
            {
              label: 'Edit',
              icon: PencilIcon,
              onClick: onEdit,
              hidden: () => !canManage,
            },
            {
              label: 'Deactivate',
              icon: BanIcon,
              variant: 'destructive',
              separator: true,
              onClick: onDeactivate,
              hidden: (user) => !canManage || !user.is_active,
            },
          ]}
        />
      ),
    },
  ]
}
