import { Loader2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface ConfirmDialogProps {
  /**
   * Element that opens the dialog when clicked.
   * Omit when using fully-controlled mode (`open` + `onOpenChange`).
   */
  trigger?: React.ReactNode
  title: string
  description?: string
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string
  /** Shows a spinner on the confirm button and disables both buttons while true. */
  isLoading?: boolean
  /**
   * `"destructive"` — red confirm button (use for delete/deactivate).
   * `"default"` — primary colour button (use for non-destructive confirmations).
   */
  variant?: 'default' | 'destructive'
  onConfirm: () => void
  /** Controls open state externally (optional). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isLoading = false,
  variant = 'destructive',
  onConfirm,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {isLoading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
