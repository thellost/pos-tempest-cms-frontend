import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/auth-guards'
import {
  ChevronRightIcon,
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  FolderPlusIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { useAppForm } from '@/hooks/use-form'
import {
  useCategoryTree,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/use-categories'
import type {
  Category,
  CategoryTree,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/lib/services/categories'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/categories/')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: CategoriesPage,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively count all descendants of a tree node */
function countDescendants(node: CategoryTree): number {
  return (node.children ?? []).reduce(
    (acc, child) => acc + 1 + countDescendants(child),
    0,
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CategoriesPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentIdForNew, setParentIdForNew] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: treeData, isLoading } = useCategoryTree()
  // Flat list for parent combobox (exclude the category being edited)
  const { data: flatData } = useCategories({ pageSize: 200 })

  const tree = treeData?.data ?? []
  const flatList = flatData?.data ?? []

  const deleteMutation = useDeleteCategory()

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreate = (parentId: number | null = null) => {
    setEditingCategory(null)
    setParentIdForNew(parentId)
    setDialogOpen(true)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setParentIdForNew(null)
    setDialogOpen(true)
  }

  const openDelete = (cat: Category) => {
    setDeleteTarget(cat)
    setDeleteOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingCategory(null)
    setParentIdForNew(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage menu categories and sub-categories."
        actions={
          <Button onClick={() => openCreate(null)}>
            <PlusIcon className="mr-2 size-4" />
            Add Category
          </Button>
        }
      />

      {/* ── Tree View ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-0 divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="ml-auto h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : tree.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FolderIcon className="size-8 opacity-40" />
            <p className="text-sm">No categories yet.</p>
            <Button variant="outline" size="sm" onClick={() => openCreate(null)}>
              <PlusIcon className="mr-1.5 size-3.5" />
              Add First Category
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {tree.map((node) => (
              <CategoryTreeNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggleExpand}
                onEdit={openEdit}
                onAddChild={openCreate}
                onDelete={openDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
          else setDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <CategoryForm
              key={editingCategory?.id ?? `new-${parentIdForNew}`}
              category={editingCategory ?? undefined}
              defaultParentId={parentIdForNew}
              allCategories={flatList}
              editingId={editingCategory?.id}
              onSuccess={closeDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────────────── */}
      <ConfirmDialog
        title={`Delete "${deleteTarget?.name}"?`}
        description="This category will be soft-deleted. Make sure no active menu items are assigned to it first."
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

// ─── Tree Node ────────────────────────────────────────────────────────────────

interface CategoryTreeNodeProps {
  node: CategoryTree
  depth: number
  expanded: Set<number>
  onToggle: (id: number) => void
  onEdit: (cat: Category) => void
  onAddChild: (parentId: number) => void
  onDelete: (cat: Category) => void
}

function CategoryTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onEdit,
  onAddChild,
  onDelete,
}: CategoryTreeNodeProps) {
  const hasChildren = (node.children ?? []).length > 0
  const isExpanded = expanded.has(node.id)
  const descendantCount = useMemo(() => countDescendants(node), [node])
  const isMobile = useIsMobile()

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-2 px-4 py-3 hover:bg-muted/40 transition-colors',
          depth > 0 && 'bg-muted/20',
          hasChildren && 'cursor-pointer',
        )}
        style={{ paddingLeft: `${16 + depth * (isMobile ? 12 : 20)}px` }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {/* Expand / Collapse indicator */}
        <div
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground',
            !hasChildren && 'invisible',
          )}
        >
          <ChevronRightIcon
            className={cn(
              'size-3.5 transition-transform duration-150',
              isExpanded && 'rotate-90',
            )}
          />
        </div>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpenIcon className="size-4 shrink-0 text-amber-500" />
        ) : (
          <FolderIcon className="size-4 shrink-0 text-amber-500/80" />
        )}

        {/* Button color swatch */}
        <div
          className={cn(
            'relative size-4 shrink-0 rounded-sm border border-input',
            !node.button_color && 'bg-muted',
          )}
          style={node.button_color ? { backgroundColor: node.button_color } : undefined}
          title={node.button_color ? `Button color: ${node.button_color}` : 'No color set'}
        >
          {!node.button_color && (
            <svg
              className="absolute inset-0 size-full text-muted-foreground/30"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="12" />
            </svg>
          )}
        </div>

        {/* Name + meta */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">{node.name}</span>
          {node.description && (
            <span className="hidden truncate text-xs text-muted-foreground md:block">
              — {node.description}
            </span>
          )}
          {descendantCount > 0 && (
            <Badge variant="secondary" className="hidden shrink-0 text-xs sm:inline-flex">
              {descendantCount} sub
            </Badge>
          )}
        </div>

        {/* Sort order */}
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          order: {node.sort_order}
        </span>

        {/* Status */}
        <div className="hidden sm:block shrink-0">
          <StatusBadge status={node.is_active ? 'active' : 'inactive'} />
        </div>

        {/* Row actions — single dropdown works on both hover/desktop and touch/mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="size-7 shrink-0">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddChild(node.id) }}>
              <FolderPlusIcon className="mr-2 size-4" />
              Add sub-category
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(node) }}>
              <PencilIcon className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(node) }}
            >
              <Trash2Icon className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <>
          {(node.children ?? []).map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </>
      )}
    </>
  )
}

// ─── Category Form ────────────────────────────────────────────────────────────

interface CategoryFormProps {
  category?: Category
  defaultParentId?: number | null
  allCategories: Category[]
  editingId?: number
  onSuccess: () => void
}

function CategoryForm({
  category,
  defaultParentId,
  allCategories,
  editingId,
  onSuccess,
}: CategoryFormProps) {
  const isEdit = !!category
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()

  // Build combobox options — exclude the category itself and its descendants
  const parentOptions = useMemo(() => {
    const excluded = new Set<number>()
    if (editingId) {
      excluded.add(editingId)
      // Also exclude all descendants by walking the tree (flat list, parent_id based)
      const addDescendants = (parentId: number) => {
        allCategories
          .filter((c) => c.parent_id === parentId)
          .forEach((c) => {
            excluded.add(c.id)
            addDescendants(c.id)
          })
      }
      addDescendants(editingId)
    }

    return [
      { value: 0, label: '— None (root category)' },
      ...allCategories
        .filter((c) => !excluded.has(c.id))
        .map((c) => ({ value: c.id, label: c.name })),
    ]
  }, [allCategories, editingId])

  const form = useAppForm({
    defaultValues: {
      parent_id: category?.parent_id ?? defaultParentId ?? (0 as number | null),
      name: category?.name ?? '',
      description: category?.description ?? '',
      sort_order: category?.sort_order ?? 0,
      button_color: (category?.button_color ?? null) as string | null,
      is_active: category?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      const parentId =
        value.parent_id === 0 || value.parent_id === null
          ? null
          : Number(value.parent_id)

      if (isEdit && category) {
        const payload: UpdateCategoryPayload = {
          parent_id: parentId,
          name: value.name,
          description: value.description || undefined,
          sort_order: value.sort_order,
          button_color: value.button_color || null,
          is_active: value.is_active,
        }
        updateMutation.mutate(
          { id: category.id, payload },
          { onSuccess },
        )
      } else {
        const payload: CreateCategoryPayload = {
          parent_id: parentId,
          name: value.name,
          description: value.description || undefined,
          sort_order: value.sort_order,
          button_color: value.button_color || null,
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
      {/* Parent Category */}
      <form.AppField name="parent_id">
        {(field) => (
          <field.ComboboxField
            label="Parent Category"
            options={parentOptions}
            placeholder="None (root category)"
            description="Leave blank to create a top-level category."
          />
        )}
      </form.AppField>

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
            label="Name"
            placeholder="e.g. Main Course"
          />
        )}
      </form.AppField>

      {/* Description */}
      <form.AppField name="description">
        {(field) => (
          <field.TextareaField
            label="Description"
            placeholder="Optional description"
            rows={3}
          />
        )}
      </form.AppField>

      {/* Sort Order */}
      <form.AppField name="sort_order">
        {(field) => (
          <field.NumberField
            label="Sort Order"
            description="Lower numbers appear first."
            min={0}
            step={1}
          />
        )}
      </form.AppField>

      {/* Button Color */}
      <form.AppField
        name="button_color"
        validators={{
          onBlur: ({ value }) => {
            if (value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
              return 'Must be a valid hex color (e.g. #f4a261)'
            }
            return undefined
          },
        }}
      >
        {(field) => (
          <field.ColorPickerField
            label="Button Color"
            description="Color used for this category's button in the POS app. Leave blank for no color."
          />
        )}
      </form.AppField>

      {/* Is Active (edit only) */}
      {isEdit && (
        <form.AppField name="is_active">
          {(field) => (
            <field.SwitchField
              label="Active"
              description="Inactive categories won't appear in the POS."
            />
          )}
        </form.AppField>
      )}

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Create Category'}
            className="w-full min-w-[150px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
