import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  PackageIcon,
} from 'lucide-react'
import { usePurchase, useReceivePurchase, useCancelPurchase } from '@/hooks/use-purchases'
import { useAppForm } from '@/hooks/use-form'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { requireRole } from '@/lib/auth-guards'
import { formatIDR } from '@/components/purchases/columns'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/purchases/$purchaseId')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: PurchaseDetailPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PurchaseDetailPage() {
  const { purchaseId } = Route.useParams()
  const id = parseInt(purchaseId, 10)

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const { data: result, isLoading } = usePurchase(id)
  const po = result?.data

  const receiveMutation = useReceivePurchase()
  const cancelMutation = useCancelPurchase()

  // ── Receive form ─────────────────────────────────────────────────────────

  const receiveForm = useAppForm({
    defaultValues: { notes: '' },
    onSubmit: async ({ value }) => {
      await receiveMutation.mutateAsync({
        id,
        payload: { notes: value.notes?.trim() || undefined },
      })
      setReceiveDialogOpen(false)
    },
  })

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <PurchaseDetailSkeleton />
  }

  if (!po) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Purchase order not found.
      </div>
    )
  }

  const isOrdered = po.status === 'ordered'
  const isTerminal = po.status === 'received' || po.status === 'cancelled'

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/purchases">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <PageHeader
          title={po.purchase_number}
          description={`${po.supplier_name} · ${po.branch_name}`}
          actions={
            isOrdered ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <XCircleIcon className="mr-2 size-4" />
                  Cancel PO
                </Button>
                <Button onClick={() => setReceiveDialogOpen(true)}>
                  <CheckCircleIcon className="mr-2 size-4" />
                  Mark Received
                </Button>
              </div>
            ) : null
          }
        />
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <StatusBadge status={po.status} />
        <span>Ordered: {formatDate(po.ordered_at)}</span>
        {po.received_at && <span>Received: {formatDate(po.received_at)}</span>}
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* PO Details */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="PO Number" value={<span className="font-mono">{po.purchase_number}</span>} />
            <InfoRow label="Supplier" value={po.supplier_name} />
            <InfoRow label="Branch" value={po.branch_name} />
            <InfoRow label="Ordered By" value={po.ordered_by_name} />
            {po.received_by_name && (
              <InfoRow label="Received By" value={po.received_by_name} />
            )}
            <InfoRow label="Status" value={<StatusBadge status={po.status} />} />
            {po.notes && (
              <>
                <Separator />
                <InfoRow label="Notes" value={<span className="max-w-[200px] text-right">{po.notes}</span>} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow label="Subtotal" value={formatIDR(po.subtotal)} />
            <InfoRow
              label="Tax Amount"
              value={
                <span className="text-muted-foreground">
                  {formatIDR(po.tax_amount)}
                </span>
              }
            />
            <Separator />
            <InfoRow
              label="Total"
              value={<span className="text-base font-bold">{formatIDR(po.total)}</span>}
            />
          </CardContent>
        </Card>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="size-4" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {po.items && po.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Menu Item</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Cost / Unit</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.menu_item_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity.toLocaleString('id-ID', { maximumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.unit_of_measure}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatIDR(item.cost_per_unit)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatIDR(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No items on this purchase order.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Mark Received Dialog ── */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark{' '}
            <span className="font-medium text-foreground">
              {po.purchase_number}
            </span>{' '}
            as received and automatically update inventory for all line items.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              receiveForm.handleSubmit()
            }}
            className="space-y-4 pt-2"
          >
            <receiveForm.AppField name="notes">
              {(field) => (
                <field.TextareaField
                  label="Notes (optional)"
                  placeholder="e.g. All items received in good condition"
                  rows={3}
                />
              )}
            </receiveForm.AppField>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceiveDialogOpen(false)}
              >
                Cancel
              </Button>
              <receiveForm.AppForm>
                <receiveForm.SubscribeButton label="Mark Received" />
              </receiveForm.AppForm>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Cancel PO Confirm Dialog ── */}
      {!isTerminal && (
        <ConfirmDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          title="Cancel Purchase Order?"
          description={`Are you sure you want to cancel ${po.purchase_number}? This action cannot be undone.`}
          confirmLabel="Cancel PO"
          variant="destructive"
          isLoading={cancelMutation.isPending}
          onConfirm={async () => {
            await cancelMutation.mutateAsync(id)
            setCancelDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PurchaseDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
