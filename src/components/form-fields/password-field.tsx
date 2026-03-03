import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldErrors } from './_field-errors'

interface PasswordFieldProps {
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
}

export function PasswordField({
  label,
  placeholder,
  description,
  disabled,
}: PasswordFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors
  const [visible, setVisible] = useState(false)

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <div className="relative">
        <Input
          id={field.name}
          name={field.name}
          type={visible ? 'text' : 'password'}
          value={field.state.value ?? ''}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={errors.length > 0}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
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
