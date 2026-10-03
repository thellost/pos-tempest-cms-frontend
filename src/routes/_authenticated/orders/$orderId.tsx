import { useState } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/tanstackstart-react'
import { ArrowLeftIcon, FileDownIcon, XCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useOrder, useCancelOrder } from '@/hooks/use-orders'
import { useAuth } from '@/hooks/use-auth'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { requireRole } from '@/lib/auth-guards'
import { getItemQuantity, getItemUnitPrice, isWeightedItem } from '@/lib/order-items'
import { downloadOrderReceipt } from '@/lib/order-receipt'
import { formatIDR } from '@/components/orders/columns'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: OrderDetailPage,
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
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value}</span>
    </div>
  )
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  qris: 'QRIS',
  transfer: 'Transfer',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const router = useRouter()
  const { data: result, isLoading } = useOrder(orderId)
  const order = result?.data

  const { role } = useAuth()
  const cancelOrder = useCancelOrder()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isExportingReceipt, setIsExportingReceipt] = useState(false)

  const canCancel =
    role === 'admin' &&
    order?.status === 'completed' &&
    !order?.voided_at

  const handleCancel = async () => {
    await cancelOrder.mutateAsync({ id: orderId, reason: cancelReason || undefined })
    setCancelDialogOpen(false)
    setCancelReason('')
    router.navigate({ to: '/orders' })
  }

  const handleExportReceipt = async () => {
    if (!order) return
    setIsExportingReceipt(true)
    try {
      await downloadOrderReceipt(order)
    } catch (error) {
      console.error('[order-receipt] failed to generate receipt', error, {
        orderId: order.id,
        orderNumber: order.order_number,
      })
      Sentry.captureException(error, {
        extra: {
          orderId: order.id,
          orderNumber: order.order_number,
        },
      })
      toast.error('Failed to generate receipt')
    } finally {
      setIsExportingReceipt(false)
    }
  }

  if (isLoading) {
    return <OrderDetailSkeleton />
  }

  if (!order) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Order not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/orders">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
          <PageHeader
            title={order.order_number}
            description={`${order.branch_name}${order.table_number ? ` · Table ${order.table_number}` : ''}`}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={isExportingReceipt}
                  onClick={handleExportReceipt}
                >
                  <FileDownIcon className="mr-2 size-4" />
                  {isExportingReceipt ? 'Generating…' : 'Receipt PDF'}
                </Button>
                {canCancel && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircleIcon className="mr-2 size-4" />
                    Cancel Order
                  </Button>
                )}
              </div>
            }
          />
      </div>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <StatusBadge status={order.status} />
        <StatusBadge status={order.payment_status} />
        <Badge variant="outline">
          {ORDER_TYPE_LABELS[order.order_type] ?? order.order_type}
        </Badge>
        <span className="text-muted-foreground">·</span>
        <span>{formatDate(order.created_at)}</span>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Order Number"
              value={
                <span className="font-mono text-xs font-medium">
                  {order.order_number}
                </span>
              }
            />
            <InfoRow label="Branch" value={order.branch_name} />
            {order.table_number && (
              <InfoRow label="Table" value={order.table_number} />
            )}
            <InfoRow label="Cashier" value={order.cashier_name} />
            {order.customer_name && (
              <InfoRow label="Customer" value={order.customer_name} />
            )}
            <InfoRow label="Order Type" value={ORDER_TYPE_LABELS[order.order_type] ?? order.order_type} />
            <InfoRow label="Guest Count" value={order.guest_count} />
            <InfoRow
              label="Status"
              value={<StatusBadge status={order.status} />}
            />
            <InfoRow
              label="Payment Status"
              value={<StatusBadge status={order.payment_status} />}
            />
            {order.notes && (
              <>
                <Separator />
                <InfoRow
                  label="Notes"
                  value={
                    <span className="max-w-[200px] text-right">
                      {order.notes}
                    </span>
                  }
                />
              </>
            )}
            {order.voided_at && (
              <>
                <Separator />
                <InfoRow label="Voided At" value={formatDate(order.voided_at)} />
                {order.void_reason && (
                  <InfoRow label="Void Reason" value={order.void_reason} />
                )}
              </>
            )}
            <Separator />
            <InfoRow label="Created" value={formatDate(order.created_at)} />
            <InfoRow label="Updated" value={formatDate(order.updated_at)} />
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Subtotal" value={formatIDR(order.subtotal)} />
            <InfoRow
              label="Discount"
              value={
                <span className="text-destructive">
                  {order.discount_amount > 0
                    ? `−${formatIDR(order.discount_amount)}`
                    : formatIDR(0)}
                </span>
              }
            />
            <InfoRow
              label="Tax"
              value={
                <span className="text-muted-foreground">
                  {formatIDR(order.tax_amount)}
                </span>
              }
            />
            <InfoRow
              label="Service Charge"
              value={
                <span className="text-muted-foreground">
                  {formatIDR(order.service_charge)}
                </span>
              }
            />
            {order.rounding_amount !== 0 && (
              <InfoRow
                label="Rounding"
                value={
                  <span className="text-muted-foreground">
                    {formatIDR(order.rounding_amount)}
                  </span>
                }
              />
            )}
            <Separator />
            <InfoRow
              label="Total"
              value={
                <span className="text-base font-bold">
                  {formatIDR(order.total)}
                </span>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!order.items || order.items.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No items.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead>Notes / Modifiers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={item.is_voided ? 'opacity-40 line-through' : ''}
                  >
                    <TableCell className="font-medium">
                      {item.menu_item_name}
                      {item.is_voided && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">
                          Voided
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {getItemQuantity(item).toLocaleString('id-ID', {
                        maximumFractionDigits: 3,
                      })}{' '}
                      {item.unit_of_measure}
                    </TableCell>
                    <TableCell className="text-right">
                      {isWeightedItem(item)
                        ? `${formatIDR(getItemUnitPrice(item))} /${item.unit_of_measure}`
                        : formatIDR(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatIDR(item.subtotal)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {item.notes && (
                          <p className="text-xs text-muted-foreground italic">
                            {item.notes}
                          </p>
                        )}
                        {(item.modifiers?.length ?? 0) > 0 && (
                          <ul className="space-y-0.5">
                            {(item.modifiers ?? []).map((mod) => (
                              <li
                                key={mod.id}
                                className="text-xs text-muted-foreground"
                              >
                                <span className="font-medium">
                                  {mod.modifier_name}
                                </span>
                                {mod.extra_price > 0 && (
                                  <span className="ml-1 text-foreground/70">
                                    +{formatIDR(mod.extra_price)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!order.payments || order.payments.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No payment records.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium capitalize">
                      {PAYMENT_METHOD_LABELS[payment.payment_method] ??
                        payment.payment_method}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatIDR(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {payment.change_amount > 0
                        ? formatIDR(payment.change_amount)
                        : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.reference_number ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(payment.paid_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discounts */}
      <Card>
        <CardHeader>
          <CardTitle>Discounts Applied</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!order.discounts || order.discounts.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No discounts applied.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Discount Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Applied Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.discounts.map((disc) => (
                  <TableRow key={disc.id}>
                    <TableCell className="font-medium">
                      {disc.discount_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          disc.discount_type === 'percentage'
                            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }
                      >
                        {disc.discount_type === 'percentage'
                          ? 'Percentage'
                          : 'Fixed Amount'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {disc.discount_type === 'percentage'
                        ? `${disc.discount_value}%`
                        : formatIDR(disc.discount_value)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      −{formatIDR(disc.applied_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Order Confirm Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open)
          if (!open) setCancelReason('')
        }}
        title="Cancel Order?"
        description={
          <div className="space-y-3">
            <span>
              Are you sure you want to cancel{' '}
              <strong>{order.order_number}</strong>? This action cannot be undone.
            </span>
            <Textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        }
        confirmLabel="Cancel Order"
        variant="destructive"
        isLoading={cancelOrder.isPending}
        onConfirm={handleCancel}
      />
    </div>
  )
}
