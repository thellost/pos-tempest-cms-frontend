import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'

// ─── Sidebar skeleton ─────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Nav groups */}
      <div className="flex-1 overflow-hidden px-3 py-3 space-y-5">
        {/* Render 4 fake nav groups */}
        {Array.from({ length: 4 }).map((_, gi) => (
          <div key={gi} className="space-y-1">
            {/* Group label */}
            <Skeleton className="mb-2 h-3 w-20 opacity-60" />
            {/* Group items */}
            {Array.from({ length: gi === 0 ? 1 : gi === 1 ? 4 : 3 }).map(
              (_, ii) => (
                <div
                  key={ii}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5"
                >
                  <Skeleton className="size-4 shrink-0 rounded" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ),
            )}
            <Separator className="mt-2 opacity-30" />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-14 opacity-60" />
          </div>
          <Skeleton className="ml-auto size-4 shrink-0 opacity-40" />
        </div>
      </div>
    </aside>
  )
}

// ─── Top-bar skeleton ─────────────────────────────────────────────────────────

function TopBarSkeleton() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Sidebar trigger */}
      <Skeleton className="size-7 rounded-md" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-3 opacity-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </header>
  )
}

// ─── Content skeleton ─────────────────────────────────────────────────────────

function ContentSkeleton() {
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 opacity-60" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-5 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 opacity-70" />
              <Skeleton className="size-5 rounded opacity-50" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-28 opacity-50" />
          </div>
        ))}
      </div>

      {/* Table-like block */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="h-8 w-56 rounded-md" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Header row */}
        <div className="flex gap-4 border-b bg-muted/40 px-4 py-2.5">
          {[32, 40, 28, 36, 24].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 w-${w} opacity-60`} />
          ))}
        </div>
tch
        {/* Data rows */}
        {Array.from({ length: 7 }).map((_, ri) => (
          <div
            key={ri}
            className="flex gap-4 border-b px-4 py-3 last:border-0"
          >
            {[32, 40, 28, 36, 24].map((w, ci) => (
              <Skeleton key={ci} className={`h-3.5 w-${w}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Full layout skeleton ─────────────────────────────────────────────────────

export function LayoutSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarSkeleton />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBarSkeleton />
        <ContentSkeleton />
      </div>
    </div>
  )
}
