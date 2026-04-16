import { useRef, useState } from 'react'
import { ClockIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

interface TimeFieldProps {
  label: string
  description?: string
  disabled?: boolean
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function parseHHMM(v: string): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(v ?? '')
  return match
    ? [Math.min(23, parseInt(match[1], 10)), Math.min(59, parseInt(match[2], 10))]
    : [0, 0]
}

export function TimeField({ label, description, disabled }: TimeFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  const [hh, mm] = parseHHMM(field.state.value ?? '')
  const [hourStr, setHourStr] = useState(pad2(hh))
  const [minStr, setMinStr] = useState(pad2(mm))

  // Sync when field value changes externally (form.reset, setFieldValue)
  const [trackedValue, setTrackedValue] = useState(field.state.value ?? '')
  if (field.state.value !== trackedValue) {
    setTrackedValue(field.state.value ?? '')
    const [nh, nm] = parseHHMM(field.state.value ?? '')
    setHourStr(pad2(nh))
    setMinStr(pad2(nm))
  }

  // Use refs for digit buffers — avoids stale closure issues
  const hourBuf = useRef('')
  const minBuf = useRef('')
  const hourRef = useRef<HTMLInputElement>(null)
  const minRef = useRef<HTMLInputElement>(null)

  const emitChange = (h: string, m: string) => {
    field.handleChange(`${h}:${m}`)
  }

  // ── Hour segment ────────────────────────────────────────────────────────────

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Shift' || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()

    switch (e.key) {
      case 'ArrowUp': {
        const hs = pad2((parseInt(hourStr, 10) + 1) % 24)
        setHourStr(hs)
        hourBuf.current = ''
        emitChange(hs, minStr)
        break
      }
      case 'ArrowDown': {
        const hs = pad2((parseInt(hourStr, 10) - 1 + 24) % 24)
        setHourStr(hs)
        hourBuf.current = ''
        emitChange(hs, minStr)
        break
      }
      case 'ArrowRight':
      case ':': {
        hourBuf.current = ''
        minRef.current?.focus()
        minRef.current?.select()
        break
      }
      case 'Backspace':
      case 'Delete': {
        setHourStr('00')
        hourBuf.current = ''
        emitChange('00', minStr)
        break
      }
      default: {
        if (!/^\d$/.test(e.key)) break
        const digit = parseInt(e.key, 10)
        const buf = hourBuf.current

        if (buf.length === 0) {
          if (digit > 2) {
            // Single digit > 2 → pad and auto-advance (e.g. "5" → "05")
            const hs = pad2(digit)
            setHourStr(hs)
            hourBuf.current = ''
            emitChange(hs, minStr)
            setTimeout(() => { minRef.current?.focus(); minRef.current?.select() }, 0)
          } else {
            // 0, 1, 2 → wait for second digit
            hourBuf.current = e.key
            setHourStr(e.key.padStart(2, '0'))
          }
        } else {
          // Second digit
          const candidate = parseInt(buf + e.key, 10)
          const hs = pad2(Math.min(23, candidate))
          setHourStr(hs)
          hourBuf.current = ''
          emitChange(hs, minStr)
          setTimeout(() => { minRef.current?.focus(); minRef.current?.select() }, 0)
        }
        break
      }
    }
  }

  const handleHourBlur = () => {
    const n = Math.min(23, Math.max(0, parseInt(hourStr, 10) || 0))
    const hs = pad2(n)
    setHourStr(hs)
    hourBuf.current = ''
    emitChange(hs, minStr)
    field.handleBlur()
  }

  // ── Minute segment ──────────────────────────────────────────────────────────

  const handleMinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Shift' || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()

    switch (e.key) {
      case 'ArrowUp': {
        const ms = pad2((parseInt(minStr, 10) + 1) % 60)
        setMinStr(ms)
        minBuf.current = ''
        emitChange(hourStr, ms)
        break
      }
      case 'ArrowDown': {
        const ms = pad2((parseInt(minStr, 10) - 1 + 60) % 60)
        setMinStr(ms)
        minBuf.current = ''
        emitChange(hourStr, ms)
        break
      }
      case 'ArrowLeft': {
        minBuf.current = ''
        hourRef.current?.focus()
        hourRef.current?.select()
        break
      }
      case 'Backspace':
      case 'Delete': {
        setMinStr('00')
        minBuf.current = ''
        emitChange(hourStr, '00')
        break
      }
      default: {
        if (!/^\d$/.test(e.key)) break
        const digit = parseInt(e.key, 10)
        const buf = minBuf.current

        if (buf.length === 0) {
          if (digit > 5) {
            // Single digit > 5 → pad and stay (e.g. "7" → "07", no advance since last segment)
            const ms = pad2(digit)
            setMinStr(ms)
            minBuf.current = ''
            emitChange(hourStr, ms)
          } else {
            // 0–5 → wait for second digit
            minBuf.current = e.key
            setMinStr(e.key.padStart(2, '0'))
          }
        } else {
          // Second digit
          const candidate = parseInt(buf + e.key, 10)
          const ms = pad2(Math.min(59, candidate))
          setMinStr(ms)
          minBuf.current = ''
          emitChange(hourStr, ms)
        }
        break
      }
    }
  }

  const handleMinBlur = () => {
    const n = Math.min(59, Math.max(0, parseInt(minStr, 10) || 0))
    const ms = pad2(n)
    setMinStr(ms)
    minBuf.current = ''
    emitChange(hourStr, ms)
    field.handleBlur()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div
        className={cn(
          'flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors',
          'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
          errors.length > 0 && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <ClockIcon className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={hourRef}
          type="text"
          inputMode="numeric"
          value={hourStr}
          disabled={disabled}
          onFocus={(e) => { hourBuf.current = ''; e.target.select() }}
          onKeyDown={handleHourKeyDown}
          onChange={() => {/* controlled via onKeyDown */}}
          onBlur={handleHourBlur}
          className="w-6 bg-transparent text-center font-mono outline-none tabular-nums focus:rounded-sm focus:bg-accent"
          maxLength={2}
          aria-label="Hours"
        />
        <span className="mx-0.5 select-none font-mono text-muted-foreground">:</span>
        <input
          ref={minRef}
          type="text"
          inputMode="numeric"
          value={minStr}
          disabled={disabled}
          onFocus={(e) => { minBuf.current = ''; e.target.select() }}
          onKeyDown={handleMinKeyDown}
          onChange={() => {/* controlled via onKeyDown */}}
          onBlur={handleMinBlur}
          className="w-6 bg-transparent text-center font-mono outline-none tabular-nums focus:rounded-sm focus:bg-accent"
          maxLength={2}
          aria-label="Minutes"
        />
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
