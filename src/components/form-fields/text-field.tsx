import { useFieldContext } from '@/hooks/form-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface TextFieldProps {
  label: string
  placeholder?: string
  description?: string
  type?: React.HTMLInputTypeAttribute
  disabled?: boolean
  /** Renders a red asterisk next to the label */
  required?: boolean
}

export function TextField({
  label,
  placeholder,
  description,
  type = 'text',
  disabled,
  required,
}: TextFieldProps) {
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
        type={type}
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
