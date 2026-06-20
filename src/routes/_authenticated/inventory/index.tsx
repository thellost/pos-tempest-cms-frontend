import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertTriangleIcon, PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { useBranches } from '@/hooks/use-branches'
import {
  useInventory,
  useLowStockInventory,
  useAdjustStock,
  useUpdateThreshold,
  useCreateInventory,
  useUpdateInventory,
  useDeleteInventory,
} from '@/hooks/use-inventory'
import type { InventoryItem, UnitOfMeasure, UpdateInventoryPayload } from '@/lib/services/inventory'
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
import { Button } from '@/components/ui/button'
import { requireRole } from '@/lib/auth-guards'
import { ConfirmDialog } from '@/components/confirm-dialog'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/inventory/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: InventoryPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function InventoryPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId, role } = useAuth()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '1',
    search: '',
  })

  // Dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [thresholdTarget, setThresholdTarget] = useState<InventoryItem | null>(null)
  const [thresholdOpen, setThresholdOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  const filterBranchId = filterValues.branch_id
    ? parseInt(filterValues.branch_id, 10)
    : undefined

  const queryFilters = useMemo(
    () => ({
      branchId: filterBranchId,
      name: filterValues.search || undefined,
      page,
      pageSize,
    }),
    [filterBranchId, filterValues.search, page, pageSize],
  )

  const { data: allData, isLoading: allLoading } = useInventory(queryFilters)
  const { data: lowStockData, isLoading: lowLoading } =
    useLowStockInventory(undefined)

  const allRows = allData?.data ?? []
  const lowStockRows = lowStockData?.data ?? []


  const columns = useMemo(
    () =>
      getInventoryColumns({
        canAdjust: role !== 'cashier',
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
        onEdit: (item) => {
          setEditTarget(item)
          setEditOpen(true)
        },
        onDelete: (item) => {
          setDeleteTarget(item)
          setDeleteOpen(true)
        },
      }),
    [navigate, role],
  )

  const deleteMutation = useDeleteInventory()

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
        placeholder: 'Search by ingredient name…',
      },
    ],
    [branchOptions],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleFilterClear = () => {
    setFilterValues({
      branch_id: userBranchId ? String(userBranchId) : '1',
      search: '',
    })
    setPage(1)
  }

  const lowStockCount = lowStockData?.data?.length ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage raw ingredients and monitor stock levels across all branches."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Ingredient
          </Button>
        }
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
            data={allRows}
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
            data={lowStockRows}
            isLoading={lowLoading}
            pagination={{ page: 1, pageSize: 100 }}
            onPaginationChange={() => {}}
            hidePagination
            emptyMessage="No low stock items. All levels are above their thresholds."
          />
        </TabsContent>
      </Tabs>

      {/* ── Add Ingredient Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Ingredient</DialogTitle>
          </DialogHeader>
          <AddIngredientForm
            branchOptions={(branchesData?.data ?? []).map((b) => ({ value: b.id, label: b.name }))}
            defaultBranchId={userBranchId ?? undefined}
            onSuccess={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

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

      {/* ── Edit Ingredient Dialog ── */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditOpen(false)
            setEditTarget(null)
          } else {
            setEditOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Ingredient</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <EditIngredientForm
              key={editTarget.id}
              item={editTarget}
              onSuccess={() => {
                setEditOpen(false)
                setEditTarget(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Ingredient Confirm ── */}
      <ConfirmDialog
        title={`Delete "${deleteTarget?.name}"?`}
        description="This ingredient will be permanently removed from inventory. This action cannot be undone."
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

// ─── Add Ingredient Form ──────────────────────────────────────────────────────

const UNIT_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram' },
  { value: 'ons', label: 'Ons' },
  { value: 'liter', label: 'Liter' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'portion', label: 'Portion' },
]

interface AddIngredientFormProps {
  branchOptions: { value: number; label: string }[]
  defaultBranchId?: number
  onSuccess: () => void
}

function AddIngredientForm({ branchOptions, defaultBranchId, onSuccess }: AddIngredientFormProps) {
  const createMutation = useCreateInventory()

  const form = useAppForm({
    defaultValues: {
      branch_id: defaultBranchId ?? (null as number | null),
      name: '',
      unit_of_measure: 'piece' as UnitOfMeasure,
      description: '',
      low_stock_threshold: 10 as number,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        branch_id: value.branch_id!,
        name: value.name.trim(),
        unit_of_measure: value.unit_of_measure,
        description: value.description?.trim() || undefined,
        low_stock_threshold: Number(value.low_stock_threshold) || 10,
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
      <form.AppField
        name="branch_id"
        validators={{
          onChange: ({ value }) => (!value ? 'Branch is required' : undefined),
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

      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value?.trim() ? 'Name is required' : undefined,
        }}
      >
        {(field) => (
          <field.TextField
            label="Ingredient Name *"
            placeholder="e.g. Chicken Breast"
          />
        )}
      </form.AppField>

      <form.AppField
        name="unit_of_measure"
        validators={{
          onChange: ({ value }) => (!value ? 'Unit is required' : undefined),
        }}
      >
        {(field) => (
          <field.SelectField
            label="Unit of Measure *"
            options={UNIT_OPTIONS}
            placeholder="Select unit…"
          />
        )}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.TextareaField
            label="Description"
            placeholder="Optional notes about this ingredient"
            rows={2}
          />
        )}
      </form.AppField>

      <form.AppField
        name="low_stock_threshold"
        validators={{
          onChange: ({ value }) =>
            value !== undefined && Number(value) < 0
              ? 'Threshold must be 0 or greater'
              : undefined,
        }}
      >
        {(field) => (
          <field.NumberField
            label="Low Stock Threshold"
            min={0}
            step={1}
            placeholder="10"
            description="Alert when stock falls at or below this value"
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton label="Add Ingredient" className="w-auto min-w-[140px]" />
        </form.AppForm>
      </div>
    </form>
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
          <span className="font-medium text-foreground">{item.name}</span>
          {' — '}
          {item.branch_name}
        </p>
        <p className="mt-1 text-muted-foreground">
          Current stock:{' '}
          <span className="font-semibold text-foreground">
            {item.stock_quantity} {item.unit_of_measure}
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
            step={0.001}
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
                {newQty < 0 ? `${newQty} (invalid)` : `${newQty} ${item.unit_of_measure}`}
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
        <p className="font-medium text-foreground">{item.name}</p>
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
            step={0.001}
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

// ─── Edit Ingredient Form ─────────────────────────────────────────────────────

interface EditIngredientFormProps {
  item: InventoryItem
  onSuccess: () => void
}

function EditIngredientForm({ item, onSuccess }: EditIngredientFormProps) {
  const updateMutation = useUpdateInventory()

  const form = useAppForm({
    defaultValues: {
      name: item.name,
      unit_of_measure: item.unit_of_measure,
      description: item.description ?? '',
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync({
        id: item.id,
        payload: {
          name: value.name.trim(),
          unit_of_measure: value.unit_of_measure,
          description: value.description?.trim() || null,
        } as UpdateInventoryPayload,
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
        <p className="text-muted-foreground">
          Branch: <span className="font-medium text-foreground">{item.branch_name}</span>
        </p>
        <p className="text-muted-foreground">
          Current stock:{' '}
          <span className="font-medium text-foreground">
            {item.stock_quantity} {item.unit_of_measure}
          </span>
        </p>
      </div>

      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value?.trim() ? 'Name is required' : undefined,
        }}
      >
        {(field) => (
          <field.TextField
            label="Ingredient Name *"
            placeholder="e.g. Chicken Breast"
          />
        )}
      </form.AppField>

      <form.AppField
        name="unit_of_measure"
        validators={{
          onChange: ({ value }) => (!value ? 'Unit is required' : undefined),
        }}
      >
        {(field) => (
          <field.SelectField
            label="Unit of Measure *"
            options={UNIT_OPTIONS}
            placeholder="Select unit…"
          />
        )}
      </form.AppField>

      <form.AppField name="description">
        {(field) => (
          <field.TextareaField
            label="Description"
            placeholder="Optional notes about this ingredient"
            rows={2}
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton label="Save Changes" className="w-auto min-w-[120px]" />
        </form.AppForm>
      </div>
    </form>
  )
}
