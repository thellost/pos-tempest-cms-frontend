import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangleIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { useBranches } from '@/hooks/use-branches'
import {
  useInventory,
  useLowStockInventory,
  useAdjustStock,
  useUpdateThreshold,
} from '@/hooks/use-inventory'
import type { InventoryItem } from '@/lib/services/inventory'
import { getInventoryColumns } from '@/components/inventory/columns'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireRole } from '@/lib/auth-guards'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/inventory/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: InventoryPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function InventoryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '',
    search: '',
  })

  // Dialog state
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [thresholdTarget, setThresholdTarget] = useState<InventoryItem | null>(null)
  const [thresholdOpen, setThresholdOpen] = useState(false)

  // Branch options for filter
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  // Menu item search filter (find by name for local filtering)
  const filterBranchId = filterValues.branch_id
    ? parseInt(filterValues.branch_id, 10)
    : undefined

  const lowStockBranchId = filterBranchId

  // Build query filters — search is client-side since API doesn't support it
  const queryFilters = useMemo(
    () => ({
      branchId: filterBranchId,
      page,
      pageSize,
    }),
    [filterBranchId, page, pageSize],
  )

  const { data: allData, isLoading: allLoading } = useInventory(queryFilters)
  const { data: lowStockData, isLoading: lowLoading } =
    useLowStockInventory(lowStockBranchId)

  // Client-side name filter
  const searchTerm = filterValues.search?.toLowerCase() ?? ''
  const filteredAll = useMemo(() => {
    const rows = allData?.data ?? []
    if (!searchTerm) return rows
    return rows.filter(
      (item) =>
        item.menu_item_name.toLowerCase().includes(searchTerm) ||
        item.menu_item_sku.toLowerCase().includes(searchTerm),
    )
  }, [allData, searchTerm])

  const filteredLowStock = useMemo(() => {
    const rows = lowStockData?.data ?? []
    if (!searchTerm) return rows
    return rows.filter(
      (item) =>
        item.menu_item_name.toLowerCase().includes(searchTerm) ||
        item.menu_item_sku.toLowerCase().includes(searchTerm),
    )
  }, [lowStockData, searchTerm])

  const columns = useMemo(
    () =>
      getInventoryColumns({
        onAdjust: (item) => {
          setAdjustTarget(item)
          setAdjustOpen(true)
        },
        onEditThreshold: (item) => {
          setThresholdTarget(item)
          setThresholdOpen(true)
        },
        onViewMovements: (item) => {
          navigate({
            to: '/inventory/$inventoryId/movements',
            params: { inventoryId: String(item.id) },
          })
        },
      }),
    [navigate],
  )

  const filterConfigs = useMemo(
    () => [
      {
        type: 'select' as const,
        key: 'branch_id',
        label: 'Branch',
        options: branchOptions,
        allLabel: 'All Branches',
      },
      {
        type: 'search' as const,
        key: 'search',
        placeholder: 'Search by item name or SKU…',
      },
    ],
    [branchOptions],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    if (key !== 'search') setPage(1)
  }

  const handleFilterClear = () => {
    setFilterValues({
      branch_id: '',
      search: '',
    })
    setPage(1)
  }

  const lowStockCount = lowStockData?.data?.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Monitor stock levels and adjust quantities across all branches."
      />

      <FilterBar
        filters={filterConfigs}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleFilterClear}
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Stock</TabsTrigger>
          <TabsTrigger value="low_stock" className="flex items-center gap-1.5">
            <AlertTriangleIcon className="size-3.5" />
            Low Stock Alerts
            {lowStockCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                {lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All Stock ── */}
        <TabsContent value="all" className="mt-4">
          <DataTable
            columns={columns}
            data={filteredAll}
            meta={allData?.meta}
            isLoading={allLoading}
            pagination={{ page, pageSize }}
            onPaginationChange={({ page: p, pageSize: ps }) => {
              setPage(p)
              setPageSize(ps)
            }}
            initialColumnVisibility={isMobile ? { branch_name: false, low_stock_threshold: false, updated_at: false } : {}}
            emptyMessage="No inventory records found."
          />
        </TabsContent>

        {/* ── Low Stock Alerts ── */}
        <TabsContent value="low_stock" className="mt-4">
          <DataTable
            columns={columns}
            data={filteredLowStock}
            isLoading={lowLoading}
            pagination={{ page: 1, pageSize: 100 }}
            onPaginationChange={() => {}}
            hidePagination
            emptyMessage="No low stock items. All levels are above their thresholds."
          />
        </TabsContent>
      </Tabs>

      {/* ── Adjust Stock Dialog ── */}
      <Dialog
        open={adjustOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAdjustOpen(false)
            setAdjustTarget(null)
          } else {
            setAdjustOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {adjustTarget && (
            <AdjustStockForm
              key={adjustTarget.id}
              item={adjustTarget}
              onSuccess={() => {
                setAdjustOpen(false)
                setAdjustTarget(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Threshold Dialog ── */}
      <Dialog
        open={thresholdOpen}
        onOpenChange={(open) => {
          if (!open) {
            setThresholdOpen(false)
            setThresholdTarget(null)
          } else {
            setThresholdOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Low Stock Threshold</DialogTitle>
          </DialogHeader>
          {thresholdTarget && (
            <ThresholdForm
              key={thresholdTarget.id}
              item={thresholdTarget}
              onSuccess={() => {
                setThresholdOpen(false)
                setThresholdTarget(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Adjust Stock Form ────────────────────────────────────────────────────────

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'adjustment', label: 'Adjustment', description: 'Manual count correction' },
  { value: 'waste', label: 'Waste', description: 'Items discarded or spoiled' },
  { value: 'transfer', label: 'Transfer', description: 'Moved to/from another location' },
]

interface AdjustStockFormProps {
  item: InventoryItem
  onSuccess: () => void
}

function AdjustStockForm({ item, onSuccess }: AdjustStockFormProps) {
  const adjustMutation = useAdjustStock()

  const form = useAppForm({
    defaultValues: {
      quantity_change: 0 as number,
      movement_type: 'adjustment' as 'adjustment' | 'waste' | 'transfer',
      reason: '',
    },
    onSubmit: async ({ value }) => {
      await adjustMutation.mutateAsync({
        inventory_id: item.id,
        quantity_change: Number(value.quantity_change),
        movement_type: value.movement_type,
        reason: value.reason?.trim() || undefined,
      })
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
      {/* Current Stock Info */}
      <div className="rounded-md bg-muted px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{item.menu_item_name}</span>
          {' — '}
          {item.branch_name}
        </p>
        <p className="mt-1 text-muted-foreground">
          Current stock:{' '}
          <span className="font-semibold text-foreground">
            {item.stock_quantity}
          </span>
        </p>
      </div>

      {/* Movement Type */}
      <form.AppField name="movement_type">
        {(field) => (
          <field.RadioGroupField
            label="Movement Type"
            options={MOVEMENT_TYPE_OPTIONS}
          />
        )}
      </form.AppField>

      {/* Quantity Change */}
      <form.AppField
        name="quantity_change"
        validators={{
          onChange: ({ value }) => {
            if (value === null || value === undefined || value === ('' as unknown))
              return 'Quantity is required'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Quantity Change"
            placeholder="Positive to add, negative to remove"
            step={1}
          />
        )}
      </form.AppField>

      {/* Preview new stock */}
      <form.Subscribe selector={(s) => s.values.quantity_change}>
        {(qty) => {
          const change = Number(qty) || 0
          const newQty = item.stock_quantity + change
          return (
            <p className="text-sm text-muted-foreground">
              New stock will be:{' '}
              <span
                className={newQty < 0 ? 'font-semibold text-destructive' : 'font-semibold text-foreground'}
              >
                {newQty < 0 ? `${newQty} (invalid)` : newQty}
              </span>
            </p>
          )
        }}
      </form.Subscribe>

      {/* Reason */}
      <form.AppField name="reason">
        {(field) => (
          <field.TextareaField
            label="Reason"
            placeholder="Optional note about this adjustment…"
            rows={2}
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Apply Adjustment"
            className="w-auto min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

// ─── Edit Threshold Form ──────────────────────────────────────────────────────

interface ThresholdFormProps {
  item: InventoryItem
  onSuccess: () => void
}

function ThresholdForm({ item, onSuccess }: ThresholdFormProps) {
  const updateThresholdMutation = useUpdateThreshold()

  const form = useAppForm({
    defaultValues: {
      low_stock_threshold: item.low_stock_threshold,
    },
    onSubmit: async ({ value }) => {
      await updateThresholdMutation.mutateAsync({
        id: item.id,
        payload: {
          low_stock_threshold: Number(value.low_stock_threshold),
        },
      })
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
      <div className="rounded-md bg-muted px-4 py-3 text-sm">
        <p className="font-medium text-foreground">{item.menu_item_name}</p>
        <p className="text-muted-foreground">{item.branch_name}</p>
      </div>

      <form.AppField
        name="low_stock_threshold"
        validators={{
          onChange: ({ value }) => {
            const n = Number(value)
            if (isNaN(n) || n < 0) return 'Threshold must be 0 or greater'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Low Stock Threshold"
            min={0}
            step={1}
          />
        )}
      </form.AppField>

      <p className="text-xs text-muted-foreground">
        A low stock alert is triggered when the stock quantity falls at or below
        this value.
      </p>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Save Threshold"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
