import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAppForm } from '@/hooks/use-form'
import {
  useDiscounts,
  useActiveDiscounts,
  useCreateDiscount,
  useUpdateDiscount,
  useDeleteDiscount,
} from '@/hooks/use-discounts'
import type {
  Discount,
  CreateDiscountPayload,
  UpdateDiscountPayload,
} from '@/lib/services/discounts'
import { getDiscountColumns } from '@/components/discounts/columns'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/discounts/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: DiscountsPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function DiscountsPage() {
  // Pagination (all discounts tab)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: allData, isLoading: allLoading } = useDiscounts({ page, pageSize })
  const { data: activeData, isLoading: activeLoading } = useActiveDiscounts()
  const deleteMutation = useDeleteDiscount()

  const columns = useMemo(
    () =>
      getDiscountColumns({
        onEdit: (discount) => {
          setEditingDiscount(discount)
          setDialogOpen(true)
        },
        onDelete: (discount) => {
          setDeleteTarget(discount)
          setDeleteOpen(true)
        },
      }),
    [],
  )

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingDiscount(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        description="Create and manage promotional discounts applied at checkout."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Discount
          </Button>
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Discounts</TabsTrigger>
          <TabsTrigger value="active">Active Now</TabsTrigger>
        </TabsList>

        {/* ── All Discounts ── */}
        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={columns}
            data={allData?.data ?? []}
            meta={allData?.meta}
            isLoading={allLoading}
            pagination={{ page, pageSize }}
            onPaginationChange={({ page: p, pageSize: ps }) => {
              setPage(p)
              setPageSize(ps)
            }}
            emptyMessage="No discounts found. Click 'Add Discount' to create one."
          />
        </TabsContent>

        {/* ── Active Now ── */}
        <TabsContent value="active" className="mt-4">
          <DataTable
            columns={columns}
            data={activeData?.data ?? []}
            isLoading={activeLoading}
            pagination={{ page: 1, pageSize: 100 }}
            onPaginationChange={() => {}}
            hidePagination
            emptyMessage="No active discounts right now."
          />
        </TabsContent>
      </Tabs>

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
              {editingDiscount ? 'Edit Discount' : 'Add Discount'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-1">
            <DiscountForm
              key={editingDiscount?.id ?? 'new'}
              discount={editingDiscount ?? undefined}
              onSuccess={closeDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        title={`Delete "${deleteTarget?.name}"?`}
        description="This discount will be permanently removed. Orders that already used this discount will not be affected."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
          setDeleteOpen(open)
        }}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteOpen(false)
              setDeleteTarget(null)
            },
          })
        }}
      />
    </div>
  )
}

// ─── Discount Form ────────────────────────────────────────────────────────────

const DISCOUNT_TYPE_OPTIONS = [
  {
    value: 'percentage',
    label: 'Percentage',
    description: 'Deduct a % from the order total',
  },
  {
    value: 'fixed_amount',
    label: 'Fixed Amount',
    description: 'Deduct a fixed currency amount',
  },
]

interface DiscountFormProps {
  discount?: Discount
  onSuccess: () => void
}

function DiscountForm({ discount, onSuccess }: DiscountFormProps) {
  const isEdit = !!discount
  const createMutation = useCreateDiscount()
  const updateMutation = useUpdateDiscount()

  const form = useAppForm({
    defaultValues: {
      name: discount?.name ?? '',
      description: discount?.description ?? '',
      discount_type: discount?.discount_type ?? 'percentage',
      value: discount?.value ?? 0,
      min_order_amount: discount?.min_order_amount ?? null,
      max_discount_amount: discount?.max_discount_amount ?? null,
      valid_from: discount?.valid_from ? discount.valid_from.slice(0, 10) : '',
      valid_until: discount?.valid_until ? discount.valid_until.slice(0, 10) : '',
      is_active: discount?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      const discountType = value.discount_type as 'percentage' | 'fixed_amount'

      const base = {
        name: value.name,
        description: value.description?.trim() || undefined,
        discount_type: discountType,
        value: Number(value.value),
        min_order_amount:
          value.min_order_amount != null
            ? Number(value.min_order_amount)
            : undefined,
        max_discount_amount:
          discountType === 'percentage' && value.max_discount_amount != null
            ? Number(value.max_discount_amount)
            : undefined,
        valid_from: value.valid_from ? `${value.valid_from}T00:00:00Z` : undefined,
        valid_until: value.valid_until ? `${value.valid_until}T23:59:59Z` : undefined,
      }

      if (isEdit && discount) {
        const payload: UpdateDiscountPayload = {
          ...base,
          min_order_amount:
            base.min_order_amount != null ? base.min_order_amount : null,
          max_discount_amount:
            base.max_discount_amount != null ? base.max_discount_amount : null,
          valid_from: base.valid_from ?? null,
          valid_until: base.valid_until ?? null,
          is_active: value.is_active,
        }
        await updateMutation.mutateAsync({ id: discount.id, payload })
      } else {
        const payload: CreateDiscountPayload = base
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
            if (!value?.trim()) return 'Discount name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Name"
            placeholder="e.g. Weekend Special 10%"
          />
        )}
      </form.AppField>

      {/* Description */}
      <form.AppField name="description">
        {(field) => (
          <field.TextareaField
            label="Description"
            placeholder="Optional description shown to staff (optional)"
            rows={2}
          />
        )}
      </form.AppField>

      {/* Discount Type */}
      <form.AppField name="discount_type">
        {(field) => (
          <field.RadioGroupField
            label="Discount Type"
            options={DISCOUNT_TYPE_OPTIONS}
          />
        )}
      </form.AppField>

      {/* Value */}
      <form.Subscribe selector={(s) => s.values.discount_type}>
        {(discountType) => (
          <form.AppField
            name="value"
            validators={{
              onChange: ({ value }) => {
                const n = Number(value)
                if (isNaN(n) || n <= 0) return 'Value must be greater than 0'
                if (discountType === 'percentage' && n > 100)
                  return 'Percentage cannot exceed 100%'
                return undefined
              },
            }}
          >
            {(field) => (
              <field.NumberField
                label="Value"
                min={0}
                step={discountType === 'percentage' ? 0.5 : 1}
                suffix={discountType === 'percentage' ? '%' : undefined}
              />
            )}
          </form.AppField>
        )}
      </form.Subscribe>

      {/* Min Order Amount */}
      <form.AppField
        name="min_order_amount"
        validators={{
          onChange: ({ value }) => {
            if (value == null) return undefined
            const n = Number(value)
            if (isNaN(n) || n < 0) return 'Must be 0 or greater'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Minimum Order Amount"
            placeholder="No minimum"
            min={0}
            step={1000}
          />
        )}
      </form.AppField>

      {/* Max Discount Amount (percentage only) */}
      <form.Subscribe selector={(s) => s.values.discount_type}>
        {(discountType) =>
          discountType === 'percentage' ? (
            <form.AppField
              name="max_discount_amount"
              validators={{
                onChange: ({ value }) => {
                  if (value == null) return undefined
                  const n = Number(value)
                  if (isNaN(n) || n < 0) return 'Must be 0 or greater'
                  return undefined
                },
              }}
            >
              {(field) => (
                <field.NumberField
                  label="Maximum Discount Amount"
                  placeholder="No cap"
                  min={0}
                  step={1000}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>

      {/* Valid From / Until */}
      <div className="grid grid-cols-2 gap-4">
        <form.AppField name="valid_from">
          {(field) => (
            <field.DatePickerField label="Valid From" placeholder="No start date" />
          )}
        </form.AppField>

        <form.AppField name="valid_until">
          {(field) => (
            <field.DatePickerField
              label="Valid Until"
              placeholder="No end date"
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
              description="Inactive discounts cannot be applied at checkout."
            />
          )}
        </form.AppField>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Create Discount'}
            className="w-auto min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
