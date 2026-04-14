import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useUsers, useDeactivateUser } from '@/hooks/use-users'
import { useBranches } from '@/hooks/use-branches'
import { getUserColumns } from '@/components/users/columns'
import type { User } from '@/lib/services/users'
import { ROLE_OPTIONS } from '@/lib/services/users'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/users/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: UsersPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function UsersPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { role } = useAuth()
  const canManage = role === 'admin' || role === 'manager'

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filter state
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    search: '',
    branch_id: '',
    role_id: '',
    is_active: '',
  })

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  // Build typed filters for the query
  const queryFilters = useMemo(
    () => ({
      search: filterValues.search || undefined,
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      roleId: filterValues.role_id
        ? parseInt(filterValues.role_id, 10)
        : undefined,
      isActive: filterValues.is_active
        ? filterValues.is_active === 'true'
        : undefined,
      page,
      pageSize,
    }),
    [filterValues, page, pageSize],
  )

  const { data, isLoading } = useUsers(queryFilters)
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const deactivateMutation = useDeactivateUser()

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const columns = useMemo(
    () =>
      getUserColumns({
        onEdit: (user) =>
          navigate({
            to: '/users/$userId',
            params: { userId: String(user.id) },
          }),
        onDeactivate: (user) => {
          setDeactivateTarget(user)
          setDeactivateOpen(true)
        },
        canManage,
      }),
    [canManage, navigate],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1) // reset to first page on filter change
  }

  const handleClearFilters = () => {
    setFilterValues({ search: '', branch_id: '', role_id: '', is_active: '' })
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage staff accounts across all branches."
        actions={
          canManage ? (
            <Button onClick={() => navigate({ to: '/users/create' })}>
              <PlusIcon className="mr-2 size-4" />
              Add User
            </Button>
          ) : undefined
        }
      />

      <FilterBar
        filters={[
          {
            type: 'search',
            key: 'search',
            placeholder: 'Search name or email…',
          },
          {
            type: 'select',
            key: 'branch_id',
            label: 'Branch',
            options: branchOptions,
            allLabel: 'All branches',
          },
          {
            type: 'select',
            key: 'role_id',
            label: 'Role',
            options: ROLE_OPTIONS,
            allLabel: 'All roles',
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
        initialColumnVisibility={isMobile ? { phone: false, branch_name: false, last_login_at: false } : {}}
        emptyMessage="No users found."
      />

      {/* ── Deactivate Confirmation ── */}
      <ConfirmDialog
        title={`Deactivate "${deactivateTarget?.name}"?`}
        description="This user will no longer be able to sign in. You can reactivate them later by editing their profile."
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
