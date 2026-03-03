import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import {
  useBranches,
  useCreateBranch,
  useDeactivateBranch,
  useUpdateBranch,
} from '@/hooks/use-branches'
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '@/lib/services/branches'
import { getBranchColumns } from '@/components/branches/columns'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/branches/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: BranchesPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { value: 'IDR', label: 'IDR — Indonesian Rupiah' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { value: 'THB', label: 'THB — Thai Baht' },
  { value: 'PHP', label: 'PHP — Philippine Peso' },
  { value: 'VND', label: 'VND — Vietnamese Dong' },
]

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB, UTC+7)' },
  { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA, UTC+8)' },
  { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT, UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Asia/Kuala_Lumpur (MYT, UTC+8)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT, UTC+7)' },
  { value: 'Asia/Manila', label: 'Asia/Manila (PHT, UTC+8)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT, UTC+7)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT, UTC+11)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function BranchesPage() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const { data, isLoading } = useBranches({ page, pageSize })
  const deactivateMutation = useDeactivateBranch()

  const columns = useMemo(
    () =>
      getBranchColumns({
        onEdit: (branch) => {
          setEditingBranch(branch)
          setDialogOpen(true)
        },
        onDeactivate: (branch) => {
          setDeactivateTarget(branch)
          setDeactivateOpen(true)
        },
        isAdmin,
      }),
    [isAdmin],
  )

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingBranch(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Manage all restaurant branches."
        actions={
          isAdmin ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              Add Branch
            </Button>
          ) : undefined
        }
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
        emptyMessage="No branches found."
      />

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
          else setDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? 'Edit Branch' : 'Add Branch'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            {/* key forces the form to remount with fresh defaultValues */}
            <BranchForm
              key={editingBranch?.id ?? 'new'}
              branch={editingBranch ?? undefined}
              onSuccess={closeDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation ── */}
      <ConfirmDialog
        title={`Deactivate "${deactivateTarget?.name}"?`}
        description="This branch will be marked inactive. You can reactivate it later by editing the branch."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={deactivateMutation.isPending}
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
          setDeactivateOpen(open)
        }}
        onConfirm={() => {
          if (!deactivateTarget) return
          deactivateMutation.mutate(deactivateTarget.id, {
            onSuccess: () => {
              setDeactivateOpen(false)
              setDeactivateTarget(null)
            },
          })
        }}
      />
    </div>
  )
}

// ─── Branch Form ──────────────────────────────────────────────────────────────

interface BranchFormProps {
  branch?: Branch
  onSuccess: () => void
}

function BranchForm({ branch, onSuccess }: BranchFormProps) {
  const isEdit = !!branch
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()

  const form = useAppForm({
    defaultValues: {
      name: branch?.name ?? '',
      address: branch?.address ?? '',
      phone: branch?.phone ?? '',
      tax_rate: branch?.tax_rate ?? 11,
      service_charge_rate: branch?.service_charge_rate ?? 0,
      currency: branch?.currency ?? 'IDR',
      timezone: branch?.timezone ?? 'Asia/Jakarta',
      is_active: branch?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      const base = {
        name: value.name,
        address: value.address?.trim() || undefined,
        phone: value.phone?.trim() || undefined,
        tax_rate: Number(value.tax_rate),
        service_charge_rate: Number(value.service_charge_rate),
        currency: value.currency,
        timezone: value.timezone,
      }

      if (isEdit && branch) {
        const payload: UpdateBranchPayload = { ...base, is_active: value.is_active }
        await updateMutation.mutateAsync({ id: branch.id, payload })
      } else {
        const payload: CreateBranchPayload = base
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
      {/* Name */}
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Branch name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Branch Name"
            placeholder="e.g. Tempest Cafe - Sudirman"
          />
        )}
      </form.AppField>

      {/* Address */}
      <form.AppField name="address">
        {(field) => (
          <field.TextareaField
            label="Address"
            placeholder="Street address (optional)"
            rows={2}
          />
        )}
      </form.AppField>

      {/* Phone */}
      <form.AppField
        name="phone"
        validators={{
          onChange: ({ value }) => {
            if (value && value.length > 20) return 'Max 20 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Phone"
            placeholder="+62 21 555 0100 (optional)"
            type="tel"
          />
        )}
      </form.AppField>

      {/* Tax Rate + Service Charge */}
      <div className="grid grid-cols-2 gap-4">
        <form.AppField
          name="tax_rate"
          validators={{
            onChange: ({ value }) => {
              const n = Number(value)
              if (isNaN(n) || n < 0 || n > 100) return 'Must be 0–100'
              return undefined
            },
          }}
        >
          {(field) => (
            <field.NumberField
              label="Tax Rate"
              suffix="%"
              min={0}
              max={100}
              step={0.5}
            />
          )}
        </form.AppField>

        <form.AppField
          name="service_charge_rate"
          validators={{
            onChange: ({ value }) => {
              const n = Number(value)
              if (isNaN(n) || n < 0 || n > 100) return 'Must be 0–100'
              return undefined
            },
          }}
        >
          {(field) => (
            <field.NumberField
              label="Service Charge"
              suffix="%"
              min={0}
              max={100}
              step={0.5}
            />
          )}
        </form.AppField>
      </div>

      {/* Currency + Timezone */}
      <div className="grid grid-cols-2 gap-4">
        <form.AppField name="currency">
          {(field) => (
            <field.SelectField
              label="Currency"
              options={CURRENCY_OPTIONS}
            />
          )}
        </form.AppField>

        <form.AppField name="timezone">
          {(field) => (
            <field.SelectField
              label="Timezone"
              options={TIMEZONE_OPTIONS}
            />
          )}
        </form.AppField>
      </div>

      {/* Is Active (edit only) */}
      {isEdit && (
        <form.AppField name="is_active">
          {(field) => (
            <field.SwitchField
              label="Active"
              description="Inactive branches are hidden from the POS app."
            />
          )}
        </form.AppField>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Create Branch'}
            className="w-auto min-w-[130px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
