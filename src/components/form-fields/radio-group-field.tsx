import { useFieldContext } from '@/hooks/form-context'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

export interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupFieldProps {
  label: string
  options: RadioOption[]
  description?: string
  disabled?: boolean
}

export function RadioGroupField({
  label,
  options,
  description,
  disabled,
}: RadioGroupFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <RadioGroup
        value={field.state.value ?? ''}
        onValueChange={(value) => field.handleChange(value)}
        onBlur={field.handleBlur}
        disabled={disabled}
        aria-invalid={errors.length > 0}
        className="gap-2"
      >
        {options.map((opt) => (
          <div key={opt.value} className="flex items-start gap-3">
            <RadioGroupItem
              value={opt.value}
              id={`${field.name}-${opt.value}`}
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor={`${field.name}-${opt.value}`}
                className="cursor-pointer leading-tight"
              >
                {opt.label}
              </Label>
              {opt.description && (
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
