import { useRef, useState } from 'react'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
  Trash2Icon,
  UtensilsIcon,
} from 'lucide-react'
import type { InventorySearchResult } from '@/lib/services/inventory'
import { useInventorySearch } from '@/hooks/use-inventory'
import { useDebounce } from '@/hooks/use-debounce'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type IngredientOption = Pick<
  InventorySearchResult,
  'id' | 'name' | 'unit_of_measure' | 'branch_id'
>

export interface IngredientRow {
  /** Stable React key — not sent to the API */
  key: string
  inventory_id: number | null
  quantity_needed: number
  selected_inventory?: IngredientOption
}

function generateKey() {
  return Math.random().toString(36).slice(2)
}

/** Create a fresh empty ingredient row */
export function createIngredientRow(): IngredientRow {
  return { key: generateKey(), inventory_id: null, quantity_needed: 1 }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface IngredientsFieldArrayProps {
  rows: IngredientRow[]
  onChange: (rows: IngredientRow[]) => void
}

export function IngredientsFieldArray({
  rows,
  onChange,
}: IngredientsFieldArrayProps) {
  // Shared search state across all pickers — one API call for all rows
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data: searchData, isLoading: searchLoading } = useInventorySearch(debouncedSearch)
  const searchResults: InventorySearchResult[] = searchData?.data ?? []

  // Cache of items ever seen — so selected items still show their label when results change
  const selectedItemsCache = useRef<Map<number, InventorySearchResult>>(new Map())
  for (const row of rows) {
    if (row.selected_inventory) {
      selectedItemsCache.current.set(row.selected_inventory.id, row.selected_inventory)
    }
  }
  for (const item of searchResults) {
    selectedItemsCache.current.set(item.id, item)
  }

  // Track ids that appear more than once for inline duplicate errors
  const idCounts = new Map<number, number>()
  for (const row of rows) {
    if (row.inventory_id !== null) {
      idCounts.set(
        row.inventory_id,
        (idCounts.get(row.inventory_id) ?? 0) + 1,
      )
    }
  }

  const handleAdd = () => {
    onChange([...rows, createIngredientRow()])
  }

  const handleRemove = (key: string) => {
    onChange(rows.filter((r) => r.key !== key))
  }

  const handleChangeInventory = (key: string, inventory_id: number | null) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, inventory_id } : r)))
  }

  const handleChangeQty = (key: string, quantity_needed: number) => {
    onChange(
      rows.map((r) => (r.key === key ? { ...r, quantity_needed } : r)),
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Recipe / Ingredients</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Define which inventory items are consumed when this product is
            ordered.
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleAdd}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Add Ingredient
        </Button>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <UtensilsIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No ingredients defined.
            </p>
            <p className="text-xs text-muted-foreground">
              This product has no recipe — stock will not be auto-deducted on
              sale.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              Add First Ingredient
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => {
              const isDuplicate =
                row.inventory_id !== null &&
                (idCounts.get(row.inventory_id) ?? 0) > 1

              return (
                <IngredientRowItem
                  key={row.key}
                  row={row}
                  index={index}
                  searchResults={searchResults}
                  searchLoading={searchLoading}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedItemsCache={selectedItemsCache.current}
                  isDuplicate={isDuplicate}
                  onChangeInventory={(id) =>
                    handleChangeInventory(row.key, id)
                  }
                  onChangeQty={(qty) => handleChangeQty(row.key, qty)}
                  onRemove={() => handleRemove(row.key)}
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Row Item ─────────────────────────────────────────────────────────────────

interface IngredientRowItemProps {
  row: IngredientRow
  index: number
  searchResults: InventorySearchResult[]
  searchLoading: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  selectedItemsCache: Map<number, InventorySearchResult>
  isDuplicate: boolean
  onChangeInventory: (id: number | null) => void
  onChangeQty: (qty: number) => void
  onRemove: () => void
}

function IngredientRowItem({
  row,
  index,
  searchResults,
  searchLoading,
  searchQuery,
  onSearchQueryChange,
  selectedItemsCache,
  isDuplicate,
  onChangeInventory,
  onChangeQty,
  onRemove,
}: IngredientRowItemProps) {
  const [open, setOpen] = useState(false)

  // Prefer current results, fall back to cache so already-selected items always show a label
  const selectedItem =
    searchResults.find((i) => i.id === row.inventory_id) ??
    (row.inventory_id !== null ? selectedItemsCache.get(row.inventory_id) : undefined)

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
          {/* ── Inventory picker ───────────────────────────────────────── */}
          <div className="min-w-0 flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">
              Inventory Item {index + 1}
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between truncate font-normal',
                    !selectedItem && 'text-muted-foreground',
                    isDuplicate && 'border-destructive',
                  )}
                >
                  <span className="truncate">
                    {selectedItem
                      ? `${selectedItem.name} (${selectedItem.unit_of_measure})`
                      : 'Select ingredient…'}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type to search ingredients…"
                    value={searchQuery}
                    onValueChange={onSearchQueryChange}
                  />
                  <CommandList>
                    {searchQuery.trim().length === 0 ? (
                      <CommandEmpty>Type to search ingredients.</CommandEmpty>
                    ) : searchLoading ? (
                      <CommandEmpty>Searching…</CommandEmpty>
                    ) : searchResults.length === 0 ? (
                      <CommandEmpty>No items found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {searchResults.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={String(item.id)}
                            onSelect={() => {
                              onChangeInventory(
                                item.id === row.inventory_id ? null : item.id,
                              )
                              setOpen(false)
                            }}
                            className="flex flex-col items-start gap-0.5"
                          >
                            <div className="flex w-full items-center gap-2">
                              <CheckIcon
                                className={cn(
                                  'size-4 shrink-0',
                                  row.inventory_id === item.id
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.unit_of_measure}
                                </p>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {isDuplicate && (
              <p className="text-xs text-destructive">
                This item is already added. Remove the duplicate.
              </p>
            )}
          </div>

          {/* ── Quantity needed ────────────────────────────────────────── */}
          <div className="w-full space-y-1 sm:w-36 sm:shrink-0">
            <Label className="text-xs text-muted-foreground">
              Quantity Needed
            </Label>
            <Input
              type="number"
              min={0.001}
              step={0.001}
              value={row.quantity_needed}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v > 0) onChangeQty(v)
              }}
              className="h-9"
              placeholder="e.g. 0.200"
            />
          </div>
        </div>

        {/* ── Remove button ──────────────────────────────────────────── */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-5 size-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" />
          <span className="sr-only">Remove ingredient</span>
        </Button>
      </div>
    </div>
  )
}
