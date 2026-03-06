import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { useCustomers, useCreateCustomer } from '@/hooks/use-customers'
import { getCustomerColumns } from '@/components/customers/columns'
import type { CreateCustomerPayload } from '@/lib/services/customers'
import { FilterBar } from '@/components/filter-bar'
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

export const Route = createFileRoute('/_authenticated/customers/')({
  component: CustomersPage,
})

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_BY_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'visits', label: 'Most Visited' },
  { value: 'spent', label: 'Top Spender' },
  { value: 'points', label: 'Loyalty Points' },
]

const SORT_DIR_OPTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function CustomersPage() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const canManage = role === 'admin' || role === 'manager'

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter state
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    search: '',
    is_active: '',
    sort_by: '',
    sort_dir: '',
  })

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)

  // Build typed filters for the query
  const queryFilters = useMemo(
    () => ({
      search: filterValues.search || undefined,
      sortBy: (filterValues.sort_by ||
        undefined) as 'name' | 'visits' | 'spent' | 'points' | undefined,
      sortDir: (filterValues.sort_dir || undefined) as
        | 'asc'
        | 'desc'
        | undefined,
      page,
      pageSize,
    }),
    [filterValues, page, pageSize],
  )

  const { data, isLoading } = useCustomers(queryFilters)

  const columns = useMemo(
    () =>
      getCustomerColumns({
        onView: (customer) =>
          navigate({
            to: '/customers/$customerId',
            params: { customerId: String(customer.id) },
          }),
        onEdit: (customer) =>
          navigate({
            to: '/customers/$customerId',
            params: { customerId: String(customer.id) },
          }),
        canManage,
      }),
    [canManage, navigate],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterValues({ search: '', is_active: '', sort_by: '', sort_dir: '' })
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer base and loyalty program."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Customer
          </Button>
        }
      />

      <FilterBar
        filters={[
          {
            type: 'search',
            key: 'search',
            placeholder: 'Search name, phone, or email…',
          },
          {
            type: 'select',
            key: 'is_active',
            label: 'Status',
            options: [
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ],
            allLabel: 'All statuses',
          },
          {
            type: 'select',
            key: 'sort_by',
            label: 'Sort by',
            options: SORT_BY_OPTIONS,
            allLabel: 'Default',
          },
          {
            type: 'select',
            key: 'sort_dir',
            label: 'Direction',
            options: SORT_DIR_OPTIONS,
            allLabel: 'Default',
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
        emptyMessage="No customers found."
      />

      {/* ── Create Customer Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <CreateCustomerForm
              key={createOpen ? 'open' : 'closed'}
              onSuccess={() => setCreateOpen(false)}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Create Customer Form ─────────────────────────────────────────────────────

interface CreateCustomerFormProps {
  onSuccess: () => void
}

function CreateCustomerForm({ onSuccess }: CreateCustomerFormProps) {
  const createMutation = useCreateCustomer()

  const form = useAppForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const payload: CreateCustomerPayload = {
        name: value.name.trim(),
        phone: value.phone?.trim() || undefined,
        email: value.email?.trim() || undefined,
        address: value.address?.trim() || undefined,
        notes: value.notes?.trim() || undefined,
      }
      await createMutation.mutateAsync(payload)
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
      <form.AppField name="name">
        {(field) => (
          <field.TextField label="Name" placeholder="e.g. Budi Santoso" />
        )}
      </form.AppField>

      <form.AppField name="phone">
        {(field) => (
          <field.TextField label="Phone" placeholder="e.g. 081234567890" />
        )}
      </form.AppField>

      <form.AppField name="email">
        {(field) => (
          <field.TextField
            label="Email"
            placeholder="e.g. budi@email.com"
            type="email"
          />
        )}
      </form.AppField>

      <form.AppField name="address">
        {(field) => (
          <field.TextareaField
            label="Address"
            placeholder="e.g. Jl. Merdeka No. 10"
          />
        )}
      </form.AppField>

      <form.AppField name="notes">
        {(field) => (
          <field.TextareaField
            label="Notes"
            placeholder="e.g. Allergic to peanuts, prefers corner table"
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton label="Add Customer" />
        </form.AppForm>
      </div>
    </form>
  )
}
