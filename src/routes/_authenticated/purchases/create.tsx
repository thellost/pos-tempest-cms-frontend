import { useState, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useCreatePurchase } from '@/hooks/use-purchases'
import { useBranches } from '@/hooks/use-branches'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useAppForm } from '@/hooks/use-form'
import type { CreatePurchasePayload } from '@/lib/services/purchases'
import {
  PurchaseItemsFieldArray,
  createPurchaseItemRow,
  type PurchaseItemRow,
} from '@/components/purchases/purchase-items-field-array'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatIDR } from '@/components/purchases/columns'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/purchases/create')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: CreatePurchasePage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function CreatePurchasePage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a purchase order from a supplier. Once received, inventory will be updated automatically."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/purchases' })}
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Purchase Orders
          </Button>
        }
      />
      <div className="mx-auto max-w-4xl">
        <PurchaseOrderForm
          onSuccess={(id) =>
            navigate({ to: '/purchases/$purchaseId', params: { purchaseId: String(id) } })
          }
        />
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface PurchaseOrderFormProps {
  onSuccess: (id: number) => void
}

function PurchaseOrderForm({ onSuccess }: PurchaseOrderFormProps) {
  const { branchId: userBranchId } = useAuth()
  const createMutation = useCreatePurchase()

  const [items, setItems] = useState<PurchaseItemRow[]>([createPurchaseItemRow()])

  // Branch options
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
    [branchesData],
  )

  // Supplier options
  const { data: suppliersData } = useSuppliers({ pageSize: 100 })
  const supplierOptions = useMemo(
    () =>
      (suppliersData?.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    [suppliersData],
  )

  // Computed totals
  const itemsSubtotal = items.reduce(
    (sum, r) => sum + r.quantity * r.cost_per_unit,
    0,
  )

  const form = useAppForm({
    defaultValues: {
      supplier_id: null as number | null,
      branch_id: userBranchId ?? (null as number | null),
      notes: '',
      tax_amount: 0 as number,
    },
    onSubmit: async ({ value }) => {
      // Validate items have a menu item selected
      const validItems = items.filter((r) => r.inventory_id !== null)

      const payload: CreatePurchasePayload = {
        supplier_id: value.supplier_id!,
        branch_id: value.branch_id!,
        notes: value.notes?.trim() || undefined,
        tax_amount: Number(value.tax_amount) || 0,
        items: validItems.map((r) => ({
          inventory_id: r.inventory_id!,
          quantity: r.quantity,
          unit_of_measure: r.unit_of_measure,
          cost_per_unit: r.cost_per_unit,
        })),
      }

      const result = await createMutation.mutateAsync(payload)
      onSuccess(result.data.id)
    },
  })

  const grandTotal = itemsSubtotal + (Number(form.state.values.tax_amount) || 0)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      {/* ── Header section ── */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Supplier */}
            <form.AppField
              name="supplier_id"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'Supplier is required' : undefined,
              }}
            >
              {(field) => (
                <field.ComboboxField
                  label="Supplier"
                  options={supplierOptions}
                  placeholder="Select supplier…"
                  searchPlaceholder="Search suppliers…"
                  emptyMessage="No suppliers found."
                />
              )}
            </form.AppField>

            {/* Branch */}
            <form.AppField
              name="branch_id"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'Branch is required' : undefined,
              }}
            >
              {(field) => (
                <field.ComboboxField
                  label="Branch"
                  options={branchOptions}
                  placeholder="Select branch…"
                  searchPlaceholder="Search branches…"
                  emptyMessage="No branches found."
                />
              )}
            </form.AppField>
          </div>

          {/* Notes */}
          <form.AppField name="notes">
            {(field) => (
              <field.TextareaField
                label="Notes"
                placeholder="e.g. Weekly vegetable order"
                rows={2}
              />
            )}
          </form.AppField>
        </CardContent>
      </Card>

      {/* ── Line items ── */}
      <form.Subscribe selector={(s) => s.values.branch_id}>
        {(branchId) => (
          <PurchaseItemsFieldArray
            rows={items}
            onChange={setItems}
            branchId={branchId ?? undefined}
          />
        )}
      </form.Subscribe>

      {/* ── Totals ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="ml-auto max-w-xs space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Items Subtotal</span>
              <span>{formatIDR(itemsSubtotal)}</span>
            </div>

            {/* Tax amount */}
            <div className="space-y-1">
              <form.AppField name="tax_amount">
                {(field) => (
                  <field.NumberField
                    label="Tax Amount"
                    prefix="Rp"
                    min={0}
                    step={1000}
                    placeholder="0"
                  />
                )}
              </form.AppField>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold">{formatIDR(grandTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Submit ── */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <form.AppForm>
          <form.SubscribeButton label="Create Purchase Order" />
        </form.AppForm>
      </div>
    </form>
  )
}
