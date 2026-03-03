import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface PinCodeFieldProps {
  label: string
  description?: string
  /** Maximum PIN length. Defaults to 6. Must be 6. */
  maxLength?: number
  disabled?: boolean
}

export function PinCodeField({
  label,
  description,
  disabled,
}: PinCodeFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors
  const [visible, setVisible] = useState(false)

  const clampedMax = 6 // Currently we only support 6-digit PINs, but this can be made configurable in the future if needed

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <div className="relative">
        <Input
          id={field.name}
          name={field.name}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          value={field.state.value ?? ''}
          onChange={(e) => {
            // Only allow numeric characters
            const numeric = e.target.value.replace(/\D/g, '').slice(0, clampedMax)
            field.handleChange(numeric)
          }}
          onBlur={field.handleBlur}
          placeholder={'•'.repeat(clampedMax)}
          maxLength={clampedMax}
          disabled={disabled}
          aria-invalid={errors.length > 0}
          className="pr-10 tracking-[0.5em] font-mono"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide PIN' : 'Show PIN'}
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </Button>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
