import { useState } from 'react'
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

// Regex: optional leading minus, optional digits, optional dot, optional digits
// Allows: "", "-", "0", "1.5", ".5", "123.", "-0.5"
const DECIMAL_RE = /^-?\d*\.?\d*$/

export function NumberField({
  label,
  min: _min,
  max: _max,
  step,
  prefix,
  suffix,
  placeholder,
  description,
  disabled,
}: NumberFieldProps) {
  const field = useFieldContext<number>()
  const errors = field.state.meta.errors

  // String-based display so users can type freely.
  // Show "" when the field value is 0 (avoids "stuck on 0" UX problem).
  const [displayValue, setDisplayValue] = useState<string>(() => {
    const v = field.state.value
    return v == null || v === 0 ? '' : String(v)
  })

  // Detect external changes to field value (setFieldValue, form.reset, etc.)
  // and sync the display. Use state instead of ref to avoid anti-patterns.
  const [trackedFieldValue, setTrackedFieldValue] = useState<number>(
    field.state.value ?? 0,
  )
  if (field.state.value !== trackedFieldValue) {
    setTrackedFieldValue(field.state.value ?? 0)
    const v = field.state.value ?? 0
    const parsedDisplay = parseFloat(displayValue)
    // Only override if the display doesn't already reflect the new value
    // (avoids wiping "1." while user is mid-typing "1.5")
    if (parsedDisplay !== v) {
      setDisplayValue(v === 0 ? '' : String(v))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value
    // Reject characters that can never form a valid number
    if (str !== '' && !DECIMAL_RE.test(str)) return
    setDisplayValue(str)
    if (str === '' || str === '-' || str === '.') {
      field.handleChange(0)
    } else {
      const n = parseFloat(str)
      if (!isNaN(n)) field.handleChange(n)
    }
  }

  const handleBlur = () => {
    const n = parseFloat(displayValue)
    if (isNaN(n) || displayValue === '') {
      setDisplayValue('')
      field.handleChange(0)
    } else {
      // Normalize: strip trailing dot ("1." → "1"), etc.
      setDisplayValue(String(n))
    }
    field.handleBlur()
  }

  // Use decimal inputMode for fractional steps (quantities/weights),
  // numeric for integer steps (prices, counts).
  const inputMode: React.HTMLAttributes<HTMLInputElement>['inputMode'] =
    step != null && step < 1 ? 'decimal' : 'numeric'

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
          type="text"
          inputMode={inputMode}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
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
