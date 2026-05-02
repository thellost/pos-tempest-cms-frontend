import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Monitor,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  Utensils,
  Warehouse,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  roles?: string[] // undefined = all roles
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'POS Management',
    items: [
      {
        label: 'Orders',
        to: '/orders',
        icon: ShoppingCart,
        roles: ['admin', 'manager', 'cashier'],
      },
      { label: 'Shifts', to: '/shifts', icon: Clock },
      { label: 'Tables & Floor Areas', to: '/tables', icon: LayoutGrid },
      { label: 'Reservations', to: '/reservations', icon: Calendar },
    ],
  },
  {
    label: 'Product Management',
    items: [
      {
        label: 'Menu Items',
        to: '/menu-items',
        icon: Utensils,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Categories',
        to: '/categories',
        icon: Tag,
        roles: ['admin', 'manager'],
      },
      {
        label: 'Modifier Groups',
        to: '/modifiers',
        icon: BookOpen,
        roles: ['admin', 'manager', 'cashier'],
      },
    ],
  },
  {
    label: 'Inventory',
    items: [
      {
        label: 'Stock Levels',
        to: '/inventory',
        icon: Warehouse,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Suppliers',
        to: '/suppliers',
        icon: Package,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Purchase Orders',
        to: '/purchases',
        icon: ClipboardList,
        roles: ['admin', 'manager', 'cashier'],
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        label: 'Users',
        to: '/users',
        icon: Users,
        roles: ['admin', 'manager', 'cashier'],
      },
      { label: 'Customers', to: '/customers', icon: Users },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        label: 'Discounts',
        to: '/discounts',
        icon: DollarSign,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Tax Configuration',
        to: '/settings/tax',
        icon: Receipt,
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    label: 'Reports',
    items: [
      {
        label: 'Sales Report',
        to: '/reports/sales',
        icon: BarChart3,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Cash Flow',
        to: '/reports/cash-flow',
        icon: DollarSign,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Shift Reports',
        to: '/reports/shifts',
        icon: FileText,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Expense Report',
        to: '/reports/expenses',
        icon: Receipt,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Cash Transactions',
        to: '/reports/cash-transactions',
        icon: ArrowRightLeft,
        roles: ['admin', 'manager', 'cashier'],
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Branches',
        to: '/branches',
        icon: Settings,
        roles: ['admin'],
      },
      {
        label: 'Devices',
        to: '/devices',
        icon: Monitor,
        roles: ['admin', 'manager', 'cashier'],
      },
      {
        label: 'Audit Logs',
        to: '/audit-logs',
        icon: AlertTriangle,
        roles: ['admin', 'manager', 'cashier'],
      },
    ],
  },
]

// ─── Role badge color ─────────────────────────────────────────────────────────

function roleBadgeVariant(
  role: string | null,
): 'default' | 'secondary' | 'outline' {
  if (role === 'admin') return 'default'
  if (role === 'manager') return 'secondary'
  return 'outline'
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { user, role, signOut } = useAuth()
  const navigate = useNavigate()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  async function handleSignOut() {
    await signOut()
    // replace: true removes the authenticated pages from history so the
    // browser back button cannot return to them after logout.
    navigate({ to: '/login', replace: true })
  }

  return (
    <Sidebar collapsible="icon">
      {/* ── Header ── */}
      <SidebarHeader className="border-b px-4 py-3">
        <span className="truncate text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
          POS Tempest
        </span>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent>
        {NAV_GROUPS.map((group) => {
          // Filter items the current user's role can see
          const visibleItems = group.items.filter(
            (item) => !item.roles || (role && item.roles.includes(role)),
          )
          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    currentPath === item.to ||
                    (item.to !== '/dashboard' &&
                      currentPath.startsWith(item.to))
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link to={item.to as string}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
              <SidebarSeparator />
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      {/* ── Footer: user info + logout ── */}
      <SidebarFooter className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto gap-3 p-2">
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={user?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user ? getInitials(user.name) : '??'}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="truncate text-sm font-medium">
                  {user?.name ?? 'Loading…'}
                </span>
                <Badge
                  variant={roleBadgeVariant(role)}
                  className="mt-0.5 h-4 px-1 text-[10px]"
                >
                  {role ?? '—'}
                </Badge>
              </div>
              <ChevronDown className="ml-auto size-4 shrink-0 opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-48">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
