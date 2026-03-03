import { useFieldContext } from '@/hooks/form-context'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface SliderFieldProps {
  label: string
  min?: number
  max?: number
  step?: number
  description?: string
  disabled?: boolean
}

export function SliderField({
  label,
  min = 0,
  max = 100,
  step = 1,
  description,
  disabled,
}: SliderFieldProps) {
  const field = useFieldContext<number>()
  const errors = field.state.meta.errors
  const value = field.state.value ?? min

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => field.handleChange(v)}
        onBlur={field.handleBlur}
        disabled={disabled}
        aria-label={label}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
