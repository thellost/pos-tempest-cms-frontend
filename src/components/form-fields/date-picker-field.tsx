import { useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

interface DatePickerFieldProps {
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
}

export function DatePickerField({
  label,
  placeholder = 'Pick a date',
  description,
  disabled,
}: DatePickerFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors
  const [open, setOpen] = useState(false)

  const rawValue = field.state.value
  const selectedDate =
    rawValue && isValid(parseISO(rawValue)) ? parseISO(rawValue) : undefined

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
              !selectedDate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {selectedDate ? format(selectedDate, 'PPP') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
