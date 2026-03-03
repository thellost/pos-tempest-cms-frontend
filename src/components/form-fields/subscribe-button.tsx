import { useFormContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SubscribeButtonProps {
  label?: string
  className?: string
}

export function SubscribeButton({
  label = 'Submit',
  className,
}: SubscribeButtonProps) {
  const form = useFormContext()

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
      {([canSubmit, isSubmitting]) => (
        <Button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className={cn('w-full', className)}
        >
          {isSubmitting ? 'Submitting…' : label}
        </Button>
      )}
    </form.Subscribe>
  )
}
