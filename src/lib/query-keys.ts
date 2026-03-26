// ─── Query Key Factory ────────────────────────────────────────────────────────
//
// Centralizes every TanStack Query cache key in one place.
// Use these keys in useQuery / useMutation / invalidateQueries to avoid typos
// and keep invalidation logic consistent across the whole app.
//
// Pattern:
//   queryKeys.<domain>.all          → broad invalidation ("anything about X")
//   queryKeys.<domain>.list(filters)→ specific list with filters
//   queryKeys.<domain>.detail(id)   → single record
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── Shared filter shapes (lightweight — no full Zod schemas needed here) ────

export type BranchFilters = {
  page?: number
  pageSize?: number
  isActive?: boolean
}

export type UserFilters = {
  branchId?: number
  roleId?: number
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export type DeviceFilters = {
  branchId?: number
  page?: number
  pageSize?: number
}

export type ShiftFilters = {
  branchId?: number
  deviceId?: string
  userId?: number
  status?: 'open' | 'closed'
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export type FloorAreaFilters = {
  branchId?: number
}

export type TableFilters = {
  branchId?: number
  floorAreaId?: number
  status?: 'available' | 'occupied' | 'reserved' | 'maintenance'
  isActive?: boolean
  page?: number
  pageSize?: number
}

export type CategoryFilters = {
  page?: number
  pageSize?: number
}

export type MenuItemFilters = {
  categoryId?: number
  pricingType?: 'fixed' | 'weight_based'
  isAvailable?: boolean
  isActive?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export type ModifierGroupFilters = {
  page?: number
  pageSize?: number
}

export type CustomerFilters = {
  search?: string
  sortBy?: 'name' | 'visits' | 'spent' | 'points'
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type ReservationFilters = {
  branchId?: number
  tableId?: number
  status?: 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled'
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export type OrderFilters = {
  branchId?: number
  status?: string
  paymentStatus?: string
  orderType?: 'dine_in' | 'takeaway'
  cashierId?: number
  customerId?: number
  shiftId?: number
  tableId?: number
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
}

export type DiscountFilters = {
  page?: number
  pageSize?: number
}

export type InventoryFilters = {
  branchId?: number
  name?: string
  lowStockOnly?: boolean
  page?: number
  pageSize?: number
}

export type InventoryMovementFilters = {
  page?: number
  pageSize?: number
}

export type SupplierFilters = {
  page?: number
  pageSize?: number
}

export type PurchaseFilters = {
  supplierId?: number
  branchId?: number
  status?: 'ordered' | 'partial_received' | 'received' | 'cancelled'
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export type TaxConfigFilters = {
  branchId?: number
  page?: number
  pageSize?: number
}

export type AuditLogFilters = {
  userId?: number
  branchId?: number
  action?: string
  tableName?: string
  recordId?: number
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export type StatsFilter = {
  branchId?: number
  dateFrom?: string
  dateTo?: string
  groupBy?: 'day' | 'week' | 'month'
  limit?: number
}

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const queryKeys = {
  // ── Branches ──────────────────────────────────────────────────────────────
  branches: {
    all: ['branches'] as const,
    list: (filters?: BranchFilters) => ['branches', 'list', filters ?? {}] as const,
    detail: (id: number) => ['branches', 'detail', id] as const,
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    all: ['users'] as const,
    list: (filters?: UserFilters) => ['users', 'list', filters ?? {}] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
    me: ['users', 'me'] as const,
  },

  // ── Devices ───────────────────────────────────────────────────────────────
  devices: {
    all: ['devices'] as const,
    list: (filters?: DeviceFilters) => ['devices', 'list', filters ?? {}] as const,
    detail: (device_uid: string) => ['devices', 'detail', device_uid] as const,
  },

  // ── Shifts ────────────────────────────────────────────────────────────────
  shifts: {
    all: ['shifts'] as const,
    list: (filters?: ShiftFilters) => ['shifts', 'list', filters ?? {}] as const,
    detail: (id: number) => ['shifts', 'detail', id] as const,
    summary: (id: number) => ['shifts', 'summary', id] as const,
    cashTransactions: (shiftId: number) =>
      ['shifts', 'cash-transactions', shiftId] as const,
  },

  // ── Floor Areas ───────────────────────────────────────────────────────────
  floorAreas: {
    all: ['floor-areas'] as const,
    list: (filters?: FloorAreaFilters) => ['floor-areas', 'list', filters ?? {}] as const,
    detail: (id: number) => ['floor-areas', 'detail', id] as const,
  },

  // ── Tables ────────────────────────────────────────────────────────────────
  tables: {
    all: ['tables'] as const,
    list: (filters?: TableFilters) => ['tables', 'list', filters ?? {}] as const,
    detail: (id: number) => ['tables', 'detail', id] as const,
  },

  // ── Categories ────────────────────────────────────────────────────────────
  categories: {
    all: ['categories'] as const,
    list: (filters?: CategoryFilters) => ['categories', 'list', filters ?? {}] as const,
    tree: ['categories', 'tree'] as const,
    detail: (id: number) => ['categories', 'detail', id] as const,
  },

  // ── Menu Items ────────────────────────────────────────────────────────────
  menuItems: {
    all: ['menu-items'] as const,
    list: (filters?: MenuItemFilters) => ['menu-items', 'list', filters ?? {}] as const,
    detail: (id: number) => ['menu-items', 'detail', id] as const,
  },

  // ── Modifier Groups ───────────────────────────────────────────────────────
  modifierGroups: {
    all: ['modifier-groups'] as const,
    list: (filters?: ModifierGroupFilters) =>
      ['modifier-groups', 'list', filters ?? {}] as const,
    detail: (id: number) => ['modifier-groups', 'detail', id] as const,
  },

  // ── Modifiers (individual options) ────────────────────────────────────────
  modifiers: {
    all: ['modifiers'] as const,
    byGroup: (groupId: number) => ['modifiers', 'group', groupId] as const,
    detail: (id: number) => ['modifiers', 'detail', id] as const,
  },

  // ── Customers ─────────────────────────────────────────────────────────────
  customers: {
    all: ['customers'] as const,
    list: (filters?: CustomerFilters) => ['customers', 'list', filters ?? {}] as const,
    detail: (id: number) => ['customers', 'detail', id] as const,
  },

  // ── Reservations ──────────────────────────────────────────────────────────
  reservations: {
    all: ['reservations'] as const,
    list: (filters?: ReservationFilters) =>
      ['reservations', 'list', filters ?? {}] as const,
    detail: (id: number) => ['reservations', 'detail', id] as const,
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  orders: {
    all: ['orders'] as const,
    list: (filters?: OrderFilters) => ['orders', 'list', filters ?? {}] as const,
    detail: (id: number) => ['orders', 'detail', id] as const,
  },

  // ── Discounts ─────────────────────────────────────────────────────────────
  discounts: {
    all: ['discounts'] as const,
    list: (filters?: DiscountFilters) => ['discounts', 'list', filters ?? {}] as const,
    active: ['discounts', 'active'] as const,
    detail: (id: number) => ['discounts', 'detail', id] as const,
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  inventory: {
    all: ['inventory'] as const,
    list: (filters?: InventoryFilters) => ['inventory', 'list', filters ?? {}] as const,
    lowStock: (branchId?: number) => ['inventory', 'low-stock', branchId] as const,
    detail: (id: number) => ['inventory', 'detail', id] as const,
    movements: (inventoryId: number, filters?: InventoryMovementFilters) =>
      ['inventory', 'movements', inventoryId, filters ?? {}] as const,
  },

  // ── Suppliers ─────────────────────────────────────────────────────────────
  suppliers: {
    all: ['suppliers'] as const,
    list: (filters?: SupplierFilters) => ['suppliers', 'list', filters ?? {}] as const,
    detail: (id: number) => ['suppliers', 'detail', id] as const,
  },

  // ── Purchases ─────────────────────────────────────────────────────────────
  purchases: {
    all: ['purchases'] as const,
    list: (filters?: PurchaseFilters) => ['purchases', 'list', filters ?? {}] as const,
    detail: (id: number) => ['purchases', 'detail', id] as const,
  },

  // ── Tax Configs ───────────────────────────────────────────────────────────
  taxConfigs: {
    all: ['tax-configs'] as const,
    list: (filters?: TaxConfigFilters) => ['tax-configs', 'list', filters ?? {}] as const,
    detail: (id: number) => ['tax-configs', 'detail', id] as const,
  },

  // ── Audit Logs ────────────────────────────────────────────────────────────
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (filters?: AuditLogFilters) => ['audit-logs', 'list', filters ?? {}] as const,
    record: (tableName: string, recordId: number) =>
      ['audit-logs', 'record', tableName, recordId] as const,
  },

  // ── Statistics ────────────────────────────────────────────────────────────
  statistics: {
    dashboard: ['statistics', 'dashboard'] as const,
    sales: (filters?: StatsFilter) => ['statistics', 'sales', filters ?? {}] as const,
    revenueByCategory: (filters?: StatsFilter) =>
      ['statistics', 'revenue-by-category', filters ?? {}] as const,
    topItems: (filters?: StatsFilter) =>
      ['statistics', 'top-items', filters ?? {}] as const,
    paymentMethods: (filters?: StatsFilter) =>
      ['statistics', 'payment-methods', filters ?? {}] as const,
    cashFlow: (filters?: StatsFilter) =>
      ['statistics', 'cash-flow', filters ?? {}] as const,
    shiftReport: (id: number) => ['statistics', 'shift-report', id] as const,
  },
} as const
