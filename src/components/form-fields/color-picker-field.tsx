import { useRef } from 'react'
import { XIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/

/** Expand shorthand #rgb → #rrggbb. Returns the input unchanged if it doesn't match. */
function expandHex(raw: string): string {
  const trimmed = raw.trim()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }
  return trimmed
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ColorPickerFieldProps {
  label: string
  description?: string
  disabled?: boolean
}

/**
 * Color picker field that combines:
 *  - A color swatch (click to open the OS native color wheel)
 *  - A hex text input (synced with the picker, accepts #rgb shorthand)
 *  - A clear button to reset to null
 *
 * Stores value as a lowercase #rrggbb hex string or null.
 * Validates using /^#[0-9a-fA-F]{6}$/ when a value is present.
 */
export function ColorPickerField({ label, description, disabled }: ColorPickerFieldProps) {
  const field = useFieldContext<string | null>()
  const errors = field.state.meta.errors
  const colorInputRef = useRef<HTMLInputElement>(null)

  const value = field.state.value ?? null
  const isValidHex = value === null || HEX_REGEX.test(value)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    field.handleChange(e.target.value)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    if (raw === '') {
      field.handleChange(null)
    } else {
      // Prepend # if the user forgot it
      field.handleChange(raw.startsWith('#') ? raw : `#${raw}`)
    }
  }

  const handleTextBlur = () => {
    if (value) {
      const expanded = expandHex(value)
      if (HEX_REGEX.test(expanded)) {
        field.handleChange(expanded.toLowerCase())
      }
    }
    field.handleBlur()
  }

  const handleClear = () => {
    field.handleChange(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>

      <div className="flex items-center gap-2">
        {/*
         * Color swatch — acts as the visual trigger for the native picker.
         * Shows a diagonal-slash placeholder when no color is set.
         */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => colorInputRef.current?.click()}
          className={cn(
            'relative size-9 shrink-0 cursor-pointer rounded-md border border-input transition-opacity hover:opacity-80',
            !value && 'bg-muted',
            disabled && 'cursor-not-allowed opacity-50',
          )}
          style={value && isValidHex ? { backgroundColor: value } : undefined}
          aria-label="Open color picker"
          title={value ? `Current color: ${value}` : 'No color set — click to pick'}
        >
          {/* Diagonal slash when no color is selected */}
          {!value && (
            <svg
              className="absolute inset-0 size-full text-muted-foreground/40"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="8" />
            </svg>
          )}
        </button>

        {/* Hidden native color input — triggered programmatically via ref */}
        <input
          ref={colorInputRef}
          type="color"
          className="sr-only"
          value={value && HEX_REGEX.test(value) ? value : '#000000'}
          onChange={handleNativeColorChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Hex text input */}
        <Input
          id={field.name}
          name={field.name}
          type="text"
          value={value ?? ''}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          placeholder="#rrggbb"
          disabled={disabled}
          maxLength={7}
          spellCheck={false}
          className={cn(
            'font-mono',
            errors.length > 0 && 'border-destructive',
          )}
          aria-invalid={errors.length > 0}
        />

        {/* Clear button — only shown when a value is present */}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear color"
            title="Remove color"
          >
            <XIcon className="size-4" />
          </Button>
        )}
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <FieldErrors errors={errors} />
    </div>
  )
}
