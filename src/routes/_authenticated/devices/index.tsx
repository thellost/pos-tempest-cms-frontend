import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import {
  useDevices,
  useCreateDevice,
  useUpdateDevice,
  useUpdateDeviceStatus,
} from '@/hooks/use-devices'
import { useBranches } from '@/hooks/use-branches'
import type {
  Device,
  CreateDevicePayload,
  UpdateDevicePayload,
} from '@/lib/services/devices'
import { getDeviceColumns } from '@/components/devices/columns'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/devices/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: DevicesPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function DevicesPage() {
  const isMobile = useIsMobile()
  const { role, branchId: userBranchId } = useAuth()
  const canManage = role === 'admin' || role === 'manager'

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter state — default to user's branch so the backend requirement is met
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '',
  })

  // Register / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)

  // Status change confirmation (used for both activate & deactivate)
  const [statusTarget, setStatusTarget] = useState<Device | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  // Queries
  const { data: branchesData } = useBranches({ pageSize: 100 })

  const queryFilters = useMemo(
    () => ({
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      page,
      pageSize,
    }),
    [filterValues, page, pageSize],
  )

  const { data, isLoading } = useDevices(queryFilters)
  const statusMutation = useUpdateDeviceStatus()

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const columns = useMemo(
    () =>
      getDeviceColumns({
        onEdit: (device) => {
          setEditingDevice(device)
          setDialogOpen(true)
        },
        onToggleStatus: (device) => {
          setStatusTarget(device)
          setStatusDialogOpen(true)
        },
        canManage,
      }),
    [canManage],
  )

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingDevice(null)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterValues({ branch_id: '' })
    setPage(1)
  }

  const isDeactivating = statusTarget?.status === 'active'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Manage registered POS terminals and tablets."
        actions={
          canManage ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              Register Device
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        filters={[
          {
            type: 'select',
            key: 'branch_id',
            label: 'Branch',
            options: branchOptions,
            allLabel: 'All branches',
          },
        ]}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        pagination={{ page, pageSize }}
        onPaginationChange={({ page: p, pageSize: ps }) => {
          setPage(p)
          setPageSize(ps)
        }}
        initialColumnVisibility={isMobile ? { device_uid: false, branch_name: false, registered_at: false } : {}}
        emptyMessage="No devices registered yet."
      />

      {/* ── Register / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
          else setDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? 'Edit Device' : 'Register Device'}
            </DialogTitle>
          </DialogHeader>
          <DeviceForm
            key={editingDevice?.id ?? 'new'}
            device={editingDevice ?? undefined}
            branchOptions={branchOptions}
            onSuccess={closeDialog}
          />
        </DialogContent>
      </Dialog>

      {/* ── Status Change Confirmation ── */}
      <ConfirmDialog
        title={
          isDeactivating
            ? `Deactivate "${statusTarget?.device_name}"?`
            : `Activate "${statusTarget?.device_name}"?`
        }
        description={
          isDeactivating
            ? 'This will prevent the device from connecting to the POS app. You can reactivate it at any time.'
            : 'This device will be allowed to connect to the POS app.'
        }
        confirmLabel={isDeactivating ? 'Deactivate' : 'Activate'}
        variant={isDeactivating ? 'destructive' : 'default'}
        isLoading={statusMutation.isPending}
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null)
          setStatusDialogOpen(open)
        }}
        onConfirm={() => {
          if (!statusTarget) return
          const nextStatus =
            statusTarget.status === 'active' ? 'inactive' : 'active'
          statusMutation.mutate(
            { id: statusTarget.id, status: nextStatus },
            {
              onSuccess: () => {
                setStatusDialogOpen(false)
                setStatusTarget(null)
              },
            },
          )
        }}
      />
    </div>
  )
}

// ─── Device Form ──────────────────────────────────────────────────────────────

interface DeviceFormProps {
  device?: Device
  branchOptions: { value: string; label: string }[]
  onSuccess: () => void
}

function DeviceForm({ device, branchOptions, onSuccess }: DeviceFormProps) {
  const isEdit = !!device
  const createMutation = useCreateDevice()
  const updateMutation = useUpdateDevice()

  const form = useAppForm({
    defaultValues: {
      branch_id: device?.branch_id ? String(device.branch_id) : '',
      device_uid: device?.device_uid ?? '',
      device_name: device?.device_name ?? '',
    },
    onSubmit: async ({ value }) => {
      if (isEdit && device) {
        const payload: UpdateDevicePayload = {
          device_name: value.device_name,
        }
        await updateMutation.mutateAsync({ id: device.id, payload })
      } else {
        const payload: CreateDevicePayload = {
          branch_id: parseInt(value.branch_id, 10),
          device_uid: value.device_uid.trim(),
          device_name: value.device_name.trim(),
        }
        await createMutation.mutateAsync(payload)
      }
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4 pb-2"
    >
      {/* Branch */}
      <form.AppField
        name="branch_id"
        validators={{
          onChange: ({ value }) => {
            if (!value) return 'Branch is required'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.SelectField
            label="Branch"
            options={branchOptions}
            placeholder="Select a branch"
            disabled={isEdit}
          />
        )}
      </form.AppField>

      {/* Device UID */}
      <form.AppField
        name="device_uid"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Device UID is required'
            if (value.length > 36) return 'Max 36 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Device UID"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            description={
              isEdit
                ? undefined
                : 'Unique hardware identifier generated by the POS app on first launch.'
            }
            disabled={isEdit}
          />
        )}
      </form.AppField>

      {/* Device Name */}
      <form.AppField
        name="device_name"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Device name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Device Name"
            placeholder="e.g. Counter 1, Kitchen Tablet, Bar Terminal"
          />
        )}
      </form.AppField>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Register Device'}
            className="w-auto min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
