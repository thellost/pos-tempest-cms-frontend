import { useFieldContext } from '@/hooks/form-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface PhoneFieldProps {
  label?: string
  placeholder?: string
  description?: string
  disabled?: boolean
  required?: boolean
}

export function PhoneField({
  label = 'Phone',
  placeholder = 'e.g. 081234567890 (optional)',
  description,
  disabled,
  required,
}: PhoneFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={field.name}
        name={field.name}
        type="tel"
        value={field.state.value ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={errors.length > 0}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}

export const phoneValidators = {
  onChange: ({ value }: { value: string }) => {
    if (!value) return undefined
    if (!/^[+\d\s\-().]+$/.test(value)) return 'Only digits, +, -, spaces, and () allowed'
    if (value.replace(/\D/g, '').length < 6) return 'Too short — enter at least 6 digits'
    if (value.length > 20) return 'Max 20 characters'
    return undefined
  },
}
