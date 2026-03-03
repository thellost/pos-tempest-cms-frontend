import { useFieldContext } from '@/hooks/form-context'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface SwitchFieldProps {
  label: string
  description?: string
  disabled?: boolean
}

export function SwitchField({ label, description, disabled }: SwitchFieldProps) {
  const field = useFieldContext<boolean>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <Switch
          id={field.name}
          checked={field.state.value ?? false}
          onCheckedChange={(checked) => field.handleChange(checked)}
          onBlur={field.handleBlur}
          disabled={disabled}
          aria-invalid={errors.length > 0}
        />
        <Label htmlFor={field.name} className="cursor-pointer">
          {label}
        </Label>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
