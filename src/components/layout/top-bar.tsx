import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppBreadcrumbs } from './breadcrumbs'

// ─── Component ────────────────────────────────────────────────────────────────

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      {/* Hamburger toggle — collapses/expands the sidebar */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {/* Auto-generated breadcrumbs */}
      <AppBreadcrumbs />
    </header>
  )
}
