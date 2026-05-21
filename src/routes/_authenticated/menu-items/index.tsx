import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useBranches } from '@/hooks/use-branches'
import { requireRole } from '@/lib/auth-guards'
import {
  useMenuItems,
  useUpdateMenuItemAvailability,
  useDeleteMenuItem,
} from '@/hooks/use-menu-items'
import { useCategoryTree } from '@/hooks/use-categories'
import type { CategoryTree } from '@/lib/services/categories'
import { getMenuItemColumns } from '@/components/menu-items/columns'
import type { MenuItem } from '@/lib/services/menu-items'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/menu-items/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: MenuItemsPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function MenuItemsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()
  const { data: branchesData } = useBranches({ pageSize: 100 })

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    search: '',
    branch_id: userBranchId ? String(userBranchId) : '1',
    category_id: '',
    pricing_type: '',
    is_available: '',
  })

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Currently toggling availability for which id
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Build typed query filters
  const queryFilters = useMemo(
    () => ({
      search: filterValues.search || undefined,
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      categoryId: filterValues.category_id
        ? parseInt(filterValues.category_id, 10)
        : undefined,
      pricingType: filterValues.pricing_type
        ? (filterValues.pricing_type as 'fixed' | 'weight_based')
        : undefined,
      isAvailable: filterValues.is_available
        ? filterValues.is_available === 'true'
        : undefined,
      page,
      pageSize,
    }),
    [filterValues, page, pageSize],
  )

  const { data, isLoading } = useMenuItems(queryFilters)
  const { data: categoryTreeData } = useCategoryTree()
  const availabilityMutation = useUpdateMenuItemAvailability()
  const deleteMutation = useDeleteMenuItem()

  // Flatten category tree for filter dropdown
  const categoryOptions = useMemo(() => {
    const flat: { value: string; label: string }[] = []
    const flatten = (nodes: CategoryTree[] | undefined, depth = 0) => {
      for (const node of nodes ?? []) {
        flat.push({
          value: String(node.id),
          label: `${'  '.repeat(depth)}${node.name}`,
        })
        if (node.children?.length) flatten(node.children, depth + 1)
      }
    }
    flatten(categoryTreeData?.data)
    return flat
  }, [categoryTreeData])

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({ value: String(b.id), label: b.name })),
    [branchesData],
  )

  const handleToggleAvailability = async (item: MenuItem) => {
    setTogglingId(item.id)
    try {
      await availabilityMutation.mutateAsync({
        id: item.id,
        isAvailable: !item.is_available,
      })
    } finally {
      setTogglingId(null)
    }
  }

  const columns = useMemo(
    () =>
      getMenuItemColumns({
        onEdit: (item) =>
          navigate({
            to: '/menu-items/$itemId' as never,
            params: { itemId: String(item.id) } as never,
          }),
        onToggleAvailability: handleToggleAvailability,
        onDelete: (item) => {
          setDeleteTarget(item)
          setDeleteOpen(true)
        },
        isTogglingId: togglingId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [togglingId, navigate],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterValues({ search: '', branch_id: userBranchId ? String(userBranchId) : '1', category_id: '', pricing_type: '', is_available: '' })
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Items"
        description="Manage your product catalog, pricing, and availability."
        actions={
          <Button onClick={() => navigate({ to: '/menu-items/create' })}>
            <PlusIcon className="mr-2 size-4" />
            Add Product
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
        initialColumnVisibility={isMobile ? { sku: false, barcode: false, category_name: false, cost: false } : {}}
        toolbar={
          <FilterBar
            filters={[
              {
                key: 'search',
                type: 'search',
                placeholder: 'Search name, SKU, barcode…',
              },
              {
                key: 'branch_id',
                type: 'select',
                label: 'Branch',
                allLabel: 'All Branches',
                options: branchOptions,
              },
              {
                key: 'category_id',
                type: 'select',
                label: 'Category',
                allLabel: 'All Categories',
                options: categoryOptions,
              },
              {
                key: 'pricing_type',
                type: 'select',
                label: 'Type',
                allLabel: 'All Types',
                options: [
                  { value: 'fixed', label: 'Fixed Price' },
                  { value: 'weight_based', label: 'Weight Based' },
                ],
              },
              {
                key: 'is_available',
                type: 'select',
                label: 'Availability',
                allLabel: 'All',
                options: [
                  { value: 'true', label: 'Available' },
                  { value: 'false', label: 'Unavailable' },
                ],
              },
            ]}
            values={filterValues}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        }
        emptyMessage="No menu items found. Add your first product to get started."
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will soft-delete the item (sets it as inactive). It won't be visible in the POS app."
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteMutation.mutateAsync(deleteTarget.id)
          setDeleteOpen(false)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
