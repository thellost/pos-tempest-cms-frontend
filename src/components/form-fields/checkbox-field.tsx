import { useFieldContext } from '@/hooks/form-context'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface CheckboxFieldProps {
  label: string
  description?: string
  disabled?: boolean
}

export function CheckboxField({ label, description, disabled }: CheckboxFieldProps) {
  const field = useFieldContext<boolean>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <Checkbox
          id={field.name}
          checked={field.state.value ?? false}
          onCheckedChange={(checked) =>
            field.handleChange(checked === true)
          }
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={errors.length > 0}
          className="mt-0.5"
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor={field.name} className="cursor-pointer leading-tight">
            {label}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <FieldErrors errors={errors} />
    </div>
  )
}
