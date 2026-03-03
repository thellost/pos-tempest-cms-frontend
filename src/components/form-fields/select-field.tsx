import { useFieldContext } from '@/hooks/form-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  placeholder?: string
  options: SelectOption[]
  description?: string
  disabled?: boolean
}

export function SelectField({
  label,
  placeholder = 'Select an option',
  options,
  description,
  disabled,
}: SelectFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Select
        value={field.state.value ?? ''}
        onValueChange={(value) => field.handleChange(value)}
        disabled={disabled}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={errors.length > 0}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
