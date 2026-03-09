import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAppForm } from '@/hooks/use-form'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
} from '@/hooks/use-suppliers'
import type {
  Supplier,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '@/lib/services/suppliers'
import { getSupplierColumns } from '@/components/suppliers/columns'
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
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/suppliers/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: SuppliersPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function SuppliersPage() {
  const isMobile = useIsMobile()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  const { data, isLoading } = useSuppliers({ page, pageSize })

  const columns = useMemo(
    () =>
      getSupplierColumns({
        onEdit: (supplier) => {
          setEditingSupplier(supplier)
          setDialogOpen(true)
        },
      }),
    [],
  )

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingSupplier(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers for inventory and purchase orders."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Supplier
          </Button>
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
        initialColumnVisibility={isMobile ? { contact_person: false, email: false, address: false } : {}}
        emptyMessage="No suppliers found. Click 'Add Supplier' to create one."
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
              {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-1">
            <SupplierForm
              key={editingSupplier?.id ?? 'new'}
              supplier={editingSupplier ?? undefined}
              onSuccess={closeDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Supplier Form ────────────────────────────────────────────────────────────

interface SupplierFormProps {
  supplier?: Supplier
  onSuccess: () => void
}

function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const isEdit = !!supplier
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()

  const form = useAppForm({
    defaultValues: {
      name: supplier?.name ?? '',
      contact_person: supplier?.contact_person ?? '',
      phone: supplier?.phone ?? '',
      email: supplier?.email ?? '',
      address: supplier?.address ?? '',
      is_active: supplier?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      if (isEdit && supplier) {
        const payload: UpdateSupplierPayload = {
          name: value.name,
          contact_person: value.contact_person?.trim() || null,
          phone: value.phone?.trim() || null,
          email: value.email?.trim() || null,
          address: value.address?.trim() || null,
          is_active: value.is_active,
        }
        await updateMutation.mutateAsync({ id: supplier.id, payload })
      } else {
        const payload: CreateSupplierPayload = {
          name: value.name,
          contact_person: value.contact_person?.trim() || undefined,
          phone: value.phone?.trim() || undefined,
          email: value.email?.trim() || undefined,
          address: value.address?.trim() || undefined,
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
      {/* Name */}
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Supplier name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Name"
            placeholder="e.g. PT Sumber Pangan"
          />
        )}
      </form.AppField>

      {/* Contact Person */}
      <form.AppField
        name="contact_person"
        validators={{
          onChange: ({ value }) => {
            if (value && value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Contact Person"
            placeholder="e.g. Andi Wijaya (optional)"
          />
        )}
      </form.AppField>

      {/* Phone */}
      <form.AppField name="phone">
        {(field) => (
          <field.TextField
            label="Phone"
            placeholder="e.g. 021-5551111 (optional)"
          />
        )}
      </form.AppField>

      {/* Email */}
      <form.AppField
        name="email"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return undefined
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(value)) return 'Enter a valid email address'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Email"
            placeholder="e.g. contact@supplier.com (optional)"
          />
        )}
      </form.AppField>

      {/* Address */}
      <form.AppField name="address">
        {(field) => (
          <field.TextareaField
            label="Address"
            placeholder="Full address (optional)"
            rows={3}
          />
        )}
      </form.AppField>

      {/* Is Active (edit only) */}
      {isEdit && (
        <form.AppField name="is_active">
          {(field) => (
            <field.SwitchField
              label="Active"
              description="Inactive suppliers will not appear in purchase order creation."
            />
          )}
        </form.AppField>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Create Supplier'}
            className="w-auto min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
