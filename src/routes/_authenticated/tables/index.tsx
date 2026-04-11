import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/auth-guards'
import {
  PlusIcon,
  UsersIcon,
  PencilIcon,
  Trash2Icon,
  LayoutGridIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { useBranches } from '@/hooks/use-branches'
import {
  useFloorAreas,
  useCreateFloorArea,
  useUpdateFloorArea,
  useDeleteFloorArea,
} from '@/hooks/use-floor-areas'
import {
  useTables,
  useCreateTable,
  useUpdateTable,
  useUpdateTableStatus,
  useDeleteTable,
} from '@/hooks/use-tables'
import type {
  FloorArea,
  Table,
  TableStatus,
  CreateFloorAreaPayload,
  UpdateFloorAreaPayload,
  CreateTablePayload,
  UpdateTablePayload,
} from '@/lib/services/tables'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/tables/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: TablesPage,
})

// ─── Status config ────────────────────────────────────────────────────────────

const TABLE_STATUS_CONFIG: Record<
  TableStatus,
  { label: string; cardClass: string; badgeClass: string }
> = {
  available: {
    label: 'Available',
    cardClass:
      'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
    badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
  },
  occupied: {
    label: 'Occupied',
    cardClass:
      'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
  },
  reserved: {
    label: 'Reserved',
    cardClass:
      'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30',
    badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
  },
  maintenance: {
    label: 'Maintenance',
    cardClass:
      'border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900/30',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
  },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TablesPage() {
  const { branchId: userBranchId } = useAuth()

  // Branch selection (admins see all; managers may be locked to theirs)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    userBranchId ? String(userBranchId) : '',
  )

  // Dialog states
  const [addFloorAreaOpen, setAddFloorAreaOpen] = useState(false)
  const [editFloorArea, setEditFloorArea] = useState<FloorArea | null>(null)
  const [deleteFloorArea, setDeleteFloorArea] = useState<FloorArea | null>(null)

  const [addTableOpen, setAddTableOpen] = useState(false)
  const [addTableDefaultArea, setAddTableDefaultArea] = useState<number | null>(null)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [deleteTable, setDeleteTable] = useState<Table | null>(null)

  // Data
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const branchId = selectedBranchId ? parseInt(selectedBranchId, 10) : undefined

  const { data: floorAreasData, isLoading: areasLoading } = useFloorAreas({
    branchId,
  })
  const { data: tablesData, isLoading: tablesLoading } = useTables({
    branchId,
    pageSize: 200,
  })

  const floorAreas = floorAreasData?.data ?? []
  const allTables = tablesData?.data ?? []

  const isLoading = areasLoading || tablesLoading

  // ── Delete mutations (need isPending for ConfirmDialog) ──────────────────────
  const deleteFloorAreaMutation = useDeleteFloorArea()
  const deleteTableMutation = useDeleteTable()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tables"
        description="Manage floor areas and table layout."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setAddFloorAreaOpen(true)}
              disabled={!selectedBranchId}
            >
              <LayoutGridIcon className="mr-2 size-4" />
              Add Floor Area
            </Button>
            <Button
              onClick={() => {
                setAddTableDefaultArea(null)
                setAddTableOpen(true)
              }}
              disabled={!selectedBranchId || floorAreas.length === 0}
            >
              <PlusIcon className="mr-2 size-4" />
              Add Table
            </Button>
          </div>
        }
      />

      {/* Branch selector */}
      <div className="flex flex-wrap items-center gap-3">
        <Label className="shrink-0 text-sm font-medium">Branch</Label>
        <Select
          value={selectedBranchId}
          onValueChange={setSelectedBranchId}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Select a branch" />
          </SelectTrigger>
          <SelectContent>
            {branchOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {!selectedBranchId ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
          Select a branch to view tables
        </div>
      ) : isLoading ? (
        <FloorAreasSkeleton />
      ) : floorAreas.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-muted-foreground">
          <p>No floor areas yet.</p>
          <Button variant="outline" onClick={() => setAddFloorAreaOpen(true)}>
            <LayoutGridIcon className="mr-2 size-4" />
            Add Floor Area
          </Button>
        </div>
      ) : (
        <Tabs defaultValue={String(floorAreas[0]?.id)}>
          <TabsList className="mb-4 h-auto flex-wrap gap-1">
            {floorAreas.map((area) => {
              const count = allTables.filter(
                (t) => t.floor_area_id === area.id,
              ).length
              return (
                <TabsTrigger
                  key={area.id}
                  value={String(area.id)}
                  className="gap-2"
                >
                  {area.name}
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {floorAreas.map((area) => {
            const areaTables = allTables.filter(
              (t) => t.floor_area_id === area.id,
            )
            return (
              <TabsContent key={area.id} value={String(area.id)}>
                {/* Floor area header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{area.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {areaTables.length} table
                      {areaTables.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditFloorArea(area)}
                    >
                      <PencilIcon className="mr-1.5 size-3.5" />
                      Edit Area
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteFloorArea(area)}
                      disabled={areaTables.length > 0}
                    >
                      <Trash2Icon className="mr-1.5 size-3.5" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAddTableDefaultArea(area.id)
                        setAddTableOpen(true)
                      }}
                    >
                      <PlusIcon className="mr-1.5 size-3.5" />
                      Add Table
                    </Button>
                  </div>
                </div>

                {/* Table grid */}
                {areaTables.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    No tables in this area yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {areaTables.map((table) => (
                      <TableCard
                        key={table.id}
                        table={table}
                        onEdit={() => setEditTable(table)}
                        onDelete={() => setDeleteTable(table)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* ── Add Floor Area Dialog ── */}
      <Dialog open={addFloorAreaOpen} onOpenChange={setAddFloorAreaOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Floor Area</DialogTitle>
          </DialogHeader>
          <FloorAreaForm
            key={addFloorAreaOpen ? 'open' : 'closed'}
            branchId={branchId!}
            onSuccess={() => setAddFloorAreaOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Floor Area Dialog ── */}
      <Dialog
        open={!!editFloorArea}
        onOpenChange={(o) => { if (!o) setEditFloorArea(null) }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Floor Area</DialogTitle>
          </DialogHeader>
          {editFloorArea && (
            <FloorAreaForm
              key={editFloorArea.id}
              branchId={editFloorArea.branch_id}
              existing={editFloorArea}
              onSuccess={() => setEditFloorArea(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Floor Area Confirm ── */}
      <ConfirmDialog
        open={!!deleteFloorArea}
        onOpenChange={(o) => { if (!o) setDeleteFloorArea(null) }}
        title={`Delete "${deleteFloorArea?.name}"?`}
        description="This will permanently delete the floor area. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteFloorAreaMutation.isPending}
        onConfirm={() => {
          if (!deleteFloorArea) return
          deleteFloorAreaMutation.mutate(deleteFloorArea.id, {
            onSuccess: () => setDeleteFloorArea(null),
          })
        }}
      />

      {/* ── Add Table Dialog ── */}
      <Dialog open={addTableOpen} onOpenChange={setAddTableOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Table</DialogTitle>
          </DialogHeader>
          <TableForm
            key={addTableOpen ? 'open' : 'closed'}
            branchId={branchId!}
            floorAreas={floorAreas}
            defaultFloorAreaId={addTableDefaultArea ?? undefined}
            onSuccess={() => setAddTableOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Table Dialog ── */}
      <Dialog
        open={!!editTable}
        onOpenChange={(o) => { if (!o) setEditTable(null) }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Table {editTable?.table_number}</DialogTitle>
          </DialogHeader>
          {editTable && (
            <TableEditForm
              key={editTable.id}
              table={editTable}
              floorAreas={floorAreas}
              onSuccess={() => setEditTable(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Table Confirm ── */}
      <ConfirmDialog
        open={!!deleteTable}
        onOpenChange={(o) => { if (!o) setDeleteTable(null) }}
        title={`Delete table "${deleteTable?.table_number}"?`}
        description="This will permanently remove the table."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteTableMutation.isPending}
        onConfirm={() => {
          if (!deleteTable) return
          deleteTableMutation.mutate(deleteTable.id, {
            onSuccess: () => setDeleteTable(null),
          })
        }}
      />
    </div>
  )
}

// ─── Table Card ───────────────────────────────────────────────────────────────

function TableCard({
  table,
  onEdit,
  onDelete,
}: {
  table: Table
  onEdit: () => void
  onDelete: () => void
}) {
  const config = TABLE_STATUS_CONFIG[table.status]
  const updateStatus = useUpdateTableStatus()

  // Status transition options per current status
  const statusTransitions: TableStatus[] = (() => {
    switch (table.status) {
      case 'available':
        return ['occupied', 'reserved', 'maintenance']
      case 'occupied':
        return ['available']
      case 'reserved':
        return ['occupied', 'available']
      case 'maintenance':
        return ['available']
    }
  })()

  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 rounded-xl border-2 p-4 transition-all',
        config.cardClass,
      )}
    >
      {/* Table Number */}
      <div className="text-center text-2xl font-bold tracking-tight">
        {table.table_number}
      </div>

      {/* Capacity */}
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <UsersIcon className="size-3" />
        <span>{table.capacity}</span>
      </div>

      {/* Status badge */}
      <div className="flex justify-center">
        <StatusBadge status={table.status} className="text-xs" />
      </div>

      {/* Status change dropdown */}
      {statusTransitions.length > 0 && (
        <Select
          value={table.status}
          onValueChange={(val) =>
            updateStatus.mutate({
              id: table.id,
              payload: { status: val as TableStatus },
            })
          }
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={table.status} disabled>
              {config.label} (current)
            </SelectItem>
            {statusTransitions.map((s) => (
              <SelectItem key={s} value={s}>
                → {TABLE_STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Actions — always visible for touch devices */}
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-7 flex-1 px-2 text-xs"
          onClick={onEdit}
        >
          <PencilIcon className="size-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 flex-1 px-2 text-xs text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          disabled={table.status === 'occupied' || table.status === 'reserved'}
        >
          <Trash2Icon className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Floor Area Form ──────────────────────────────────────────────────────────

function FloorAreaForm({
  branchId,
  existing,
  onSuccess,
}: {
  branchId: number
  existing?: FloorArea
  onSuccess: () => void
}) {
  const createMutation = useCreateFloorArea()
  const updateMutation = useUpdateFloorArea()
  const isEditing = !!existing

  const form = useAppForm({
    defaultValues: {
      name: existing?.name ?? '',
      sort_order: existing?.sort_order ?? 0,
      is_active: existing?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      if (isEditing) {
        const payload: UpdateFloorAreaPayload = {
          name: value.name,
          sort_order: Number(value.sort_order),
          is_active: value.is_active,
        }
        await updateMutation.mutateAsync({ id: existing!.id, payload })
      } else {
        const payload: CreateFloorAreaPayload = {
          branch_id: branchId,
          name: value.name,
          sort_order: Number(value.sort_order) || 0,
        }
        await createMutation.mutateAsync(payload)
      }
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
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) =>
            !value?.trim()
              ? 'Name is required'
              : value.length > 50
                ? 'Max 50 characters'
                : undefined,
        }}
      >
        {(field) => (
          <field.TextField
            label="Name"
            placeholder="e.g. Indoor, Outdoor, VIP Room"
          />
        )}
      </form.AppField>

      <form.AppField name="sort_order">
        {(field) => (
          <field.NumberField
            label="Sort Order"
            min={0}
            step={1}
            placeholder="0"
          />
        )}
      </form.AppField>

      {isEditing && (
        <form.AppField name="is_active">
          {(field) => <field.SwitchField label="Active" />}
        </form.AppField>
      )}

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEditing ? 'Save Changes' : 'Create Floor Area'}
            className="w-auto min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

// ─── Table Create Form ────────────────────────────────────────────────────────

function TableForm({
  branchId,
  floorAreas,
  defaultFloorAreaId,
  onSuccess,
}: {
  branchId: number
  floorAreas: FloorArea[]
  defaultFloorAreaId?: number
  onSuccess: () => void
}) {
  const createMutation = useCreateTable()

  const floorAreaOptions = floorAreas.map((a) => ({
    value: String(a.id),
    label: a.name,
  }))

  const form = useAppForm({
    defaultValues: {
      floor_area_id: defaultFloorAreaId ? String(defaultFloorAreaId) : '',
      table_number: '',
      capacity: 4,
    },
    onSubmit: async ({ value }) => {
      const payload: CreateTablePayload = {
        branch_id: branchId,
        floor_area_id: parseInt(value.floor_area_id, 10),
        table_number: value.table_number.trim(),
        capacity: Number(value.capacity),
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
      <form.AppField
        name="floor_area_id"
        validators={{
          onChange: ({ value }) =>
            !value ? 'Floor area is required' : undefined,
        }}
      >
        {(field) => (
          <field.SelectField
            label="Floor Area"
            options={floorAreaOptions}
            placeholder="Select a floor area"
          />
        )}
      </form.AppField>

      <form.AppField
        name="table_number"
        validators={{
          onChange: ({ value }) =>
            !value?.trim()
              ? 'Table number is required'
              : value.length > 10
                ? 'Max 10 characters'
                : undefined,
        }}
      >
        {(field) => (
          <field.TextField
            label="Table Number"
            placeholder="e.g. A1, T05, VIP-1"
          />
        )}
      </form.AppField>

      <form.AppField
        name="capacity"
        validators={{
          onChange: ({ value }) =>
            Number(value) < 1 ? 'Minimum 1' : undefined,
        }}
      >
        {(field) => (
          <field.NumberField label="Capacity" min={1} step={1} placeholder="4" />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Create Table"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

// ─── Table Edit Form ──────────────────────────────────────────────────────────

function TableEditForm({
  table,
  floorAreas,
  onSuccess,
}: {
  table: Table
  floorAreas: FloorArea[]
  onSuccess: () => void
}) {
  const updateMutation = useUpdateTable()

  const floorAreaOptions = floorAreas.map((a) => ({
    value: String(a.id),
    label: a.name,
  }))

  const form = useAppForm({
    defaultValues: {
      floor_area_id: String(table.floor_area_id),
      table_number: table.table_number,
      capacity: table.capacity,
      is_active: table.is_active,
    },
    onSubmit: async ({ value }) => {
      const payload: UpdateTablePayload = {
        floor_area_id: parseInt(value.floor_area_id, 10),
        table_number: value.table_number.trim(),
        capacity: Number(value.capacity),
        is_active: value.is_active,
      }
      await updateMutation.mutateAsync({ id: table.id, payload })
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
      <form.AppField
        name="floor_area_id"
        validators={{
          onChange: ({ value }) =>
            !value ? 'Floor area is required' : undefined,
        }}
      >
        {(field) => (
          <field.SelectField
            label="Floor Area"
            options={floorAreaOptions}
            placeholder="Select a floor area"
          />
        )}
      </form.AppField>

      <form.AppField
        name="table_number"
        validators={{
          onChange: ({ value }) =>
            !value?.trim()
              ? 'Table number is required'
              : value.length > 10
                ? 'Max 10 characters'
                : undefined,
        }}
      >
        {(field) => (
          <field.TextField label="Table Number" placeholder="e.g. A1" />
        )}
      </form.AppField>

      <form.AppField
        name="capacity"
        validators={{
          onChange: ({ value }) =>
            Number(value) < 1 ? 'Minimum 1' : undefined,
        }}
      >
        {(field) => (
          <field.NumberField label="Capacity" min={1} step={1} />
        )}
      </form.AppField>

      <form.AppField name="is_active">
        {(field) => <field.SwitchField label="Active" />}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Save Changes"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FloorAreasSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
