import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppBreadcrumbs } from './breadcrumbs'

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar() {
  return (
    <header className="mobile-edge-safe-px sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Hamburger toggle — collapses/expands the sidebar */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {/* Auto-generated breadcrumbs */}
      <AppBreadcrumbs />
    </header>
  )
}
