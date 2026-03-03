import { useFieldContext } from '@/hooks/form-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

interface NumberFieldProps {
  label: string
  min?: number
  max?: number
  step?: number
  /** Text displayed to the left of the input (e.g. "Rp") */
  prefix?: string
  /** Text displayed to the right of the input (e.g. "%") */
  suffix?: string
  placeholder?: string
  description?: string
  disabled?: boolean
}

export function NumberField({
  label,
  min,
  max,
  step,
  prefix,
  suffix,
  placeholder,
  description,
  disabled,
}: NumberFieldProps) {
  const field = useFieldContext<number>()
  const errors = field.state.meta.errors

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <div className="flex items-center">
        {prefix && (
          <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={field.name}
          name={field.name}
          type="number"
          value={field.state.value ?? ''}
          onChange={(e) =>
            field.handleChange(
              e.target.value === '' ? ('' as unknown as number) : Number(e.target.value),
            )
          }
          onBlur={field.handleBlur}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={errors.length > 0}
          className={cn(
            prefix && 'rounded-l-none',
            suffix && 'rounded-r-none',
          )}
        />
        {suffix && (
          <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
