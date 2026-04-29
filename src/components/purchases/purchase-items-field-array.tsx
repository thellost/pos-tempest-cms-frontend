import { useRef, useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, Trash2Icon, ShoppingCartIcon } from 'lucide-react'
import { useInventorySearch } from '@/hooks/use-inventory'
import { useDebounce } from '@/hooks/use-debounce'
import type { InventorySearchResult } from '@/lib/services/inventory'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { UnitOfMeasure } from '@/lib/services/sales-cash-flow'

export type { UnitOfMeasure }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseItemRow {
  /** Stable React key — not sent to the API */
  key: string
  inventory_id: number | null
  inventory_name: string
  quantity: number
  unit_of_measure: UnitOfMeasure
  cost_per_unit: number
}

function generateKey() {
  return Math.random().toString(36).slice(2)
}

export function createPurchaseItemRow(): PurchaseItemRow {
  return {
    key: generateKey(),
    inventory_id: null,
    inventory_name: '',
    quantity: 1,
    unit_of_measure: 'piece',
    cost_per_unit: 0,
  }
}

const UNIT_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'kg' },
  { value: 'gram', label: 'gram' },
  { value: 'ons', label: 'ons' },
  { value: 'liter', label: 'liter' },
  { value: 'ml', label: 'ml' },
  { value: 'portion', label: 'Portion' },
]

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

// ─── Main Component ───────────────────────────────────────────────────────────

interface PurchaseItemsFieldArrayProps {
  rows: PurchaseItemRow[]
  onChange: (rows: PurchaseItemRow[]) => void
  branchId?: number
}

export function PurchaseItemsFieldArray({
  rows,
  onChange,
  branchId,
}: PurchaseItemsFieldArrayProps) {
  // Shared search state across all pickers — one API call for all rows
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data: searchData, isLoading: searchLoading } = useInventorySearch(debouncedSearch, branchId)
  const searchResults: InventorySearchResult[] = searchData?.data ?? []

  // Cache of items ever seen — so selected items still show their label when results change
  const selectedItemsCache = useRef<Map<number, InventorySearchResult>>(new Map())
  for (const row of rows) {
    if (row.inventory_id !== null && row.inventory_name) {
      selectedItemsCache.current.set(row.inventory_id, {
        id: row.inventory_id,
        name: row.inventory_name,
        unit_of_measure: row.unit_of_measure,
        branch_id: branchId ?? 0,
      } as InventorySearchResult)
    }
  }
  for (const item of searchResults) {
    selectedItemsCache.current.set(item.id, item)
  }

  const subtotal = rows.reduce(
    (sum, r) => sum + r.quantity * r.cost_per_unit,
    0,
  )

  const handleAdd = () => {
    onChange([...rows, createPurchaseItemRow()])
  }

  const handleRemove = (key: string) => {
    onChange(rows.filter((r) => r.key !== key))
  }

  const handleUpdate = (key: string, patch: Partial<PurchaseItemRow>) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Line Items</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add the ingredients you are ordering.
          </p>
        </div>
        <Button type="button" size="sm" onClick={handleAdd}>
          <PlusIcon className="mr-1.5 size-3.5" />
          Add Item
        </Button>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <ShoppingCartIcon className="size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No items added yet.</p>
            <p className="text-xs text-muted-foreground">
              At least one item is required.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAdd}
            >
              <PlusIcon className="mr-1.5 size-3.5" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {/* Column headers — desktop only */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_80px_100px_120px_100px_36px] sm:items-center sm:gap-2 sm:px-0.5 sm:text-xs sm:font-medium sm:text-muted-foreground">
                <span>Ingredient</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Cost / Unit</span>
                <span>Subtotal</span>
                <span />
              </div>

              {rows.map((row) => {
                const rowSubtotal = row.quantity * row.cost_per_unit
                return (
                  <PurchaseItemRowView
                    key={row.key}
                    row={row}
                    searchResults={searchResults}
                    searchLoading={searchLoading}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    selectedItemsCache={selectedItemsCache.current}
                    rowSubtotal={rowSubtotal}
                    onUpdate={(patch) => handleUpdate(row.key, patch)}
                    onRemove={() => handleRemove(row.key)}
                  />
                )
              })}
            </div>

            {/* Totals footer */}
            <div className="mt-2 flex justify-end border-t pt-3">
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-muted-foreground">Items Subtotal</span>
                  <span className="font-semibold">{formatIDR(subtotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface PurchaseItemRowViewProps {
  row: PurchaseItemRow
  searchResults: InventorySearchResult[]
  searchLoading: boolean
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  selectedItemsCache: Map<number, InventorySearchResult>
  rowSubtotal: number
  onUpdate: (patch: Partial<PurchaseItemRow>) => void
  onRemove: () => void
}

function PurchaseItemRowView({
  row,
  searchResults,
  searchLoading,
  searchQuery,
  onSearchQueryChange,
  selectedItemsCache,
  rowSubtotal,
  onUpdate,
  onRemove,
}: PurchaseItemRowViewProps) {
  const [open, setOpen] = useState(false)
  const [qtyDisplay, setQtyDisplay] = useState<string>(() =>
    row.quantity === 0 ? '' : String(row.quantity)
  )
  const [priceDisplay, setPriceDisplay] = useState<string>(() =>
    row.cost_per_unit === 0 ? '' : String(row.cost_per_unit)
  )

  // Prefer current results, fall back to cache so already-selected items always show a label
  const selectedItem =
    searchResults.find((i) => i.id === row.inventory_id) ??
    (row.inventory_id !== null ? selectedItemsCache.get(row.inventory_id) : undefined)

  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 rounded-lg border p-3 sm:rounded-none sm:border-0 sm:p-0 sm:grid-cols-[1fr_80px_100px_120px_100px_36px] sm:items-center sm:gap-x-2 sm:gap-y-0">
      {/* Ingredient combobox — spans both cols on mobile */}
      <div className="col-span-2 sm:col-span-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                'h-9 w-full justify-between overflow-hidden font-normal',
                !selectedItem && 'text-muted-foreground',
              )}
            >
              <span className="truncate">
                {selectedItem ? selectedItem.name : 'Select ingredient…'}
              </span>
              <ChevronsUpDownIcon className="ml-1 size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0">
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
                  <CommandEmpty>No ingredients found.</CommandEmpty>
                ) : (
                  <CommandGroup>
                    {searchResults.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={String(item.id)}
                        onSelect={() => {
                          onUpdate({
                            inventory_id: item.id,
                            inventory_name: item.name,
                            unit_of_measure: item.unit_of_measure as UnitOfMeasure,
                          })
                          setOpen(false)
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            'mr-2 size-4',
                            row.inventory_id === item.id
                              ? 'opacity-100'
                              : 'opacity-0',
                          )}
                        />
                        <span>{item.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {item.unit_of_measure}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Quantity */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground sm:hidden">Qty</p>
        <Input
          type="text"
          inputMode="decimal"
          className="h-9 text-sm"
          value={qtyDisplay}
          onChange={(e) => {
            const str = e.target.value
            if (str !== '' && !/^\d*\.?\d*$/.test(str)) return
            setQtyDisplay(str)
            const n = parseFloat(str)
            if (!isNaN(n)) onUpdate({ quantity: n })
          }}
          onBlur={() => {
            const n = parseFloat(qtyDisplay)
            if (isNaN(n) || n <= 0) {
              setQtyDisplay(row.quantity > 0 ? String(row.quantity) : '1')
              if (row.quantity <= 0) onUpdate({ quantity: 1 })
            } else {
              setQtyDisplay(String(n))
            }
          }}
          placeholder="Qty"
        />
      </div>

      {/* Unit of measure */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground sm:hidden">Unit</p>
        <Select
          value={row.unit_of_measure}
          onValueChange={(v) => onUpdate({ unit_of_measure: v as UnitOfMeasure })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cost per unit */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground sm:hidden">Cost / Unit</p>
        <div className="flex items-center">
          <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-2 text-xs text-muted-foreground">
            Rp
          </span>
          <Input
            type="text"
            inputMode="numeric"
            className="h-9 rounded-l-none text-sm"
            value={priceDisplay}
            onChange={(e) => {
              const str = e.target.value
              if (str !== '' && !/^\d*\.?\d*$/.test(str)) return
              setPriceDisplay(str)
              const n = parseFloat(str)
              if (!isNaN(n)) onUpdate({ cost_per_unit: n })
            }}
            onBlur={() => {
              const n = parseFloat(priceDisplay)
              if (isNaN(n)) {
                setPriceDisplay(row.cost_per_unit === 0 ? '' : String(row.cost_per_unit))
              } else {
                setPriceDisplay(String(n))
              }
            }}
            placeholder="0"
          />
        </div>
      </div>

      {/* Subtotal + remove button (mobile: side by side; desktop: subtotal only here) */}
      <div className="flex items-end justify-between sm:block">
        <div>
          <p className="mb-1 text-xs text-muted-foreground sm:hidden">Subtotal</p>
          <div className="h-9 text-sm font-medium leading-9 sm:px-2 sm:text-right">
            {formatIDR(rowSubtotal)}
          </div>
        </div>
        {/* Remove — mobile only (sits next to subtotal) */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground hover:text-destructive sm:hidden"
          onClick={onRemove}
          aria-label="Remove item"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      {/* Remove — desktop only (6th column) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="hidden size-9 shrink-0 text-muted-foreground hover:text-destructive sm:inline-flex"
        onClick={onRemove}
        aria-label="Remove item"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}
