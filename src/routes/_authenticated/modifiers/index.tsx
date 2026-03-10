import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  ChevronRightIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAppForm } from '@/hooks/use-form'
import {
  useModifierGroups,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  useCreateModifier,
  useUpdateModifier,
  useDeleteModifier,
} from '@/hooks/use-modifier-groups'
import type {
  Modifier,
  ModifierGroup,
  CreateModifierGroupPayload,
  UpdateModifierGroupPayload,
  CreateModifierPayload,
  UpdateModifierPayload,
} from '@/lib/services/modifier-groups'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/modifiers/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: ModifiersPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function ModifiersPage() {
  // Expand / collapse state per group
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null)

  // Group delete state
  const [deleteGroupTarget, setDeleteGroupTarget] =
    useState<ModifierGroup | null>(null)
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false)

  // Modifier dialog state
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false)
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null)
  const [targetGroupId, setTargetGroupId] = useState<number | null>(null)

  // Modifier delete state
  const [deleteModifierTarget, setDeleteModifierTarget] =
    useState<Modifier | null>(null)
  const [deleteModifierOpen, setDeleteModifierOpen] = useState(false)

  // Data
  const { data, isLoading } = useModifierGroups({ pageSize: 100 })
  const groups = data?.data ?? []

  const deleteGroupMutation = useDeleteModifierGroup()
  const deleteModifierMutation = useDeleteModifier()

  // ── Helpers ───────────────────────────────────────────────────────────────

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreateGroup = () => {
    setEditingGroup(null)
    setGroupDialogOpen(true)
  }

  const openEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group)
    setGroupDialogOpen(true)
  }

  const openDeleteGroup = (group: ModifierGroup) => {
    setDeleteGroupTarget(group)
    setDeleteGroupOpen(true)
  }

  const closeGroupDialog = () => {
    setGroupDialogOpen(false)
    setEditingGroup(null)
  }

  const openAddModifier = (group: ModifierGroup) => {
    setEditingModifier(null)
    setTargetGroupId(group.id)
    // Auto-expand the group so the new modifier is visible
    setExpanded((prev) => new Set([...prev, group.id]))
    setModifierDialogOpen(true)
  }

  const openEditModifier = (modifier: Modifier) => {
    setEditingModifier(modifier)
    setTargetGroupId(modifier.modifier_group_id)
    setModifierDialogOpen(true)
  }

  const openDeleteModifier = (modifier: Modifier) => {
    setDeleteModifierTarget(modifier)
    setDeleteModifierOpen(true)
  }

  const closeModifierDialog = () => {
    setModifierDialogOpen(false)
    setEditingModifier(null)
    setTargetGroupId(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modifier Groups"
        description="Manage add-on options that can be attached to menu items (e.g. Size, Spice Level)."
        actions={
          <Button onClick={openCreateGroup}>
            <PlusIcon className="mr-2 size-4" />
            Add Group
          </Button>
        }
      />

      {/* ── Group List ──────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-44 rounded" />
                <Skeleton className="ml-auto h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <LayersIcon className="size-8 opacity-40" />
            <p className="text-sm">No modifier groups yet.</p>
            <Button variant="outline" size="sm" onClick={openCreateGroup}>
              <PlusIcon className="mr-1.5 size-3.5" />
              Add First Group
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {groups.map((group) => (
              <ModifierGroupRow
                key={group.id}
                group={group}
                isExpanded={expanded.has(group.id)}
                onToggle={toggleExpand}
                onEdit={openEditGroup}
                onDelete={openDeleteGroup}
                onAddModifier={openAddModifier}
                onEditModifier={openEditModifier}
                onDeleteModifier={openDeleteModifier}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Group Create / Edit Dialog ───────────────────────────────────── */}
      <Dialog
        open={groupDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeGroupDialog()
          else setGroupDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Modifier Group' : 'Add Modifier Group'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <ModifierGroupForm
              key={editingGroup?.id ?? 'new-group'}
              group={editingGroup ?? undefined}
              onSuccess={closeGroupDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Group Delete Confirmation ────────────────────────────────────── */}
      <ConfirmDialog
        title={`Delete "${deleteGroupTarget?.name}"?`}
        description="This will soft-delete the modifier group and all its options. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteGroupMutation.isPending}
        open={deleteGroupOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupTarget(null)
          setDeleteGroupOpen(open)
        }}
        onConfirm={() => {
          if (!deleteGroupTarget) return
          deleteGroupMutation.mutate(deleteGroupTarget.id, {
            onSuccess: () => {
              setDeleteGroupOpen(false)
              setDeleteGroupTarget(null)
            },
          })
        }}
      />

      {/* ── Modifier Create / Edit Dialog ────────────────────────────────── */}
      <Dialog
        open={modifierDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeModifierDialog()
          else setModifierDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingModifier ? 'Edit Modifier' : 'Add Modifier'}
            </DialogTitle>
          </DialogHeader>
          <ModifierForm
            key={editingModifier?.id ?? `new-modifier-${targetGroupId}`}
            modifier={editingModifier ?? undefined}
            groupId={targetGroupId ?? 0}
            onSuccess={closeModifierDialog}
          />
        </DialogContent>
      </Dialog>

      {/* ── Modifier Delete Confirmation ─────────────────────────────────── */}
      <ConfirmDialog
        title={`Delete modifier "${deleteModifierTarget?.name}"?`}
        description="This modifier option will be removed from the group."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={deleteModifierMutation.isPending}
        open={deleteModifierOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteModifierTarget(null)
          setDeleteModifierOpen(open)
        }}
        onConfirm={() => {
          if (!deleteModifierTarget) return
          deleteModifierMutation.mutate(deleteModifierTarget.id, {
            onSuccess: () => {
              setDeleteModifierOpen(false)
              setDeleteModifierTarget(null)
            },
          })
        }}
      />
    </div>
  )
}

// ─── Modifier Group Row (with expandable modifiers) ───────────────────────────

interface ModifierGroupRowProps {
  group: ModifierGroup
  isExpanded: boolean
  onToggle: (id: number) => void
  onEdit: (group: ModifierGroup) => void
  onDelete: (group: ModifierGroup) => void
  onAddModifier: (group: ModifierGroup) => void
  onEditModifier: (modifier: Modifier) => void
  onDeleteModifier: (modifier: Modifier) => void
}

function ModifierGroupRow({
  group,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddModifier,
  onEditModifier,
  onDeleteModifier,
}: ModifierGroupRowProps) {
  const modifiers = group.modifiers ?? []

  return (
    <>
      {/* ── Group row ──────────────────────────────────────────────────── */}
      <div
        className="group flex cursor-pointer items-center gap-2 px-4 py-3 hover:bg-muted/40 transition-colors"
        onClick={() => onToggle(group.id)}
      >
        {/* Expand / collapse indicator */}
        <div className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground">
          <ChevronRightIcon
            className={cn(
              'size-3.5 transition-transform duration-150',
              isExpanded && 'rotate-90',
            )}
          />
        </div>

        {/* Name */}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {group.name}
        </span>

        {/* Description */}
        {group.description && (
          <span className="hidden truncate text-xs text-muted-foreground lg:block max-w-xs">
            {group.description}
          </span>
        )}

        {/* Modifier count badge */}
        <Badge variant="outline" className="shrink-0 text-xs">
          {modifiers.length} option{modifiers.length !== 1 ? 's' : ''}
        </Badge>

        {/* Required badge */}
        {group.is_required ? (
          <Badge variant="default" className="shrink-0 text-xs">
            Required
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-xs">
            Optional
          </Badge>
        )}

        {/* Min–Max */}
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {group.min_selections}–{group.max_selections} sel.
        </span>

        {/* Sort order */}
        <span className="hidden shrink-0 text-xs text-muted-foreground md:block">
          order: {group.sort_order}
        </span>

        {/* Status */}
        <StatusBadge status={group.is_active ? 'active' : 'inactive'} />

        {/* Row actions (visible on hover) */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Add modifier option"
            onClick={(e) => { e.stopPropagation(); onAddModifier(group) }}
          >
            <PlusIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            title="Edit group"
            onClick={(e) => { e.stopPropagation(); onEdit(group) }}
          >
            <PencilIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            title="Delete group"
            onClick={(e) => { e.stopPropagation(); onDelete(group) }}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Expanded modifiers sub-table ────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Modifier Options
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onAddModifier(group)}
            >
              <PlusIcon className="mr-1 size-3" />
              Add Option
            </Button>
          </div>

          {modifiers.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No options yet. Add the first modifier option above.
            </p>
          ) : (
            <ModifiersSubTable
              modifiers={modifiers}
              onEdit={onEditModifier}
              onDelete={onDeleteModifier}
            />
          )}
        </div>
      )}
    </>
  )
}

// ─── Modifiers Sub-Table ──────────────────────────────────────────────────────

interface ModifiersSubTableProps {
  modifiers: Modifier[]
  onEdit: (modifier: Modifier) => void
  onDelete: (modifier: Modifier) => void
}

function ModifiersSubTable({
  modifiers,
  onEdit,
  onDelete,
}: ModifiersSubTableProps) {
  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Name
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Extra Price
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Sort
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              Status
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {modifiers.map((modifier) => (
            <ModifierSubRow
              key={modifier.id}
              modifier={modifier}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Modifier Sub-Row ─────────────────────────────────────────────────────────

interface ModifierSubRowProps {
  modifier: Modifier
  onEdit: (modifier: Modifier) => void
  onDelete: (modifier: Modifier) => void
}

function ModifierSubRow({ modifier, onEdit, onDelete }: ModifierSubRowProps) {
  return (
    <tr className="group hover:bg-muted/30 transition-colors">
      <td className="px-3 py-2 font-medium">{modifier.name}</td>
      <td className="px-3 py-2 text-muted-foreground">
        {modifier.extra_price > 0
          ? `+${modifier.extra_price.toLocaleString()}`
          : '—'}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{modifier.sort_order}</td>
      <td className="px-3 py-2">
        <StatusBadge status={modifier.is_active ? 'active' : 'inactive'} />
      </td>
      <td className="px-3 py-2">
        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            title="Edit modifier"
            onClick={() => onEdit(modifier)}
          >
            <PencilIcon className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:text-destructive"
            title="Delete modifier"
            onClick={() => onDelete(modifier)}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ─── Modifier Group Form ──────────────────────────────────────────────────────

interface ModifierGroupFormProps {
  group?: ModifierGroup
  onSuccess: () => void
}

function ModifierGroupForm({ group, onSuccess }: ModifierGroupFormProps) {
  const isEdit = !!group
  const createMutation = useCreateModifierGroup()
  const updateMutation = useUpdateModifierGroup()

  const form = useAppForm({
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
      is_required: group?.is_required ?? false,
      min_selections: group?.min_selections ?? 0,
      max_selections: group?.max_selections ?? 1,
      sort_order: group?.sort_order ?? 0,
      is_active: group?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      if (isEdit && group) {
        const payload: UpdateModifierGroupPayload = {
          name: value.name,
          description: value.description || null,
          is_required: value.is_required,
          min_selections: value.min_selections,
          max_selections: value.max_selections,
          sort_order: value.sort_order,
          is_active: value.is_active,
        }
        updateMutation.mutate({ id: group.id, payload }, { onSuccess })
      } else {
        const payload: CreateModifierGroupPayload = {
          name: value.name,
          description: value.description || null,
          is_required: value.is_required,
          min_selections: value.min_selections,
          max_selections: value.max_selections,
          sort_order: value.sort_order,
        }
        createMutation.mutate(payload, { onSuccess })
      }
    },
  })

  return (
    <form
      className="space-y-4 p-1"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Name */}
      <form.AppField
        name="name"
        validators={{
          onSubmit: ({ value }) => {
            if (!value.trim()) return 'Name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Group Name"
            placeholder="e.g. Size, Spice Level, Cooking Method"
          />
        )}
      </form.AppField>

      {/* Description */}
      <form.AppField name="description">
        {(field) => (
          <field.TextareaField
            label="Description"
            placeholder="Optional description for this modifier group"
            rows={2}
          />
        )}
      </form.AppField>

      {/* Is Required */}
      <form.AppField name="is_required">
        {(field) => (
          <field.SwitchField
            label="Required"
            description="Customers must make a selection from this group."
          />
        )}
      </form.AppField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Min Selections */}
        <form.AppField
          name="min_selections"
          validators={{
            onSubmit: ({ value }) => {
              if (value < 0) return 'Must be ≥ 0'
              return undefined
            },
          }}
        >
          {(field) => (
            <field.NumberField
              label="Min Selections"
              min={0}
              step={1}
              description="0 = no minimum"
            />
          )}
        </form.AppField>

        {/* Max Selections */}
        <form.AppField
          name="max_selections"
          validators={{
            onSubmit: ({ value, fieldApi }) => {
              if (value < 1) return 'Must be ≥ 1'
              const min = fieldApi.form.getFieldValue('min_selections') as number
              if (value < min) return `Must be ≥ min (${min})`
              return undefined
            },
          }}
        >
          {(field) => (
            <field.NumberField
              label="Max Selections"
              min={1}
              step={1}
              description="1 = single choice"
            />
          )}
        </form.AppField>
      </div>

      {/* Sort Order */}
      <form.AppField name="sort_order">
        {(field) => (
          <field.NumberField
            label="Sort Order"
            min={0}
            step={1}
            description="Lower numbers appear first."
          />
        )}
      </form.AppField>

      {/* Is Active (edit only) */}
      {isEdit && (
        <form.AppField name="is_active">
          {(field) => (
            <field.SwitchField
              label="Active"
              description="Inactive groups won't appear in the POS."
            />
          )}
        </form.AppField>
      )}

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Create Group'}
            className="w-full min-w-[140px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

// ─── Modifier Form ────────────────────────────────────────────────────────────

interface ModifierFormProps {
  modifier?: Modifier
  groupId: number
  onSuccess: () => void
}

function ModifierForm({ modifier, groupId, onSuccess }: ModifierFormProps) {
  const isEdit = !!modifier
  const createMutation = useCreateModifier()
  const updateMutation = useUpdateModifier()

  const form = useAppForm({
    defaultValues: {
      name: modifier?.name ?? '',
      extra_price: modifier?.extra_price ?? 0,
      sort_order: modifier?.sort_order ?? 0,
      is_active: modifier?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      if (isEdit && modifier) {
        const payload: UpdateModifierPayload = {
          name: value.name,
          extra_price: value.extra_price,
          sort_order: value.sort_order,
          is_active: value.is_active,
        }
        updateMutation.mutate(
          { modifierId: modifier.id, payload },
          { onSuccess },
        )
      } else {
        const payload: CreateModifierPayload = {
          name: value.name,
          extra_price: value.extra_price,
          sort_order: value.sort_order,
        }
        createMutation.mutate({ groupId, payload }, { onSuccess })
      }
    },
  })

  return (
    <form
      className="space-y-4 p-1"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      {/* Name */}
      <form.AppField
        name="name"
        validators={{
          onSubmit: ({ value }) => {
            if (!value.trim()) return 'Name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Option Name"
            placeholder="e.g. Small, Mild, Grilled"
          />
        )}
      </form.AppField>

      {/* Extra Price */}
      <form.AppField
        name="extra_price"
        validators={{
          onSubmit: ({ value }) => {
            if (value < 0) return 'Must be ≥ 0'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Extra Price"
            min={0}
            step={1}
            prefix="Rp"
            description="Additional charge for this option. Use 0 for no extra cost."
          />
        )}
      </form.AppField>

      {/* Sort Order */}
      <form.AppField name="sort_order">
        {(field) => (
          <field.NumberField
            label="Sort Order"
            min={0}
            step={1}
            description="Lower numbers appear first."
          />
        )}
      </form.AppField>

      {/* Is Active */}
      <form.AppField name="is_active">
        {(field) => (
          <field.SwitchField
            label="Active"
            description="Inactive options won't be shown to customers."
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Add Modifier'}
            className="w-full min-w-[130px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
