import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  CoinsIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { phoneValidators } from '@/components/form-fields'
import { useCustomer, useUpdateCustomer } from '@/hooks/use-customers'
import type { UpdateCustomerPayload } from '@/lib/services/customers'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  component: CustomerDetailPage,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CustomerDetailPage() {
  const navigate = useNavigate()
  const { customerId } = Route.useParams()
  const customerIdNum = parseInt(customerId, 10)

  const { role } = useAuth()
  const canManage = role === 'admin' || role === 'manager'

  const { data, isLoading } = useCustomer(customerIdNum)
  const customer = data?.data

  return (
    <div className="space-y-6">
      <PageHeader
        title={isLoading ? 'Customer' : (customer?.name ?? 'Customer')}
        description="Customer profile, loyalty stats, and order history."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/customers' })}
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Customers
          </Button>
        }
      />

      {isLoading ? (
        <CustomerDetailSkeleton />
      ) : customer ? (
        <div className="space-y-6">
          {/* ── Stats Row ── */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Loyalty Points"
              value={customer.loyalty_points.toLocaleString()}
              icon={<CoinsIcon className="size-5" />}
            />
            <StatCard
              label="Total Visits"
              value={customer.total_visits}
              icon={<ShoppingBagIcon className="size-5" />}
            />
            <StatCard
              label="Total Spent"
              value={formatCurrency(customer.total_spent)}
              icon={<TrendingUpIcon className="size-5" />}
            />
          </div>

          {/* ── Edit Form Card ── */}
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
                <CardDescription>
                  Update the customer's profile information. Loyalty points,
                  visits, and total spent are managed by the POS system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EditCustomerForm
                  key={customer.id}
                  customerId={customer.id}
                  defaultValues={{
                    name: customer.name,
                    phone: customer.phone ?? '',
                    email: customer.email ?? '',
                    address: customer.address ?? '',
                    notes: customer.notes ?? '',
                    is_active: customer.is_active,
                  }}
                  canManage={canManage}
                  onSuccess={() => navigate({ to: '/customers' })}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Order History Link ── */}
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
                <CardDescription>
                  View all orders placed by this customer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Order history will be available once the Orders module is
                  implemented. Filter by this customer's ID (
                  <span className="font-mono text-foreground">
                    {customer.id}
                  </span>
                  ) on the Orders page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Customer not found.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

interface EditCustomerFormProps {
  customerId: number
  defaultValues: {
    name: string
    phone: string
    email: string
    address: string
    notes: string
    is_active: boolean
  }
  canManage: boolean
  onSuccess: () => void
}

function EditCustomerForm({
  customerId,
  defaultValues,
  canManage,
  onSuccess,
}: EditCustomerFormProps) {
  const updateMutation = useUpdateCustomer()

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const payload: UpdateCustomerPayload = {
        name: value.name.trim(),
        phone: value.phone?.trim() || null,
        email: value.email?.trim() || null,
        address: value.address?.trim() || null,
        notes: value.notes?.trim() || null,
        is_active: value.is_active,
      }
      await updateMutation.mutateAsync({ id: customerId, payload })
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
      className="space-y-4"
    >
      {/* Name */}
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Name"
            placeholder="e.g. Budi Santoso"
            disabled={!canManage}
          />
        )}
      </form.AppField>

      {/* Phone */}
      <form.AppField
        name="phone"
        validators={phoneValidators}
      >
        {(field) => <field.PhoneField disabled={!canManage} />}
      </form.AppField>

      {/* Email */}
      <form.AppField
        name="email"
        validators={{
          onChange: ({ value }) => {
            if (!value) return undefined
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
              return 'Enter a valid email address'
            if (value.length > 255) return 'Max 255 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Email"
            placeholder="e.g. budi@email.com (optional)"
            type="email"
            disabled={!canManage}
          />
        )}
      </form.AppField>

      {/* Address */}
      <form.AppField name="address">
        {(field) => (
          <field.TextareaField
            label="Address"
            placeholder="e.g. Jl. Merdeka No. 10 (optional)"
            disabled={!canManage}
          />
        )}
      </form.AppField>

      {/* Notes */}
      <form.AppField name="notes">
        {(field) => (
          <field.TextareaField
            label="Notes"
            placeholder="e.g. Allergic to peanuts, prefers corner table (optional)"
            disabled={!canManage}
          />
        )}
      </form.AppField>

      {/* Is Active */}
      <form.AppField name="is_active">
        {(field) => (
          <field.SwitchField
            label="Active"
            description="Inactive customers are hidden from POS order screens."
            disabled={!canManage}
          />
        )}
      </form.AppField>

      {/* Submit — only shown if user can manage */}
      {canManage && (
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
          >
            Reset
          </Button>
          <form.AppForm>
            <form.SubscribeButton
              label="Save Changes"
              className="w-auto min-w-[120px]"
            />
          </form.AppForm>
        </div>
      )}
    </form>
  )
}
