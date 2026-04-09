import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ExternalLinkIcon,
  LayersIcon,
} from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import {
  useMenuItem,
  useUpdateMenuItem,
  useAssignModifierGroup,
  useUnassignModifierGroup,
} from '@/hooks/use-menu-items'
import { useCategoryTree } from '@/hooks/use-categories'
import { useModifierGroups } from '@/hooks/use-modifier-groups'
import { useAppForm } from '@/hooks/use-form'
import {
  PRICING_TYPE_OPTIONS,
  UNIT_OPTIONS,
  type UpdateMenuItemPayload,
  type ModifierGroup,
} from '@/lib/services/menu-items'
import {
  IngredientsFieldArray,
  type IngredientRow,
  createIngredientRow,
} from '@/components/menu-items/ingredients-field-array'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Separator } from '@/components/ui/separator'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/menu-items/$itemId')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: EditMenuItemPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function EditMenuItemPage() {
  const navigate = useNavigate()
  const { itemId } = Route.useParams()
  const itemIdNum = parseInt(itemId, 10)

  const { data, isLoading } = useMenuItem(itemIdNum)
  const item = data?.data

  return (
    <div className="space-y-6">
      <PageHeader
        title={isLoading ? 'Edit Product' : `Edit "${item?.name ?? ''}"`}
        description="Update menu item details, pricing, and modifier groups."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/menu-items' })}
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Menu Items
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl">
        {isLoading ? (
          <Card>
            <CardContent className="space-y-4 pt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : item ? (
          <EditMenuItemForm
            key={item.id}
            itemId={item.id}
            defaultValues={{
              name: item.name,
              description: item.description ?? '',
              sku: item.sku ?? '',
              barcode: item.barcode ?? '',
              image_url: item.image_url ?? '',
              pricing_type: item.pricing_type,
              unit_of_measure: item.unit_of_measure,
              price: item.price,
              cost: item.cost,
              min_order_qty: item.min_order_qty,
              category_id: item.category_id,
              sort_order: item.sort_order,
              preparation_time_minutes: item.preparation_time_minutes,
              is_available: item.is_available,
              is_active: item.is_active,
            }}
            initialIngredients={(
              item.ingredients ?? []
            ).map((ing) => ({
              ...createIngredientRow(),
              inventory_id: ing.inventory_id,
              quantity_needed: ing.quantity_needed,
            }))}
            modifierGroups={item.modifier_groups ?? []}
            onSuccess={() => navigate({ to: '/menu-items' })}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Menu item not found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface EditMenuItemFormProps {
  itemId: number
  defaultValues: {
    name: string
    description: string
    sku: string
    barcode: string
    image_url: string
    pricing_type: 'fixed' | 'weight_based'
    unit_of_measure: UpdateMenuItemPayload['unit_of_measure']
    price: number
    cost: number
    min_order_qty: number
    category_id: number | null
    sort_order: number
    preparation_time_minutes: number | null
    is_available: boolean
    is_active: boolean
  }
  initialIngredients: IngredientRow[]
  modifierGroups: ModifierGroup[]
  onSuccess: () => void
}

function EditMenuItemForm({
  itemId,
  defaultValues,
  initialIngredients,
  modifierGroups,
  onSuccess,
}: EditMenuItemFormProps) {
  const [ingredients, setIngredients] =
    useState<IngredientRow[]>(initialIngredients)
  const updateMutation = useUpdateMenuItem()
  const { data: categoryTreeData } = useCategoryTree()
  const categoryOptions = buildCategoryOptions(categoryTreeData?.data)

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const validIngredients = ingredients.filter(
        (r) => r.inventory_id !== null && r.quantity_needed > 0,
      )
      const payload: UpdateMenuItemPayload = {
        name: value.name.trim(),
        description: value.description?.trim() || undefined,
        sku: value.sku?.trim() || undefined,
        barcode: value.barcode?.trim() || undefined,
        image_url: value.image_url?.trim() || undefined,
        pricing_type: value.pricing_type,
        unit_of_measure: value.unit_of_measure,
        price: Number(value.price),
        cost: Number(value.cost) || 0,
        min_order_qty: Number(value.min_order_qty) || 1,
        category_id: value.category_id ?? undefined,
        sort_order: Number(value.sort_order) || 0,
        preparation_time_minutes:
          value.preparation_time_minutes != null
            ? Number(value.preparation_time_minutes)
            : undefined,
        is_available: value.is_available,
        is_active: value.is_active,
        ingredients: validIngredients.map((r) => ({
          inventory_id: r.inventory_id!,
          quantity_needed: r.quantity_needed,
        })),
      }
      await updateMutation.mutateAsync({ id: itemId, payload })
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
    >
      <Tabs defaultValue="basic">
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Units</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="ingredients">
            Ingredients
            {ingredients.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                {ingredients.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="modifiers">
            Modifiers
            {modifierGroups.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                {modifierGroups.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Basic Info ───────────────────────────────────────── */}
        <TabsContent value="basic">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <form.AppField
                name="name"
                validators={{
                  onBlur: ({ value }) =>
                    !value?.trim()
                      ? 'Product name is required'
                      : value.trim().length > 150
                        ? 'Name must be 150 characters or less'
                        : undefined,
                }}
              >
                {(field) => (
                  <field.TextField label="Product Name *" placeholder="e.g. Nasi Goreng Spesial" />
                )}
              </form.AppField>

              <form.AppField name="description">
                {(field) => (
                  <field.TextareaField
                    label="Description"
                    placeholder="Brief description of the menu item"
                    rows={3}
                  />
                )}
              </form.AppField>

              <div className="form-grid-mobile form-grid-mobile-2">
                <form.AppField
                  name="sku"
                  validators={{
                    onBlur: ({ value }) =>
                      value && value.trim().length > 50
                        ? 'SKU must be 50 characters or less'
                        : undefined,
                  }}
                >
                  {(field) => (
                    <field.TextField label="SKU" placeholder="e.g. FOOD-001" />
                  )}
                </form.AppField>

                <form.AppField name="barcode">
                  {(field) => (
                    <field.TextField
                      label="Barcode"
                      placeholder="e.g. 8991234567001"
                    />
                  )}
                </form.AppField>
              </div>

              <form.AppField name="image_url">
                {(field) => (
                  <field.ImageUploadField
                    label="Product Image"
                    bucket="menu-images"
                    description="Upload a product image. Recommended: 400×400px, JPG or PNG."
                  />
                )}
              </form.AppField>

              <div className="flex justify-end">
                <form.AppForm>
                  <form.SubscribeButton label="Save Changes" />
                </form.AppForm>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Pricing & Units ──────────────────────────────────── */}
        <TabsContent value="pricing">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <form.AppField
                name="pricing_type"
                validators={{
                  onBlur: ({ value }) =>
                    !value ? 'Pricing type is required' : undefined,
                }}
              >
                {(field) => (
                  <field.RadioGroupField
                    label="Pricing Type *"
                    options={PRICING_TYPE_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                      description:
                        o.value === 'fixed'
                          ? 'Charged at a flat rate per item'
                          : 'Price calculated per unit of weight/measure',
                    }))}
                  />
                )}
              </form.AppField>

              <form.AppField
                name="unit_of_measure"
                validators={{
                  onBlur: ({ value }) =>
                    !value ? 'Unit of measure is required' : undefined,
                }}
              >
                {(field) => (
                  <field.SelectField
                    label="Unit of Measure *"
                    options={UNIT_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                    placeholder="Select unit…"
                  />
                )}
              </form.AppField>

              <div className="form-grid-mobile form-grid-mobile-2">
                <form.AppField
                  name="price"
                  validators={{
                    onBlur: ({ value }) =>
                      value === undefined ||
                      value === null ||
                      Number(value) <= 0
                        ? 'Price must be greater than 0'
                        : undefined,
                  }}
                >
                  {(field) => (
                    <field.NumberField
                      label="Price *"
                      min={0}
                      step={0.01}
                      prefix="Rp"
                      placeholder="0"
                    />
                  )}
                </form.AppField>

                <form.AppField
                  name="cost"
                  validators={{
                    onBlur: ({ value }) =>
                      value !== undefined &&
                      value !== null &&
                      Number(value) < 0
                        ? 'Cost must be 0 or greater'
                        : undefined,
                  }}
                >
                  {(field) => (
                    <field.NumberField
                      label="Cost Price"
                      min={0}
                      step={0.01}
                      prefix="Rp"
                      placeholder="0"
                      description="Your cost to produce this item"
                    />
                  )}
                </form.AppField>
              </div>

              <form.AppField
                name="min_order_qty"
                validators={{
                  onBlur: ({ value }) =>
                    value !== undefined &&
                    value !== null &&
                    Number(value) < 1
                      ? 'Minimum order quantity must be at least 1'
                      : undefined,
                }}
              >
                {(field) => (
                  <field.NumberField
                    label="Minimum Order Quantity"
                    min={1}
                    step={0.001}
                    placeholder="1"
                    description="Minimum amount that can be ordered at once"
                  />
                )}
              </form.AppField>

              <div className="flex justify-end">
                <form.AppForm>
                  <form.SubscribeButton label="Save Changes" />
                </form.AppForm>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Classification ───────────────────────────────────── */}
        <TabsContent value="classification">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <form.AppField name="category_id">
                {(field) => (
                  <field.ComboboxField
                    label="Category"
                    options={categoryOptions}
                    placeholder="No category"
                    searchPlaceholder="Search categories…"
                    emptyMessage="No categories found."
                  />
                )}
              </form.AppField>

              <div className="form-grid-mobile form-grid-mobile-2">
                <form.AppField name="sort_order">
                  {(field) => (
                    <field.NumberField
                      label="Sort Order"
                      min={0}
                      step={1}
                      placeholder="0"
                      description="Lower numbers appear first"
                    />
                  )}
                </form.AppField>

                <form.AppField name="preparation_time_minutes">
                  {(field) => (
                    <field.NumberField
                      label="Prep Time (minutes)"
                      min={0}
                      step={1}
                      placeholder="e.g. 15"
                      description="Estimated preparation time"
                    />
                  )}
                </form.AppField>
              </div>

              <form.AppField name="is_available">
                {(field) => (
                  <field.SwitchField
                    label="Available"
                    description="Make this item available for ordering in the POS app"
                  />
                )}
              </form.AppField>

              <form.AppField name="is_active">
                {(field) => (
                  <field.SwitchField
                    label="Active"
                    description="Deactivating hides the item from the entire system"
                  />
                )}
              </form.AppField>

              <div className="flex justify-end">
                <form.AppForm>
                  <form.SubscribeButton label="Save Changes" />
                </form.AppForm>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Ingredients ──────────────────────────────────────── */}
        <TabsContent value="ingredients">
          <div className="space-y-4">
            <IngredientsFieldArray
              rows={ingredients}
              onChange={setIngredients}
            />
            <div className="flex justify-end">
              <form.AppForm>
                <form.SubscribeButton label="Save Changes" />
              </form.AppForm>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 5: Modifiers ───────────────────────────────────────── */}
        <TabsContent value="modifiers">
          <ModifiersTab itemId={itemId} assignedGroups={modifierGroups} />
        </TabsContent>
      </Tabs>
    </form>
  )
}

// ─── Modifiers Tab ─────────────────────────────────────────────────────────────

interface ModifiersTabProps {
  itemId: number
  assignedGroups: ModifierGroup[]
}

function ModifiersTab({ itemId, assignedGroups }: ModifiersTabProps) {
  const [assignOpen, setAssignOpen] = useState(false)
  const [unassignTarget, setUnassignTarget] = useState<ModifierGroup | null>(null)
  const [unassignOpen, setUnassignOpen] = useState(false)

  const assignMutation = useAssignModifierGroup()
  const unassignMutation = useUnassignModifierGroup()

  const { data: allGroupsData } = useModifierGroups({ pageSize: 200 })
  const allGroups = allGroupsData?.data ?? []

  // Only show groups not already assigned
  const assignedIds = new Set(assignedGroups.map((g) => g.id))
  const availableToAssign = allGroups.filter((g) => !assignedIds.has(g.id) && g.is_active)

  const handleAssign = async (groupId: number) => {
    await assignMutation.mutateAsync({ itemId, modifierGroupId: groupId })
    setAssignOpen(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Modifier Groups</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Assign modifier groups to give customers customization options.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.location.assign('/modifiers')}
            >
              <ExternalLinkIcon className="mr-1.5 size-3.5" />
              Manage Groups
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setAssignOpen(true)}
              disabled={availableToAssign.length === 0}
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              Assign Group
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {assignedGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
              <LayersIcon className="size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No modifier groups assigned yet.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAssignOpen(true)}
                disabled={availableToAssign.length === 0}
              >
                <PlusIcon className="mr-1.5 size-3.5" />
                Assign First Group
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedGroups.map((group) => (
                <ModifierGroupCard
                  key={group.id}
                  group={group}
                  onUnassign={() => {
                    setUnassignTarget(group)
                    setUnassignOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Assign dialog ─────────────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Modifier Group</DialogTitle>
          </DialogHeader>
          {availableToAssign.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              All available modifier groups are already assigned.
            </p>
          ) : (
            <Command>
              <CommandInput placeholder="Search groups…" />
              <CommandList>
                <CommandEmpty>No modifier groups found.</CommandEmpty>
                <CommandGroup>
                  {availableToAssign.map((group) => (
                    <CommandItem
                      key={group.id}
                      value={group.name}
                      onSelect={() => handleAssign(group.id)}
                      disabled={assignMutation.isPending}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <span className="font-medium">{group.name}</span>
                      {group.description && (
                        <span className="text-xs text-muted-foreground">
                          {group.description}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Unassign confirm ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        title={`Remove "${unassignTarget?.name}"?`}
        description="This will unassign the modifier group from this menu item. The group itself will not be deleted."
        variant="destructive"
        isLoading={unassignMutation.isPending}
        onConfirm={async () => {
          if (!unassignTarget) return
          await unassignMutation.mutateAsync({
            itemId,
            groupId: unassignTarget.id,
          })
          setUnassignOpen(false)
          setUnassignTarget(null)
        }}
      />
    </div>
  )
}

// ─── Modifier Group Card ──────────────────────────────────────────────────────

interface ModifierGroupCardProps {
  group: ModifierGroup
  onUnassign: () => void
}

function ModifierGroupCard({ group, onUnassign }: ModifierGroupCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{group.name}</span>
            <Badge variant={group.is_required ? 'default' : 'secondary'} className="text-xs">
              {group.is_required ? 'Required' : 'Optional'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {group.min_selections === group.max_selections
                ? `Select exactly ${group.min_selections}`
                : `Select ${group.min_selections}–${group.max_selections}`}
            </span>
          </div>
          {group.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onUnassign}
        >
          <Trash2Icon className="size-4" />
          <span className="sr-only">Remove modifier group</span>
        </Button>
      </div>

      {group.modifiers && group.modifiers.length > 0 && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-2">
            {group.modifiers.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-sm"
              >
                <span>{mod.name}</span>
                {mod.extra_price > 0 && (
                  <span className="text-xs text-muted-foreground">
                    +{mod.extra_price.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CategoryNode = {
  id: number
  name: string
  children?: CategoryNode[]
}

function buildCategoryOptions(
  nodes: CategoryNode[] | undefined,
  depth = 0,
): { value: number; label: string }[] {
  const result: { value: number; label: string }[] = []
  for (const node of nodes ?? []) {
    result.push({
      value: node.id,
      label: `${'  '.repeat(depth)}${node.name}`,
    })
    if (node.children?.length) {
      result.push(...buildCategoryOptions(node.children, depth + 1))
    }
  }
  return result
}
