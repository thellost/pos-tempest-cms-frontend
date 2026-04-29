import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WaterfallKind = 'in' | 'out' | 'neutral' | 'subtotal' | 'result'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatIDR(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—'
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(value))}`
}

const WATERFALL_STYLES: Record<WaterfallKind, { text: string; prefix: string }> = {
  in: { text: 'text-emerald-600 dark:text-emerald-400', prefix: '+' },
  out: { text: 'text-destructive', prefix: '-' },
  neutral: { text: '', prefix: '' },
  subtotal: { text: 'font-semibold', prefix: '' },
  result: { text: 'text-lg font-bold', prefix: '' },
}

// ─── Components ───────────────────────────────────────────────────────────────

export function WaterfallFlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {children}
    </div>
  )
}

export function WaterfallSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

export function WaterfallDivider({ accent }: { accent?: boolean }) {
  return (
    <Separator
      className={cn(
        'my-2',
        accent && 'border-foreground/20 border-t-2',
      )}
    />
  )
}

export function WaterfallRow({
  label,
  amount,
  kind,
  isSubstep,
}: {
  label: string
  amount: number
  kind: WaterfallKind
  isSubstep?: boolean
}) {
  const style = WATERFALL_STYLES[kind]
  const prefix = amount >= 0 && kind === 'in' ? '+' : amount < 0 ? '-' : style.prefix
  const displayAmount = Math.abs(amount)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 py-1.5',
        isSubstep && 'ml-6 border-l-2 border-muted px-3',
        kind === 'result' && 'rounded-md bg-muted/50 py-2.5',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isSubstep && (
          <span className="-ml-[25px] mr-1 h-0.5 w-3 shrink-0 rounded-full bg-muted-foreground/30" />
        )}
        <span
          className={cn(
            'text-sm truncate',
            kind === 'result' && 'font-semibold',
            kind === 'subtotal' && 'font-medium',
          )}
        >
          {label}
        </span>
      </div>
      <span className={cn('shrink-0 text-sm tabular-nums text-right', style.text)}>
        {prefix}
        {formatIDR(displayAmount)}
      </span>
    </div>
  )
}

export function WaterfallBalance({
  expectedCash,
  closingCash,
  cashDifference,
}: {
  expectedCash: number | null | undefined
  closingCash: number | null | undefined
  cashDifference: number | null | undefined
}) {
  const diff = cashDifference ?? 0
  const diffPositive = diff >= 0
  const hasDiff = cashDifference != null

  return (
    <div className="bg-muted/40 rounded-lg p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Balance Reconciliation
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <span className="text-muted-foreground">Expected Cash</span>
        <span className="text-right font-semibold tabular-nums">
          {expectedCash != null ? formatIDR(expectedCash) : '—'}
        </span>
        <span className="text-muted-foreground">Actual Closing Cash</span>
        <span className="text-right tabular-nums">
          {closingCash != null
            ? formatIDR(closingCash)
            : <span className="text-muted-foreground">Not closed</span>}
        </span>
        <Separator className="col-span-2 my-0.5" />
        <span className="text-muted-foreground">Difference</span>
        <span
          className={cn(
            'text-right text-lg font-bold tabular-nums',
            !hasDiff
              ? 'text-muted-foreground'
              : diffPositive
                ? 'text-emerald-600'
                : 'text-destructive',
          )}
        >
          {hasDiff ? `${diff >= 0 ? '+' : ''}${formatIDR(diff)}` : '—'}
        </span>
      </div>
      {hasDiff && (
        <div
          className={cn(
            'rounded-md px-3 py-2 text-xs',
            diffPositive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {diff === 0
            ? 'Drawer balances perfectly.'
            : diffPositive
              ? `Cash drawer has a surplus of ${formatIDR(diff)}.`
              : 'Cash drawer is short. Verify count and investigate.'}
        </div>
      )}
    </div>
  )
}
