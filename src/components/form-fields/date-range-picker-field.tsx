import { useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { useFieldContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

export interface DateRangeValue {
  from?: string
  to?: string
}

interface DateRangePickerFieldProps {
  label: string
  description?: string
  disabled?: boolean
}

export function DateRangePickerField({
  label,
  description,
  disabled,
}: DateRangePickerFieldProps) {
  const field = useFieldContext<DateRangeValue>()
  const errors = field.state.meta.errors
  const [open, setOpen] = useState(false)

  const value = field.state.value ?? {}

  const selectedRange: DateRange = {
    from:
      value.from && isValid(parseISO(value.from))
        ? parseISO(value.from)
        : undefined,
    to:
      value.to && isValid(parseISO(value.to))
        ? parseISO(value.to)
        : undefined,
  }

  const displayLabel = (() => {
    if (selectedRange.from && selectedRange.to) {
      return `${format(selectedRange.from, 'LLL d, y')} – ${format(selectedRange.to, 'LLL d, y')}`
    }
    if (selectedRange.from) {
      return format(selectedRange.from, 'LLL d, y')
    }
    return 'Pick a date range'
  })()

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            aria-invalid={errors.length > 0}
            className={cn(
              'w-full justify-start text-left font-normal',
              !selectedRange.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {displayLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={(range) => {
              field.handleChange({
                from: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                to: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
              })
            }}
            numberOfMonths={2}
            initialFocus
          />
          {(selectedRange.from || selectedRange.to) && (
            <div className="flex justify-end border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  field.handleChange({})
                  setOpen(false)
                }}
              >
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
