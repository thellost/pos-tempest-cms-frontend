import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, Trash2Icon, ShoppingCartIcon } from 'lucide-react'
import { useInventory } from '@/hooks/use-inventory'
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
import type { UnitOfMeasure } from '@/lib/services/purchases'

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
  const { data: inventoryData } = useInventory({ branchId, pageSize: 200 })
  const inventoryItems = inventoryData?.data ?? []

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
            <div className="overflow-x-auto">
              <div className="min-w-[500px] space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_80px_100px_120px_100px_36px] items-center gap-2 px-0.5 text-xs font-medium text-muted-foreground">
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
                      inventoryItems={inventoryItems}
                      rowSubtotal={rowSubtotal}
                      onUpdate={(patch) => handleUpdate(row.key, patch)}
                      onRemove={() => handleRemove(row.key)}
                    />
                  )
                })}
              </div>
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
  inventoryItems: { id: number; name: string; unit_of_measure: string }[]
  rowSubtotal: number
  onUpdate: (patch: Partial<PurchaseItemRow>) => void
  onRemove: () => void
}

function PurchaseItemRowView({
  row,
  inventoryItems,
  rowSubtotal,
  onUpdate,
  onRemove,
}: PurchaseItemRowViewProps) {
  const [open, setOpen] = useState(false)

  const selectedItem = inventoryItems.find((i) => i.id === row.inventory_id)

  return (
    <div className="grid grid-cols-[1fr_80px_100px_120px_100px_36px] items-center gap-2">
      {/* Ingredient combobox */}
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
          <Command>
            <CommandInput placeholder="Search ingredients…" />
            <CommandList>
              <CommandEmpty>No ingredients found.</CommandEmpty>
              <CommandGroup>
                {inventoryItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Quantity */}
      <Input
        type="number"
        className="h-9 text-sm"
        min={0.001}
        step={0.001}
        value={row.quantity}
        onChange={(e) =>
          onUpdate({ quantity: e.target.value === '' ? 0 : Number(e.target.value) })
        }
      />

      {/* Unit of measure */}
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

      {/* Cost per unit */}
      <div className="flex items-center">
        <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-2 text-xs text-muted-foreground">
          Rp
        </span>
        <Input
          type="number"
          className="h-9 rounded-l-none text-sm"
          min={0}
          step={100}
          value={row.cost_per_unit}
          onChange={(e) =>
            onUpdate({
              cost_per_unit:
                e.target.value === '' ? 0 : Number(e.target.value),
            })
          }
        />
      </div>

      {/* Row subtotal (read-only) */}
      <div className="h-9 px-2 text-right text-sm font-medium leading-9">
        {formatIDR(rowSubtotal)}
      </div>

      {/* Remove */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        aria-label="Remove item"
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  )
}
