import { useFieldContext } from '@/hooks/form-context'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface TextareaFieldProps {
  label: string
  placeholder?: string
  description?: string
  rows?: number
  disabled?: boolean
}

export function TextareaField({
  label,
  placeholder,
  description,
  rows,
  disabled,
}: TextareaFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value ?? ''}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        rows={rows}
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
