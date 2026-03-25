import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useCreateMenuItem } from '@/hooks/use-menu-items'
import { useCategoryTree } from '@/hooks/use-categories'
import { useAppForm } from '@/hooks/use-form'
import {
  PRICING_TYPE_OPTIONS,
  UNIT_OPTIONS,
  type CreateMenuItemPayload,
} from '@/lib/services/menu-items'
import {
  IngredientsFieldArray,
  type IngredientRow,
} from '@/components/menu-items/ingredients-field-array'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/menu-items/create')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: CreateMenuItemPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function CreateMenuItemPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Product"
        description="Create a new menu item. Link ingredients in the recipe tab to enable automatic stock deduction on sale."
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
        <MenuItemForm onSuccess={() => navigate({ to: '/menu-items' })} />
      </div>
    </div>
  )
}

// ─── Shared Form ─────────────────────────────────────────────────────────────

interface MenuItemFormProps {
  onSuccess: () => void
}

export function MenuItemForm({ onSuccess }: MenuItemFormProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const createMutation = useCreateMenuItem()
  const { data: categoryTreeData } = useCategoryTree()

  // Flatten category tree for combobox
  const categoryOptions = buildCategoryOptions(categoryTreeData?.data)

  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      barcode: '',
      image_url: '',
      // Pricing & Units
      pricing_type: 'fixed' as 'fixed' | 'weight_based',
      unit_of_measure: 'portion' as CreateMenuItemPayload['unit_of_measure'],
      price: 0 as number,
      cost: 0 as number,
      min_order_qty: 1 as number,
      // Classification
      category_id: null as number | null,
      sort_order: 0 as number,
      preparation_time_minutes: null as number | null,
      is_available: true,
    },
    onSubmit: async ({ value }) => {
      const validIngredients = ingredients.filter(
        (r) => r.inventory_id !== null && r.quantity_needed > 0,
      )
      const payload: CreateMenuItemPayload = {
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
        ingredients: validIngredients.map((r) => ({
          inventory_id: r.inventory_id!,
          quantity_needed: r.quantity_needed,
        })),
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
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Units</TabsTrigger>
          <TabsTrigger value="classification">Classification</TabsTrigger>
          <TabsTrigger value="ingredients">
            Ingredients
            {ingredients.length > 0 && (
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0 text-xs font-medium text-secondary-foreground">
                {ingredients.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Basic Information ────────────────────────────────── */}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <field.TextField
                      label="SKU"
                      placeholder="e.g. FOOD-001"
                    />
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
                <Button type="button" onClick={() => setActiveTab('pricing')}>
                  Next: Pricing & Units
                </Button>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <form.AppField
                  name="price"
                  validators={{
                    onBlur: ({ value }) =>
                      value === undefined || value === null || Number(value) <= 0
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

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('basic')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('classification')}
                >
                  Next: Classification
                </Button>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('pricing')}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveTab('ingredients')}
                >
                  Next: Ingredients
                </Button>
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
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab('classification')}
              >
                Back
              </Button>
              <form.AppForm>
                <form.SubscribeButton label="Create Product" />
              </form.AppForm>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </form>
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
