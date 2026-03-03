import { Link, useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Fragment } from 'react'

// ─── Label map ────────────────────────────────────────────────────────────────
// Maps URL segments to human-readable labels. Dynamic segments (IDs) are
// rendered as-is when no mapping is found.

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  shifts: 'Shifts',
  tables: 'Tables & Floor Areas',
  reservations: 'Reservations',
  'menu-items': 'Menu Items',
  categories: 'Categories',
  modifiers: 'Modifier Groups',
  inventory: 'Inventory',
  movements: 'Movement History',
  suppliers: 'Suppliers',
  purchases: 'Purchase Orders',
  discounts: 'Discounts',
  users: 'Users',
  customers: 'Customers',
  branches: 'Branches',
  devices: 'Devices',
  'audit-logs': 'Audit Logs',
  reports: 'Reports',
  sales: 'Sales Report',
  'cash-flow': 'Cash Flow',
  settings: 'Settings',
  tax: 'Tax Configuration',
  create: 'Create',
}

function segmentLabel(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppBreadcrumbs() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  // Split path into segments, remove empty strings
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  // Build cumulative hrefs: ['dashboard'] → ['/dashboard']
  const crumbs = segments.map((segment, i) => ({
    label: segmentLabel(segment),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbItem>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href as string}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
