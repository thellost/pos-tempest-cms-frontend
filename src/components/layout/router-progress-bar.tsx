import { useRouterState } from '@tanstack/react-router'

/**
 * Thin top-of-page progress bar that appears during route transitions.
 *
 * Uses TanStack Router's `useRouterState` to detect when a navigation is
 * pending and plays an indeterminate CSS animation until the transition
 * completes.
 */
export function RouterProgressBar() {
  const isPending = useRouterState({ select: (s) => s.status === 'pending'})

  if (!isPending) {
    //Empty div because null somehow didnt replace the progress bar when the transition completed, but this does. No idea why.
    return <div></div>
  }
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 overflow-hidden bg-primary/20"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{
          animation: 'router-progress 1.2s ease-in-out infinite',
        }}
      />
    </div>
  )
}
