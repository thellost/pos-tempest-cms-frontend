import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAppForm } from '@/hooks/use-form'
import { useReceivePurchase } from '@/hooks/use-sales-cash-flow'
import { formatIDR } from '@/components/purchases/columns'
import type { Purchase } from '@/lib/services/sales-cash-flow'

interface RecordPaymentDialogProps {
  purchase: Purchase | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Shared dialog for receiving / making a payment against a purchase order.
 * Used from both the purchases list and the purchase detail page so the UX
 * (amount + optional notes) stays consistent.
 */
export function RecordPaymentDialog({
  purchase,
  open,
  onOpenChange,
  onSuccess,
}: RecordPaymentDialogProps) {
  const receiveMutation = useReceivePurchase()

  const isPartialReceived = purchase?.status === 'partial_received'
  const remaining = purchase
    ? purchase.total - (purchase.paid_amount ?? 0)
    : 0
  const defaultAmount = purchase
    ? remaining > 0
      ? remaining
      : purchase.total
    : 0

  const form = useAppForm({
    defaultValues: { paid_amount: 0, notes: '' },
    onSubmit: async ({ value }) => {
      if (!purchase) return
      await receiveMutation.mutateAsync({
        id: purchase.id,
        payload: {
          paid_amount: Number(value.paid_amount),
          notes: value.notes?.trim() || undefined,
        },
      })
      onOpenChange(false)
      onSuccess?.()
    },
  })

  // Reset form whenever the dialog opens for a new purchase target.
  useEffect(() => {
    if (open && purchase) {
      form.setFieldValue('paid_amount', defaultAmount)
      form.setFieldValue('notes', '')
    }
  }, [open, purchase?.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPartialReceived ? 'Make Payment' : 'Mark as Received'}
          </DialogTitle>
          <DialogDescription>
            {isPartialReceived
              ? `Remaining balance: ${formatIDR(remaining)}. Enter the payment amount below.`
              : `Record payment for ${purchase?.purchase_number ?? 'this PO'}. Inventory will be updated on the first payment.`}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-4 pt-2"
        >
          <form.AppField name="paid_amount">
            {(field) => (
              <field.NumberField
                label="Payment Amount (IDR)"
                placeholder="0"
                min={1}
              />
            )}
          </form.AppField>

          <form.AppField name="notes">
            {(field) => (
              <field.TextareaField
                label="Notes (optional)"
                placeholder="e.g. All items received in good condition"
                rows={3}
              />
            )}
          </form.AppField>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={receiveMutation.isPending}
            >
              Cancel
            </Button>
            <form.AppForm>
              <form.SubscribeButton
                label={isPartialReceived ? 'Record Payment' : 'Mark Received'}
              />
            </form.AppForm>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
