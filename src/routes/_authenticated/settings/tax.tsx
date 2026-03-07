import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAppForm } from '@/hooks/use-form'
import { useBranches, useUpdateBranch } from '@/hooks/use-branches'
import type { Branch, UpdateBranchPayload } from '@/lib/services/branches'
import { getTaxConfigColumns } from '@/components/tax-configs/columns'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { requireRole } from '@/lib/auth-guards'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/settings/tax')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: TaxConfigPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function TaxConfigPage() {
  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const { data, isLoading } = useBranches({ page, pageSize })

  const columns = useMemo(
    () =>
      getTaxConfigColumns({
        onEdit: (branch) => {
          setEditingBranch(branch)
          setDialogOpen(true)
        },
      }),
    [],
  )

  const closeDialog = () => {
    setDialogOpen(false)
    // Defer key change until after the dialog close animation to avoid
    // Radix / React removeChild DOM conflicts
    setTimeout(() => setEditingBranch(null), 200)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Configuration"
        description="Manage tax rate and service charge per branch."
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

      {/* ── Edit Dialog ── */}
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
              {editingBranch
                ? `Edit Tax Settings — ${editingBranch.name}`
                : 'Edit Tax Settings'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-1">
            {editingBranch && (
              <BranchTaxForm
                key={editingBranch.id}
                branch={editingBranch}
                onSuccess={closeDialog}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Branch Tax Form ──────────────────────────────────────────────────────────

interface BranchTaxFormProps {
  branch: Branch
  onSuccess: () => void
}

function BranchTaxForm({ branch, onSuccess }: BranchTaxFormProps) {
  const updateMutation = useUpdateBranch()

  const form = useAppForm({
    defaultValues: {
      tax_rate: branch.tax_rate,
      service_charge_rate: branch.service_charge_rate,
      currency: branch.currency,
    },
    onSubmit: async ({ value }) => {
      const payload: UpdateBranchPayload = {
        tax_rate: Number(value.tax_rate),
        service_charge_rate: Number(value.service_charge_rate),
        currency: value.currency.trim().toUpperCase(),
      }
      await updateMutation.mutateAsync({ id: branch.id, payload })
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
      {/* Tax Rate */}
      <form.AppField
        name="tax_rate"
        validators={{
          onChange: ({ value }) => {
            const n = Number(value)
            if (isNaN(n) || n < 0) return 'Tax rate must be 0 or greater'
            if (n > 100) return 'Tax rate cannot exceed 100%'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Tax Rate"
            min={0}
            max={100}
            step={0.01}
            suffix="%"
            placeholder="e.g. 10"
          />
        )}
      </form.AppField>

      {/* Service Charge Rate */}
      <form.AppField
        name="service_charge_rate"
        validators={{
          onChange: ({ value }) => {
            const n = Number(value)
            if (isNaN(n) || n < 0) return 'Service charge must be 0 or greater'
            if (n > 100) return 'Service charge cannot exceed 100%'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Service Charge"
            min={0}
            max={100}
            step={0.01}
            suffix="%"
            placeholder="e.g. 5"
          />
        )}
      </form.AppField>

      {/* Currency */}
      <form.AppField
        name="currency"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Currency is required'
            if (value.trim().length !== 3) return 'Must be a 3-letter currency code (e.g. IDR)'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Currency"
            placeholder="e.g. IDR"
          />
        )}
      </form.AppField>

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Save Changes"
            className="w-auto min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

