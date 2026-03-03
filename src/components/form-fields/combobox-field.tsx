import { useState } from 'react'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

export interface ComboboxOption {
  value: string | number
  label: string
}

interface ComboboxFieldProps {
  label: string
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  description?: string
  disabled?: boolean
}

export function ComboboxField({
  label,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  description,
  disabled,
}: ComboboxFieldProps) {
  const field = useFieldContext<string | number | null>()
  const errors = field.state.meta.errors
  const [open, setOpen] = useState(false)

  const currentValue = field.state.value
  const selectedLabel =
    currentValue !== null && currentValue !== undefined
      ? (options.find((o) => String(o.value) === String(currentValue))?.label ?? '')
      : ''

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={errors.length > 0}
            disabled={disabled}
            className={cn(
              'w-full justify-between font-normal',
              !selectedLabel && 'text-muted-foreground',
            )}
          >
            {selectedLabel || placeholder}
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={String(opt.value)}
                    value={String(opt.value)}
                    keywords={[opt.label]}
                    onSelect={() => {
                      const next =
                        String(opt.value) === String(currentValue)
                          ? null
                          : opt.value
                      field.handleChange(next)
                      setOpen(false)
                    }}
                  >
                    <CheckIcon
                      className={cn(
                        'mr-2 size-4',
                        String(currentValue) === String(opt.value)
                          ? 'opacity-100'
                          : 'opacity-0',
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
