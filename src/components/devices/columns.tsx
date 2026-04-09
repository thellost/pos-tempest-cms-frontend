import type { ColumnDef } from '@tanstack/react-table'
import { PencilIcon, PowerIcon, PowerOffIcon } from 'lucide-react'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Device } from '@/lib/services/devices'

// ─── Props ────────────────────────────────────────────────────────────────────

interface GetDeviceColumnsOptions {
  onEdit: (device: Device) => void
  onToggleStatus: (device: Device) => void
  /** True when current user can manage devices (admin or manager) */
  canManage: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return <span className="text-muted-foreground">—</span>
  return (
    <span className="text-sm text-muted-foreground">
      {new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )
}

// ─── Column definitions ───────────────────────────────────────────────────────

export function getDeviceColumns({
  onEdit,
  onToggleStatus,
  canManage,
}: GetDeviceColumnsOptions): ColumnDef<Device>[] {
  return [
    {
      accessorKey: 'device_name',
      meta: { mobileTitle: true, mobileLabel: 'Device' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Device Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.device_name}</span>
      ),
    },
    {
      accessorKey: 'device_uid',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Device UID" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.device_uid}
        </span>
      ),
    },
    {
      accessorKey: 'branch_name',
      meta: { mobileOrder: 1, mobileLabel: 'Branch' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) =>
        row.original.branch_name ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'status',
      meta: { mobileOrder: 2, mobileLabel: 'Status' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const device = row.original
        const isActive = device.status === 'active'

        return (
          <div className="flex items-center gap-2">
            <StatusBadge status={device.status} />
            {canManage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleStatus(device)
                    }}
                  >
                    {isActive ? (
                      <PowerOffIcon className="size-3.5" />
                    ) : (
                      <PowerIcon className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isActive ? 'Deactivate device' : 'Activate device'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'registered_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Registered At" />
      ),
      cell: ({ row }) => formatDate(row.original.registered_at),
    },
    {
      accessorKey: 'last_seen_at',
      meta: { mobileOrder: 3, mobileLabel: 'Last Seen' },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Last Seen" />
      ),
      cell: ({ row }) => formatDate(row.original.last_seen_at),
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
              label: row.original.status === 'active' ? 'Deactivate' : 'Activate',
              icon:
                row.original.status === 'active' ? PowerOffIcon : PowerIcon,
              variant:
                row.original.status === 'active' ? 'destructive' : 'default',
              separator: true,
              onClick: onToggleStatus,
              hidden: () => !canManage,
            },
          ]}
        />
      ),
    },
  ]
}
