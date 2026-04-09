import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchFilterConfig {
  type: 'search'
  key: string
  placeholder?: string
}

export interface SelectFilterConfig {
  type: 'select'
  key: string
  label: string
  options: { value: string; label: string }[]
  /** Placeholder / "all" option label. Defaults to "All". */
  allLabel?: string
}

export type FilterConfig = SearchFilterConfig | SelectFilterConfig

// ─── Component ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  /** Declarative filter definitions */
  filters: FilterConfig[]
  /** Current filter values keyed by `FilterConfig.key` */
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear: () => void
  /** Hides the "Clear filters" button when no filters are active */
  hideWhenEmpty?: boolean
  className?: string
  /** Additional custom filter controls (e.g. date range pickers) */
  children?: React.ReactNode
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  hideWhenEmpty = true,
  className,
  children,
}: FilterBarProps) {
  const hasActiveFilters = Object.values(values).some(
    (v) => v !== '' && v !== undefined && v !== null,
  )

  return (
    <div
      className={cn(
        'mobile-edge-safe-px flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {filters.map((filter) => {
        if (filter.type === 'search') {
          return (
            <div key={filter.key} className="relative min-w-0 w-full sm:min-w-[220px] sm:w-auto sm:flex-1">
              <Input
                placeholder={filter.placeholder ?? 'Search…'}
                value={values[filter.key] ?? ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="h-11 pr-10"
              />
              {values[filter.key] && (
                <button
                  type="button"
                  className="touch-target-icon absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => onChange(filter.key, '')}
                  aria-label="Clear search"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          )
        }

        if (filter.type === 'select') {
          return (
            <Select
              key={filter.key}
              value={values[filter.key] ?? ''}
              onValueChange={(value) =>
                onChange(filter.key, value === '__all__' ? '' : value)
              }
            >
              <SelectTrigger className="h-11 w-full sm:w-[220px]">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">
                  {filter.allLabel ?? `All ${filter.label}s`}
                </SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

        return null
      })}

      {/* Slot for custom filters (date pickers, comboboxes, etc.) */}
      {children}

      {/* Clear button */}
      {(!hideWhenEmpty || hasActiveFilters) && (
        <Button
          variant="ghost"
          className="touch-target h-11 w-full justify-center text-muted-foreground hover:text-foreground sm:w-auto"
          onClick={onClear}
        >
          <XIcon className="mr-1.5 size-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
