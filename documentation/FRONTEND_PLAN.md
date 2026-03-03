# POS Tempest CMS Frontend — Detailed Implementation Plan

> **Stack:** React 19 · TanStack Start · TanStack Router (file-based) · TanStack Query v5 · TanStack Form · TanStack Table · Supabase Auth · shadcn/ui (New York) · Tailwind CSS v4 · Vite 7 · Zod  
> **Architecture:** Route-first — `Route (loader/guard) → Page → Query Hooks → API Client → Backend`  
> **Module:** `pos-tempest-cms-frontend`

---

## Table of Contents

1. [Current State & Tech Stack](#1-current-state--tech-stack)
2. [Phase 1 — Core Infrastructure (Auth, API Client, Layout Shell)](#2-phase-1--core-infrastructure)
3. [Phase 2 — Shared UI Components](#3-phase-2--shared-ui-components)
4. [Phase 3 — Domain Modules (CRUD Screens)](#4-phase-3--domain-modules-crud-screens)
5. [Phase 4 — Read-Only Views](#5-phase-4--read-only-views)
6. [Phase 5 — Dashboard & Reports](#6-phase-5--dashboard--reports)
7. [Phase 6 — Polish & Production Readiness](#7-phase-6--polish--production-readiness)
8. [Full Route Map](#8-full-route-map)
9. [Further Considerations](#9-further-considerations)

---

## 1. Current State & Tech Stack

### Installed Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` / `react-dom` | ^19.2.0 | UI library |
| `@tanstack/react-start` | ^1.132.0 | Full-stack React framework (SSR, server functions, API routes) |
| `@tanstack/react-router` | ^1.132.0 | File-based routing |
| `@tanstack/react-query` | ^5.66.5 | Server-state / data fetching |
| `@tanstack/react-form` | ^1.0.0 | Form management |
| `@tanstack/react-table` | ^8.21.2 | Headless table |
| `@tanstack/match-sorter-utils` | ^8.19.4 | Fuzzy filter/sort |
| `tailwindcss` | ^4.0.6 | Utility-first CSS (v4) |
| `radix-ui` | ^1.4.3 | Headless UI primitives (shadcn base) |
| `class-variance-authority` | ^0.7.1 | Component variant API |
| `clsx` + `tailwind-merge` | latest | Conditional classNames |
| `lucide-react` | ^0.561.0 | Icon library |
| `zod` | ^4.1.11 | Schema validation |
| `vite` | ^7.1.7 | Build tool |

### Path Aliases

```
@/* → ./src/*
```

### shadcn/ui Config

- **Style:** `new-york`
- **Base Color:** `zinc`
- **CSS Variables:** enabled (oklch color space)
- **Icon Library:** `lucide`
- **Currently Installed Components:** `button`, `input`, `textarea`, `select`, `slider`, `switch`, `label`

### What Exists

- TanStack Router file-based routing with auto-generated route tree
- TanStack Query integration (SSR-ready, `queryClient` in router context)
- TanStack Form setup with `useAppForm` + field context pattern
- Form field components: `TextField`, `TextareaField`, `SelectField`, `SliderField`, `SwitchField`, `SubscribeButton`
- Dark-themed sidebar header with hamburger menu
- All current routes are **demo/template routes** — no CMS-specific pages exist yet

### What Needs To Be Built

- Supabase Auth (client, login, session management, route guards)
- Typed API client to talk to the Go backend
- Dashboard layout shell (sidebar navigation, breadcrumbs, top bar)
- All CRUD screens (17 domains, 93 backend endpoints)
- Dashboard with KPI cards + charts
- Report screens (sales, cash flow, shift reports)
- Additional shadcn/ui components + custom form fields

---

## 2. Phase 1 — Core Infrastructure

### Step 1.1 — Supabase Auth Client

**File:** `src/lib/supabase.ts`

**What it does:**
- Initializes `@supabase/supabase-js` `createClient()` using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables
- Exports a singleton `supabase` client instance
- This single client handles `signInWithPassword`, `signOut`, session refresh, and exposes the JWT access token for API calls
- Configures auth persistence to `localStorage` so sessions survive page refresh

**Dependency to install:**
```bash
bun add @supabase/supabase-js
```

**Environment variables required (`.env.local`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8080
```

---

### Step 1.2 — Auth Context & Hook

**File:** `src/hooks/use-auth.tsx`

**What it does:**
- Creates `AuthContext` with React `createContext`
- `AuthProvider` component wraps the entire app (added to `__root.tsx`)
- On mount, calls `supabase.auth.getSession()` to restore existing session
- Subscribes to `supabase.auth.onAuthStateChange` to react to login/logout/token refresh events
- Once a session is established, calls `GET /api/v1/users/me` to fetch the full user profile (role, branch, name, avatar)
- Stores in state: `session`, `user` (profile from backend), `isLoading` (initial session check), `isAuthenticated`

**Exposed hook `useAuth()` returns:**
```ts
{
  user: User | null           // Full backend profile (id, name, email, role_name, branch_id, etc.)
  session: Session | null     // Supabase session with access_token
  isLoading: boolean          // True during initial session check
  isAuthenticated: boolean    // Shorthand for session !== null
  signIn: (email, password) => Promise<void>
  signOut: () => Promise<void>
  role: string | null         // "admin" | "manager" | "cashier" | "chef" | "waiter"
  branchId: number | null     // User's assigned branch
}
```

**Integration point:** Wire `<AuthProvider>` into the root route component in `src/routes/__root.tsx`, wrapping the existing `<Outlet />`.

---

### Step 1.3 — Typed API Client

**File:** `src/lib/api-client.ts`

**What it does:**
- Exports an `ApiClient` class with generic methods: `get<T>()`, `post<T>()`, `put<T>()`, `patch<T>()`, `delete<T>()`
- Every request automatically:
  1. Prepends `VITE_API_BASE_URL` to the path (e.g., `/api/v1/users` → `http://localhost:8080/api/v1/users`)
  2. Reads the current JWT from `supabase.auth.getSession()` and injects `Authorization: Bearer <token>` header
  3. Sets `Content-Type: application/json`
  4. Parses the standard backend envelope `{ success, data, error, meta }`
  5. On `success: true` → returns `{ data, meta }`
  6. On `success: false` → throws `ApiError` with `code`, `message`, `status`
  7. On 401 → triggers `supabase.auth.signOut()` and redirects to `/login`

**Types:**
```ts
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
  meta?: { page: number; page_size: number; total: number; total_pages: number }
}

class ApiError extends Error {
  code: string
  status: number
}
```

**Exports:** Singleton `api` instance used by all query hooks.

**Pagination helper:**
```ts
function buildQueryParams(filters: Record<string, unknown>, pagination?: { page: number; pageSize: number }): string
```

---

### Step 1.4 — Route Guards & Login Page

**Files:**
- `src/routes/login.tsx` — Public login page
- `src/routes/_authenticated.tsx` — Protected layout route (route guard)

**Login Page (`login.tsx`):**
- Full-page centered card with logo, email input, password input, submit button
- Uses shadcn `Card`, `Input`, `Button`, `Label`
- Calls `useAuth().signIn(email, password)` on submit
- Shows validation errors from Supabase (invalid credentials, etc.) via inline error message
- On success, redirects to `/dashboard` using `router.navigate()`
- If already authenticated, redirect away from login page

**Route Guard (`_authenticated.tsx`):**
- This is a **layout route** — all CMS pages are children of this route
- Uses TanStack Router's `beforeLoad` to check authentication:
  ```ts
  beforeLoad: async ({ context }) => {
    // If no session, redirect to /login
    // If session exists, allow through
  }
  ```
- Renders the dashboard layout shell (sidebar + top bar + `<Outlet />`)

**Role-based guard helper:**
```ts
function requireRole(allowedRoles: string[]) {
  // Returns a beforeLoad function that checks user.role_name against allowedRoles
  // If not authorized, redirects to /dashboard with a "forbidden" toast
}
```

---

### Step 1.5 — Dashboard Layout Shell

**Files:**
- `src/routes/_authenticated.tsx` — Layout component
- `src/components/layout/sidebar.tsx` — Sidebar navigation
- `src/components/layout/top-bar.tsx` — Top bar with user menu
- `src/components/layout/breadcrumbs.tsx` — Auto-generated breadcrumbs from route

**Layout structure:**
```
┌─────────────────────────────────────────────┐
│ Top Bar: [☰ Toggle] [Breadcrumbs]  [Avatar ▼]│
├────────┬────────────────────────────────────┤
│        │                                     │
│ Sidebar│         <Outlet />                  │
│        │      (Page Content)                 │
│ - Dash │                                     │
│ - POS  │                                     │
│ - Prod │                                     │
│ - Inv  │                                     │
│ - Ppl  │                                     │
│ - Rpt  │                                     │
│ - Set  │                                     │
│ - Audit│                                     │
│        │                                     │
└────────┴────────────────────────────────────┘
```

**Sidebar navigation groups (with role visibility):**

| Group | Items | Roles |
|-------|-------|-------|
| **Dashboard** | Dashboard Home | all |
| **POS Management** | Orders, Shifts, Tables & Floor Areas, Reservations | all (Orders: admin/manager only) |
| **Product Management** | Menu Items, Categories, Modifier Groups | admin, manager |
| **Inventory** | Stock Levels, Suppliers, Purchase Orders | admin, manager |
| **People** | Users, Customers | Users: admin/manager; Customers: all |
| **Finance** | Discounts, Tax Configuration | admin, manager |
| **Reports** | Sales Report, Cash Flow, Shift Reports | admin, manager |
| **System** | Devices, Branches, Audit Logs | admin (Audit: admin/manager) |

**Features:**
- Collapsible sidebar (toggle via hamburger icon)
- On mobile: sidebar renders as a `Sheet` (slide-in drawer)
- Active route highlighted using TanStack Router's `Link` with `activeProps`
- User avatar + name + role badge in bottom of sidebar
- Logout button in user dropdown menu (top-right avatar)
- Auto-generated breadcrumbs from the route path segments

**shadcn/ui components to install:**
```bash
bunx shadcn@latest add sidebar sheet dropdown-menu avatar badge breadcrumb separator tooltip skeleton
```

---

### Step 1.6 — Query Key Factory & Shared Hooks

**Files:**
- `src/lib/query-keys.ts` — Structured query key factory
- `src/hooks/use-pagination.ts` — Pagination state hook

**Query Key Factory (`query-keys.ts`):**

Centralizes all TanStack Query cache keys so invalidation is consistent and typo-free:

```ts
export const queryKeys = {
  branches: {
    all: ['branches'] as const,
    list: (filters?: BranchFilters) => ['branches', 'list', filters] as const,
    detail: (id: number) => ['branches', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters?: UserFilter) => ['users', 'list', filters] as const,
    detail: (id: number) => ['users', 'detail', id] as const,
    me: ['users', 'me'] as const,
  },
  devices: { ... },
  shifts: { ... },
  floorAreas: { ... },
  tables: { ... },
  categories: { ... },
  menuItems: { ... },
  modifierGroups: { ... },
  modifiers: { ... },
  customers: { ... },
  reservations: { ... },
  orders: { ... },
  discounts: { ... },
  inventory: { ... },
  suppliers: { ... },
  purchases: { ... },
  taxConfigs: { ... },
  auditLogs: { ... },
  statistics: {
    dashboard: ['statistics', 'dashboard'] as const,
    sales: (filters?: StatsFilter) => ['statistics', 'sales', filters] as const,
    revenueByCategory: (filters?: StatsFilter) => ['statistics', 'revenue-by-category', filters] as const,
    topItems: (filters?: StatsFilter) => ['statistics', 'top-items', filters] as const,
    paymentMethods: (filters?: StatsFilter) => ['statistics', 'payment-methods', filters] as const,
    cashFlow: (filters?: StatsFilter) => ['statistics', 'cash-flow', filters] as const,
    shiftReport: (id: number) => ['statistics', 'shift-report', id] as const,
  },
}
```

**Pagination Hook (`use-pagination.ts`):**

Manages `page` and `pageSize` state, provides computed `offset`, and syncs with URL search params:

```ts
function usePagination(defaults?: { page?: number; pageSize?: number }) {
  // Returns: { page, pageSize, setPage, setPageSize, offset, toQueryParams }
  // Syncs with URL ?page=&page_size= via TanStack Router search params
}
```

---

## 3. Phase 2 — Shared UI Components

### Step 2.1 — Install Required shadcn/ui Components

**What it does:** Adds all the UI primitives needed across every CRUD screen, the dashboard, and reports. These are headless Radix-based components styled with Tailwind CSS via shadcn.

**Command:**
```bash
bunx shadcn@latest add table dialog card tabs sonner pagination command popover calendar dropdown-menu avatar badge breadcrumb separator tooltip skeleton sheet sidebar chart checkbox radio-group alert alert-dialog scroll-area
```

**Component → Usage mapping:**

| Component | Used In |
|-----------|---------|
| `table` | Every list page (DataTable) |
| `dialog` | Create/edit forms, confirmations |
| `card` | Dashboard stat cards, detail sections |
| `tabs` | Multi-section forms, report views |
| `sonner` (toast) | Success/error notifications on all mutations |
| `pagination` | Every list page |
| `command` | Combobox/searchable selects (branch, category, supplier pickers) |
| `popover` | Date pickers, combobox dropdowns |
| `calendar` | Date range filters, reservation date picker |
| `dropdown-menu` | Row actions (edit/delete/status change) |
| `avatar` | User menu, user list |
| `badge` | Status indicators (order, payment, shift, device, table statuses) |
| `breadcrumb` | Layout navigation |
| `tooltip` | Icon-only buttons, truncated text |
| `skeleton` | Loading states on every page |
| `sheet` | Mobile sidebar, slide-in panels |
| `sidebar` | Main navigation |
| `chart` (recharts) | Dashboard KPIs, sales reports, cash flow |
| `checkbox` | Bulk selection in tables |
| `radio-group` | Pricing type selection, filter options |
| `alert` / `alert-dialog` | Destructive action confirmations |
| `scroll-area` | Long lists in dialogs, sidebar |

---

### Step 2.2 — Reusable Data Table Component

**Files:**
- `src/components/data-table/data-table.tsx` — Main component
- `src/components/data-table/data-table-pagination.tsx` — Pagination controls
- `src/components/data-table/data-table-toolbar.tsx` — Filter/search toolbar
- `src/components/data-table/data-table-column-header.tsx` — Sortable column header
- `src/components/data-table/data-table-row-actions.tsx` — Row action dropdown
- `src/components/data-table/data-table-skeleton.tsx` — Loading skeleton

**What it does:**
- Generic `<DataTable<TData, TValue>>` component wrapping `@tanstack/react-table` + shadcn `Table`
- Accepts: `columns` (column definitions), `data` (array), `meta` (pagination from API), `isLoading`, `onPaginationChange`, filter slots
- Renders: header row with sort indicators, data rows, empty state ("No results found"), skeleton rows when loading
- Pagination bar at bottom using shadcn `Pagination` — shows page X of Y, page size selector (10/20/50/100), prev/next buttons
- Column visibility dropdown to hide/show columns
- This single component is reused on **every** list screen (users, menu items, orders, inventory, etc.)

**Props interface:**
```ts
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  meta?: { page: number; page_size: number; total: number; total_pages: number }
  isLoading?: boolean
  pagination: { page: number; pageSize: number }
  onPaginationChange: (pagination: { page: number; pageSize: number }) => void
  toolbar?: React.ReactNode       // Slot for filters above the table
  emptyMessage?: string
}
```

---

### Step 2.3 — Form Wrappers & Field Components

**Files:** `src/components/form-fields/` (refactored from existing `demo.FormComponents.tsx`)

**What it does:** Extends the existing TanStack Form + `useFieldContext` pattern with additional field types needed by CMS forms.

**Existing fields (keep & refactor):**
- `TextField` — Text input with label + validation errors
- `TextareaField` — Multiline text input
- `SelectField` — Dropdown select from options array
- `SliderField` — Numeric slider
- `SwitchField` — Boolean toggle
- `SubscribeButton` — Submit button that disables during submission

**New fields to create:**

| Field Component | Description | Used In |
|----------------|-------------|---------|
| `NumberField` | Numeric input with min/max/step. Used for prices, quantities, percentages. Shows currency prefix for price fields. | Menu items (price, cost), inventory (quantity, threshold), tax (rate), discounts (value) |
| `DatePickerField` | shadcn `Calendar` inside a `Popover`, bound to a date string field. Shows formatted date in trigger button. | Reservations (datetime), discounts (valid_from/until), report filters (date range) |
| `DateRangePickerField` | Two-date variant for filtering by date ranges. | Report filters, shift filters, order filters |
| `ComboboxField` | Searchable dropdown using shadcn `Command` + `Popover`. Loads options from an API query (e.g., branches, categories, suppliers). Shows search input + scrollable list. | Branch selector, category selector, supplier selector, customer selector, menu item selector |
| `ImageUploadField` | File input styled as a drop zone with image preview. Uploads to Supabase Storage, returns public URL. Shows current image if editing. | Menu item image |
| `CheckboxField` | Single checkbox bound to boolean field. | Various settings |
| `RadioGroupField` | Radio button group bound to enum field. | Pricing type (fixed/weight_based), discount type (percentage/fixed_amount) |
| `PasswordField` | Input with show/hide toggle for password entry. | User creation (password), user creation (PIN code) |
| `PinCodeField` | Masked numeric input (6 digits) with dots. | User creation/edit (PIN code) |

**Each field follows the established pattern:**
1. Uses `useFieldContext()` to read field state (value, errors, meta)
2. Renders `Label` + the input component + `ErrorMessages`
3. Calls `field.handleChange()` on value change
4. Shows validation errors from `field.state.meta.errors`

---

### Step 2.4 — Shared UI Patterns

**Files:**

| Component | File | Description |
|-----------|------|-------------|
| `ConfirmDialog` | `src/components/confirm-dialog.tsx` | Reusable `AlertDialog` for destructive actions. Props: `title`, `description`, `onConfirm`, `isLoading`, `variant` (default/destructive). Used before every delete, deactivate, or cancel action. |
| `StatusBadge` | `src/components/status-badge.tsx` | Color-coded `Badge` component. Maps backend enum values to colors: green (active/available/completed/paid), yellow (pending/reserved/partial), red (cancelled/inactive/unpaid/maintenance), blue (confirmed/preparing). Used on every table with status columns. |
| `PageHeader` | `src/components/page-header.tsx` | Page title + optional description + action button slot (e.g., "Add User" button). Consistent heading across all pages. |
| `StatCard` | `src/components/stat-card.tsx` | Dashboard KPI card using shadcn `Card`. Shows: icon, label, value (large text), trend indicator (↑12% or ↓5% with green/red color). |
| `EmptyState` | `src/components/empty-state.tsx` | Centered icon + message + optional CTA button. Shown when lists have zero results. |
| `FilterBar` | `src/components/filter-bar.tsx` | Horizontal bar with filter inputs (selects, search input, date range). Manages filter state and passes to parent. Includes "Clear filters" button. |

---

## 4. Phase 3 — Domain Modules (CRUD Screens)

> **Every domain follows the same file pattern:**
>
> | File | Purpose |
> |------|---------|
> | `src/lib/services/<domain>.ts` | Typed API functions (thin wrappers around `api.get/post/put/patch/delete`) |
> | `src/hooks/use-<domain>.ts` | TanStack Query hooks (`useQuery` for reads, `useMutation` for writes with cache invalidation) |
> | `src/routes/_authenticated/<domain>/index.tsx` | List page (DataTable + filters) |
> | `src/routes/_authenticated/<domain>/create.tsx` | Create form (or dialog) |
> | `src/routes/_authenticated/<domain>/$id.tsx` | Detail / edit page |
> | `src/components/<domain>/columns.tsx` | TanStack Table column definitions |
>
> **Mutation pattern:** Every `useMutation` invalidates the relevant list query on success, shows a success toast via `sonner`, and shows an error toast on failure.

---

### Step 3.1 — Branch Management

**Routes:**
- `_authenticated/branches/index.tsx` — Branch list
- Create/edit via dialog (simple entity, no dedicated page needed)

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/branches` | List all branches (paginated) |
| GET | `/api/v1/branches/:id` | Get single branch |
| POST | `/api/v1/branches` | Create branch |
| PUT | `/api/v1/branches/:id` | Update branch |

**List page features:**
- DataTable columns: Name, Address, Phone, Tax Rate (%), Service Charge (%), Currency, Timezone, Status (`StatusBadge`), Actions
- Create button opens `Dialog` with form
- Row actions dropdown: Edit, Deactivate (with `ConfirmDialog`)

**Form fields:**
- Name (required, max 100)
- Address (textarea)
- Phone
- Tax Rate (number, percentage)
- Service Charge Rate (number, percentage)
- Currency (select: IDR, USD, etc.)
- Timezone (select)
- Is Active (switch, edit only)

**Access:** Admin can create/edit; Admin + Manager can view.

---

### Step 3.2 — User Management

**Routes:**
- `_authenticated/users/index.tsx` — User list
- `_authenticated/users/create.tsx` — Create user
- `_authenticated/users/$userId.tsx` — Edit user

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/users` | List users (filter: branch_id, role_id, is_active, search) |
| GET | `/api/v1/users/:id` | Get single user |
| GET | `/api/v1/users/me` | Get own profile (used by auth context) |
| POST | `/api/v1/users` | Create user (creates Supabase Auth + DB user) |
| PUT | `/api/v1/users/:id` | Update user |
| PATCH | `/api/v1/users/:id/deactivate` | Deactivate user |

**List page features:**
- DataTable columns: Avatar, Name, Email, Phone, Role (`Badge`), Branch, Status (`StatusBadge`), Last Login, Actions
- Filter bar: Branch (combobox), Role (select), Status (select), Search (text input searches name + email)
- Row actions: Edit, Deactivate (with `ConfirmDialog`)

**Create form fields:**
- Email (required, email validation)
- Password (required on create, `PasswordField`, min 8 chars)
- Name (required, max 100)
- Phone
- Role (select: admin, manager, cashier, chef, waiter) — **Managers can only create cashier/chef/waiter** (disable admin/manager options in UI)
- Branch (combobox, required)
- PIN Code (`PinCodeField`, 4-8 digits, optional)

**Edit form fields:**
- Same as create except: password is optional (leave blank to keep current), email is read-only
- Additional: Is Active switch, Avatar URL

**Important flow:** Creating a user calls `POST /api/v1/users` which creates both a Supabase Auth user and a database profile. The backend handles this atomically.

**Access:** Admin can manage all users; Manager can manage cashier/chef/waiter in their branch only.

---

### Step 3.3 — Device Management

**Routes:**
- `_authenticated/devices/index.tsx` — Device list + register form

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/devices` | List devices (filter: branch_id) |
| POST | `/api/v1/devices` | Register new device |
| PUT | `/api/v1/devices/:id` | Update device |
| PATCH | `/api/v1/devices/:id/status` | Change device status (active ↔ inactive) |

**List page features:**
- DataTable columns: Device Name, Device UID, Branch, Status (`StatusBadge`), Registered At, Last Seen At, Actions
- Filter by branch (combobox)
- **Status toggle** directly in the table row — click to switch between active/inactive. This is the key feature for "disabling a device so no random guy uses our app"
- Register button opens dialog

**Register device form:**
- Branch (combobox, required)
- Device UID (text, required — the unique hardware identifier)
- Device Name (text, required, max 100 — a human-readable label like "Counter 1" or "Kitchen Tablet")

**Status change:** Uses `PATCH /api/v1/devices/:id/status` with body `{ "status": "inactive" }`. Shows `ConfirmDialog` when deactivating: "This will prevent the device from connecting to the POS app."

**Access:** Admin + Manager.

---

### Step 3.4 — Shift Management

**Routes:**
- `_authenticated/shifts/index.tsx` — Shift list
- `_authenticated/shifts/$shiftId.tsx` — Shift detail + financial summary

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/shifts` | List shifts (filter: branch_id, device_id, user_id, status, date_from/to) |
| GET | `/api/v1/shifts/:id` | Get shift detail |
| GET | `/api/v1/shifts/:id/summary` | Get shift financial summary |
| POST | `/api/v1/shifts/open` | Open a new shift |
| POST | `/api/v1/shifts/:id/close` | Close a shift |

**List page features:**
- DataTable columns: ID, User Name, Device Name, Branch, Status (`StatusBadge`: green=open, grey=closed), Opening Cash, Closing Cash, Cash Difference, Opened At, Closed At, Actions
- Cash Difference column: **red text** if negative (shortage), **green text** if zero or positive
- Filter bar: Branch, Device, Status (open/closed), Date Range (from/to)
- Row actions: View Detail, Close Shift (only for open shifts)

**Open shift dialog:**
- Device (combobox, filtered to active devices in user's branch, required)
- Opening Cash (number input, required, ≥ 0)
- Note: The `user_id` is automatically set from the authenticated user

**Close shift dialog:**
- Closing Cash (number input, required, ≥ 0)
- Notes (textarea, optional)

**Detail page (`$shiftId.tsx`):**
- Shift info card: User, Device, Branch, Status, Opened/Closed At, Opening/Closing Cash
- **Financial Summary** section (from `GET /shifts/:id/summary`):
  - Total Orders count
  - Total Revenue
  - Payment Breakdown — **Pie chart** (using shadcn `chart` / recharts) showing cash vs card vs e-wallet distribution
  - Expected Cash vs Actual Cash vs Difference (highlighted)

**Access:** All staff can view and open/close their own shifts.

---

### Step 3.5 — Floor Areas & Table Management

**Routes:**
- `_authenticated/tables/index.tsx` — Combined floor areas + tables view

**API endpoints consumed:**

*Floor Areas:*
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/floor-areas` | List floor areas (filter: branch_id) |
| POST | `/api/v1/floor-areas` | Create floor area |
| PUT | `/api/v1/floor-areas/:id` | Update floor area |
| DELETE | `/api/v1/floor-areas/:id` | Delete floor area |

*Tables:*
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/tables` | List tables (filter: branch_id, floor_area_id, status, is_active) |
| GET | `/api/v1/tables/:id` | Get single table |
| POST | `/api/v1/tables` | Create table |
| PUT | `/api/v1/tables/:id` | Update table |
| PATCH | `/api/v1/tables/:id/status` | Change table status |

**Page layout:**
- Branch selector at top (combobox)
- **Tabs** — one tab per floor area in the selected branch (e.g., "Ground Floor", "Rooftop", "VIP Room")
- Each tab shows a **grid of table cards** (not a DataTable — visual card layout)
- Each table card shows: Table Number (large), Capacity (icon + number), Status (color-coded background: green=available, red=occupied, yellow=reserved, grey=maintenance)
- Click a table card → opens edit dialog
- "Add Floor Area" and "Add Table" buttons

**Table status change:**
- Status dropdown on each card or in edit dialog
- Backend enforces transition rules (e.g., can't go from "available" directly to "occupied" without an order)

**Forms:**
- Floor Area: Name (required, unique per branch), Sort Order, Is Active
- Table: Branch (auto-set from selector), Floor Area (select), Table Number (required, unique per branch), Capacity (number, ≥ 1), Status, Is Active

**Access:** Admin + Manager.

---

### Step 3.6 — Category Management

**Routes:**
- `_authenticated/categories/index.tsx` — Category tree view

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/categories` | Flat list |
| GET | `/api/v1/categories/tree` | Nested tree structure |
| GET | `/api/v1/categories/:id` | Get single category |
| POST | `/api/v1/categories` | Create category |
| PUT | `/api/v1/categories/:id` | Update category |
| DELETE | `/api/v1/categories/:id` | Soft-delete |

**Page features:**
- **Tree view** using nested collapsible sections — each category row shows name, description, sort order, status, child count
- Indentation indicates parent → child hierarchy (up to N levels deep)
- Click expand/collapse arrow to show/hide children
- Row actions: Edit, Add Sub-Category, Delete (with `ConfirmDialog`)
- "Add Category" button for root-level categories

**Create/edit form:**
- Parent Category (combobox, optional — `null` for root-level)
- Name (required, max 100)
- Description (textarea)
- Sort Order (number)
- Is Active (switch, edit only)

**Access:** Admin + Manager.

---

### Step 3.7 — Menu Item (Product) Management ⭐

> **This is the most complex CRUD screen** — many fields, nested relations (modifiers), and the primary entity of the POS system.

**Routes:**
- `_authenticated/menu-items/index.tsx` — Product list
- `_authenticated/menu-items/create.tsx` — Create product
- `_authenticated/menu-items/$itemId.tsx` — Edit product (tabbed form)

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/menu-items` | List (filter: category_id, pricing_type, is_available, search) |
| GET | `/api/v1/menu-items/:id` | Get one (with modifier_groups nested) |
| POST | `/api/v1/menu-items` | Create (auto-creates inventory per branch) |
| PUT | `/api/v1/menu-items/:id` | Update |
| PATCH | `/api/v1/menu-items/:id/availability` | Toggle availability |
| DELETE | `/api/v1/menu-items/:id` | Soft-delete |
| POST | `/api/v1/menu-items/:id/modifier-groups` | Assign modifier group |
| DELETE | `/api/v1/menu-items/:id/modifier-groups/:groupId` | Unassign modifier group |

**List page features:**
- DataTable columns: Image (thumbnail), Name, SKU, Barcode, Category, Pricing Type (`Badge`), Price, Cost, Available (`Switch` toggle — instant PATCH), Active (`StatusBadge`), Actions
- Filter bar: Category (combobox from tree), Pricing Type (select), Availability (select), Search (name/SKU/barcode)
- Row actions: Edit, Toggle Availability, Delete
- "Add Product" button → navigates to create page

**Create / Edit form (multi-tab):**

**Tab 1 — Basic Information:**
| Field | Type | Validation |
|-------|------|------------|
| Product Name | `TextField` | Required, max 200 |
| Description | `TextareaField` | Optional |
| SKU | `TextField` | Optional, unique |
| Barcode | `TextField` | Optional, unique |
| Product Image | `ImageUploadField` | Optional, uploads to Supabase Storage |

**Tab 2 — Pricing & Units:**
| Field | Type | Validation |
|-------|------|------------|
| Pricing Type | `RadioGroupField` | Required: "fixed" or "weight_based" |
| Unit of Measure | `SelectField` | Required if weight_based: piece, kg, gram, ons, liter, ml, portion |
| Price | `NumberField` | Required, > 0, shows currency prefix |
| Cost Price | `NumberField` | Required, ≥ 0 |
| Min Order Quantity | `NumberField` | Default 1, ≥ 1 |

**Tab 3 — Classification:**
| Field | Type | Validation |
|-------|------|------------|
| Category | `ComboboxField` | Optional, loads from categories tree |
| Sort Order | `NumberField` | Default 0 |
| Preparation Time (min) | `NumberField` | Optional, ≥ 0 |
| Is Available | `SwitchField` | Default true |
| Is Active | `SwitchField` | Default true (edit only) |

**Tab 4 — Modifiers (edit only):**
- Lists currently assigned modifier groups with their nested modifiers
- Each group shows: name, required/optional badge, min/max selections, list of modifier options (name + extra price)
- "Assign Modifier Group" button → opens combobox to search and select from existing modifier groups
- "Unassign" button per group (with confirmation)
- Link to "Manage Modifier Groups" page for creating new groups

**Access:** Admin + Manager.

---

### Step 3.8 — Modifier Group & Modifier Management

**Routes:**
- `_authenticated/modifiers/index.tsx` — Modifier group list with expandable rows

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/modifier-groups` | List all (with nested modifiers) |
| GET | `/api/v1/modifier-groups/:id` | Get one |
| POST | `/api/v1/modifier-groups` | Create group |
| PUT | `/api/v1/modifier-groups/:id` | Update group |
| DELETE | `/api/v1/modifier-groups/:id` | Soft-delete group |
| POST | `/api/v1/modifier-groups/:id/modifiers` | Add modifier option |
| PUT | `/api/v1/modifiers/:id` | Update modifier |
| DELETE | `/api/v1/modifiers/:id` | Soft-delete modifier |

**Page layout:**
- DataTable with **expandable rows** — click a group row to expand and see its modifier options
- Group columns: Name, Description, Required (`Badge`), Min/Max Selections, Sort Order, Status, Actions
- Expanded section shows a sub-table of modifiers: Name, Extra Price, Sort Order, Status, Actions (edit/delete)

**Group create/edit form:**
- Name (required, max 100)
- Description (textarea)
- Is Required (switch)
- Min Selections (number, ≥ 0)
- Max Selections (number, ≥ min)
- Sort Order (number)
- Is Active (switch, edit only)

**Modifier create/edit form (inline or dialog):**
- Name (required, max 100)
- Extra Price (number, ≥ 0)
- Sort Order (number)
- Is Active (switch)

**Example:** Modifier Group "Size" (required, min=1, max=1) → Modifiers: "Small" (+0), "Medium" (+5000), "Large" (+10000)

**Access:** Admin + Manager.

---

### Step 3.9 — Customer Management

**Routes:**
- `_authenticated/customers/index.tsx` — Customer list
- `_authenticated/customers/$customerId.tsx` — Customer detail

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/customers` | List (search, sort_by: name/visits/spent/points) |
| GET | `/api/v1/customers/:id` | Get one |
| POST | `/api/v1/customers` | Create |
| PUT | `/api/v1/customers/:id` | Update |

**List page features:**
- DataTable columns: Name, Phone, Email, Loyalty Points, Total Visits, Total Spent (formatted as currency), Status, Actions
- Search bar: searches across name, phone, email
- Sortable columns: name, visits, spent, points (via `sort_by` + `sort_dir` query params)

**Create/edit form:**
- Name (required, max 100)
- Phone (optional)
- Email (optional, email validation)
- Address (textarea, optional)
- Notes (textarea, optional)
- Is Active (switch, edit only)

**Detail page:**
- Customer info card (all fields)
- Read-only stats: Loyalty Points, Total Visits, Total Spent
- Order history section: links to Orders page filtered by `customer_id`

**Access:** All staff can create/view; Admin + Manager can edit/deactivate.

---

### Step 3.10 — Reservation Management

**Routes:**
- `_authenticated/reservations/index.tsx` — Reservation list + calendar view

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/reservations` | List (filter: branch_id, table_id, status, date_from/to) |
| GET | `/api/v1/reservations/:id` | Get one |
| POST | `/api/v1/reservations` | Create (backend checks table availability) |
| PUT | `/api/v1/reservations/:id` | Update |
| PATCH | `/api/v1/reservations/:id/status` | Change status |

**Page features:**
- **Two view modes** (toggle): List View (DataTable) + Calendar View (day/week grid showing reservations as colored blocks)
- Filter bar: Branch, Table, Status (select: confirmed/seated/completed/no_show/cancelled), Date Range
- DataTable columns: Customer Name, Phone, Branch, Table, Guests, Date/Time, Duration, Status (`StatusBadge`), Actions

**Status workflow buttons (in row actions or detail):**
```
confirmed → seated → completed
confirmed → no_show
confirmed → cancelled
seated → completed
```

**Create form:**
- Branch (combobox, required)
- Table (combobox, filtered by selected branch + available tables, optional)
- Customer (combobox searching existing customers, or inline name/phone fields)
- Guest Count (number, required, ≥ 1)
- Reservation Date & Time (`DatePickerField` with time, required)
- Duration (number in minutes, default 60)
- Notes (textarea)

**Access:** All staff.

---

### Step 3.11 — Discount Management

**Routes:**
- `_authenticated/discounts/index.tsx` — Discount list

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/discounts` | List all |
| GET | `/api/v1/discounts/active` | List currently valid |
| GET | `/api/v1/discounts/:id` | Get one |
| POST | `/api/v1/discounts` | Create |
| PUT | `/api/v1/discounts/:id` | Update |
| DELETE | `/api/v1/discounts/:id` | Soft-delete |

**Page features:**
- **Tabs:** "All Discounts" / "Active Now" (uses `/active` endpoint)
- DataTable columns: Name, Type (`Badge`: percentage=blue, fixed_amount=green), Value (% or currency amount), Min Order Amount, Max Discount Amount (for percentage type), Valid From, Valid Until, Status, Actions
- Create/edit via dialog

**Create/edit form:**
- Name (required, max 100)
- Description (textarea)
- Discount Type (`RadioGroupField`: "percentage" or "fixed_amount")
- Value (number — shows "%" suffix for percentage, currency prefix for fixed)
- Min Order Amount (number, optional, ≥ 0)
- Max Discount Amount (number, optional, only shown when type=percentage)
- Valid From (`DatePickerField`, optional)
- Valid Until (`DatePickerField`, optional, must be after valid_from)
- Is Active (switch, edit only)

**Access:** Admin + Manager.

---

### Step 3.12 — Inventory Management ⭐

**Routes:**
- `_authenticated/inventory/index.tsx` — Stock levels list
- `_authenticated/inventory/$inventoryId/movements.tsx` — Movement history

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/inventory` | List (filter: branch_id, low_stock_only, menu_item_id) |
| GET | `/api/v1/inventory/low-stock` | Low stock alerts |
| POST | `/api/v1/inventory/adjust` | Manual stock adjustment |
| PATCH | `/api/v1/inventory/:id/threshold` | Update low stock threshold |
| GET | `/api/v1/inventory/:id/movements` | Movement history |

**List page features:**
- **Tabs:** "All Stock" / "Low Stock Alerts" (uses `/low-stock` endpoint, shows warning icon)
- DataTable columns: Menu Item Name, Branch, Stock Quantity, Low Stock Threshold, Stock Status (computed `Badge`: green=OK, red=LOW, showing when `is_low_stock=true`), Actions
- Filter bar: Branch (combobox), Menu Item (combobox), Low Stock Only (checkbox)

**Stock adjustment dialog:**
- Opens from "Adjust Stock" button on a row
- Movement Type (select: "adjustment", "waste", "transfer")
- Quantity Change (number — positive for additions, negative for removals)
- Reason (textarea, optional but recommended)
- Shows current stock level and what it will be after adjustment
- Mutation invalidates both `inventory` and `movements` queries

**Threshold edit:**
- Inline edit or small dialog to update `low_stock_threshold`
- Number input (≥ 0)

**Movement history page (`$inventoryId/movements.tsx`):**
- Breadcrumb shows: Inventory > {Menu Item Name} > Movement History
- DataTable columns: Date, Type (`Badge`: purchase_in=green, sale_out=red, adjustment=blue, waste=orange, transfer=purple), Quantity Change (+/-), Before, After, User, Reason
- Paginated

**Access:** Admin + Manager.

---

### Step 3.13 — Supplier Management

**Routes:**
- `_authenticated/suppliers/index.tsx` — Supplier list (with dialog for create/edit)

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/suppliers` | List all |
| GET | `/api/v1/suppliers/:id` | Get one |
| POST | `/api/v1/suppliers` | Create |
| PUT | `/api/v1/suppliers/:id` | Update |

**Page features:**
- DataTable columns: Name, Contact Person, Phone, Email, Address, Status, Actions
- Simple entity — create/edit via dialog (no dedicated page needed)

**Form fields:**
- Name (required, max 100)
- Contact Person (max 100)
- Phone
- Email (email validation)
- Address (textarea)
- Is Active (switch, edit only)

**Access:** Admin + Manager.

---

### Step 3.14 — Purchase Order Management

**Routes:**
- `_authenticated/purchases/index.tsx` — PO list
- `_authenticated/purchases/create.tsx` — Create PO with line items
- `_authenticated/purchases/$purchaseId.tsx` — PO detail

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/purchases` | List (filter: supplier_id, branch_id, status, dates) |
| GET | `/api/v1/purchases/:id` | Get with items |
| POST | `/api/v1/purchases` | Create PO with items |
| POST | `/api/v1/purchases/:id/receive` | Mark received (auto-adds to inventory) |
| PATCH | `/api/v1/purchases/:id/cancel` | Cancel PO |

**List page features:**
- DataTable columns: PO Number, Supplier, Branch, Ordered By, Subtotal, Tax, Total (formatted currency), Status (`StatusBadge`: ordered=blue, partial_received=yellow, received=green, cancelled=red), Created At, Actions
- Filter bar: Supplier (combobox), Branch (combobox), Status (select), Date Range

**Create page (multi-section form):**

*Header section:*
- Supplier (combobox, required)
- Branch (combobox, required)
- Notes (textarea)

*Line items section (dynamic rows):*
- Each row: Menu Item (combobox, required), Quantity (number, required, > 0), Cost Per Unit (number, required, > 0), Subtotal (auto-computed: qty × cost, read-only)
- "Add Item" button adds a new row
- "Remove" button per row (with trash icon)
- **Totals footer:** Subtotal (sum of all row subtotals), Tax Amount (auto or manual), Total

**Detail page (`$purchaseId.tsx`):**
- PO header card: number, supplier, branch, ordered by, received by, status, dates, notes
- Items table: Menu Item, Quantity, Cost Per Unit, Subtotal
- **Action buttons (status-dependent):**
  - Status "ordered" → "Mark Received" button (POST `/receive`) + "Cancel" button (PATCH `/cancel`)
  - Status "received" or "cancelled" → no action buttons (read-only)
- "Mark Received" triggers inventory update automatically on the backend

**Access:** Admin + Manager.

---

### Step 3.15 — Tax Configuration

**Routes:**
- `_authenticated/settings/tax.tsx` — Tax config list

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/tax-configs` | List all (filter: branch_id) |
| POST | `/api/v1/tax-configs` | Create |
| PUT | `/api/v1/tax-configs/:id` | Update |

**Page features:**
- DataTable columns: Branch Name, Tax Name, Rate (%), Is Inclusive (`Badge`), Status, Actions
- Filter by branch
- Create/edit via dialog

**Form fields:**
- Branch (combobox, required)
- Name (required, max 50 — e.g., "PPN", "Service Tax")
- Rate (number, percentage format, required, > 0)
- Is Inclusive (switch — whether tax is included in displayed price)
- Is Active (switch, edit only)

**Access:** Admin + Manager.

---

## 5. Phase 4 — Read-Only Views

### Step 4.1 — Order Viewer

**Routes:**
- `_authenticated/orders/index.tsx` — Order list
- `_authenticated/orders/$orderId.tsx` — Order detail (full nested data)

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/orders` | List with extensive filters |
| GET | `/api/v1/orders/:id` | Full detail (items, modifiers, payments, discounts) |

**List page features:**
- DataTable columns: Order Number, Branch, Table, Cashier, Customer, Order Type (`Badge`: dine_in/takeaway), Status (`StatusBadge`), Payment Status (`StatusBadge`), Total (currency), Created At, Actions (View Detail)
- **Comprehensive filter panel** (collapsible):
  - Branch (combobox)
  - Order Status (multi-select: pending, confirmed, preparing, ready, served, completed, cancelled)
  - Payment Status (select: unpaid, partial, paid, refunded)
  - Order Type (select: dine_in, takeaway)
  - Cashier (combobox, loads from users)
  - Customer (combobox)
  - Shift (combobox)
  - Table (combobox)
  - Date Range (from/to)
  - Search (by order_number)

**Detail page (`$orderId.tsx`):**

*Order summary card:*
- Order Number, Branch, Table, Cashier, Customer, Shift
- Order Type, Status, Payment Status
- Guest Count
- Financials: Subtotal, Discount Amount, Tax Amount, Service Charge, Rounding, **Total** (large text)
- Timestamps: Created, Updated

*Order items table:*
| Column | Content |
|--------|---------|
| Item Name | Menu item name (snapshot) |
| Quantity | × count |
| Unit Price | Snapshot price |
| Subtotal | qty × price |
| Notes | Special instructions |
| Modifiers | Nested list: modifier name + extra price |

*Payments section:*
- Table: Payment Method, Amount, Status, Reference Number, Paid At

*Discounts section:*
- Table: Discount Name, Type, Value, Applied Amount

**All read-only — no mutations.** No edit/delete buttons.

**Access:** Admin + Manager.

---

### Step 4.2 — Audit Log Viewer

**Routes:**
- `_authenticated/audit-logs/index.tsx` — Audit log list

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/audit-logs` | List (filter: user_id, branch_id, action, table_name, record_id, dates) |
| GET | `/api/v1/audit-logs/record/:table/:recordId` | History for a specific record |

**Page features:**
- DataTable columns: Timestamp, User Name, Branch, Action (`Badge` color-coded by type), Table Name, Record ID, Description, IP Address
- Filter bar: User (combobox), Branch (combobox), Action (select from enum: INSERT, UPDATE, DELETE, LOGIN, LOGOUT, VOID, REFUND, etc.), Table Name (select), Date Range
- **Expandable rows** — clicking a row expands to show:
  - `old_values` vs `new_values` as a **side-by-side JSON diff** (changed fields highlighted)
  - User Agent, Session ID

**Action badge colors:**
| Action | Color |
|--------|-------|
| INSERT | green |
| UPDATE | blue |
| DELETE | red |
| LOGIN / LOGOUT | grey |
| VOID / REFUND | orange |
| STATUS_CHANGE | purple |
| OVERRIDE | yellow |

**Access:** Admin + Manager.

---

## 6. Phase 5 — Dashboard & Reports

### Step 5.1 — Dashboard Home

**Route:** `_authenticated/dashboard/index.tsx`

**API endpoint consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/statistics/dashboard` | Dashboard KPIs |

**What it does:**
- This is the **landing page** after login — the first screen users see
- Grid layout of `StatCard` components showing today's key metrics
- Auto-refreshes every 60 seconds via TanStack Query `refetchInterval: 60000`

**KPI cards (2×3 grid on desktop, 1 column on mobile):**

| Card | Value | Trend | Icon |
|------|-------|-------|------|
| Today's Revenue | `today_revenue` (formatted currency) | vs `yesterday_revenue` (% change, green ↑ / red ↓) | `DollarSign` |
| Today's Orders | `today_orders` (count) | vs `yesterday_orders` (% change) | `ShoppingCart` |
| Active Tables | `active_tables` / total | — | `LayoutGrid` |
| Open Shifts | `open_shifts` (count) | — | `Clock` |
| Low Stock Alerts | `low_stock_items` (count) | Red if > 0, links to inventory/low-stock | `AlertTriangle` |
| Pending Reservations | `pending_reservations` (count) | Links to reservations filtered by status=confirmed | `Calendar` |

**Clickable:** Each card is a link to its respective page (e.g., clicking "Low Stock Alerts" navigates to `/inventory?low_stock_only=true`).

**Access:** All authenticated staff (admin/manager see full data; other roles see limited).

---

### Step 5.2 — Sales Report

**Route:** `_authenticated/reports/sales.tsx`

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/statistics/sales` | Sales over time (group_by=day\|week\|month) |
| GET | `/api/v1/statistics/revenue-by-category` | Revenue breakdown by menu category |
| GET | `/api/v1/statistics/top-items` | Top-selling items |

**Page layout (3 sections):**

**Section 1 — Sales Over Time:**
- Filter controls: Branch (combobox), Date Range (from/to), Group By (tabs: Day / Week / Month)
- **Area chart** (recharts via shadcn `chart`):
  - X-axis: Period (dates/weeks/months)
  - Y-axis left: Revenue (line/area, blue)
  - Y-axis right: Order Count (bar, grey)
  - Tooltip shows: Period, Order Count, Total Revenue, Discount Total, Tax Total, Net Revenue
- Summary row below chart: Total Orders, Total Revenue, Average Order Value

**Section 2 — Revenue by Category:**
- **Donut/Pie chart** showing revenue distribution across categories
- Color-coded segments with legend
- Adjacent table: Category Name, Revenue (currency), Items Sold, Percentage of Total
- Sortable by revenue or items sold

**Section 3 — Top Selling Items:**
- Configurable limit: Top 10 / 20 / 50 (radio or select)
- **Horizontal bar chart** — ranked by total revenue or quantity sold (toggle)
- Adjacent table: Rank, Item Name, Quantity Sold, Revenue, Order Count

**Access:** Admin + Manager.

---

### Step 5.3 — Financial Reports (Income & Expense / Cash Flow)

**Route:** `_authenticated/reports/cash-flow.tsx`

**API endpoints consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/statistics/cash-flow` | Cash flow over time (income per day) |
| GET | `/api/v1/statistics/payment-methods` | Payment method breakdown |

**Page layout (3 sections):**

**Section 1 — Cash Flow Over Time:**
- Filter: Branch, Date Range
- **Stacked bar chart:**
  - X-axis: Date
  - Stacked bars: Cash In (green — from `total_revenue`), Cash Out (red — from purchase costs, if available)
  - Net flow line overlay
- Below chart: Summary table per day: Date, Cash Sales, Card Sales, E-Wallet Sales, Total In, Total Out, Net

**Section 2 — Payment Method Breakdown:**
- Filter: Branch, Date Range
- **Pie chart** showing distribution: Cash, Debit Card, Credit Card, E-Wallet, QRIS, Bank Transfer
- Adjacent table: Payment Method, Transaction Count, Total Amount, Percentage
- Useful for understanding which payment methods customers prefer

**Section 3 — Income vs Expense Summary:**
- Date range summary cards:
  - Total Income (sum of all order revenue)
  - Total Expense (sum of all purchase order totals)
  - Net Profit (income - expense)
  - Profit Margin (%)
- Monthly comparison table if date range spans multiple months

**Access:** Admin + Manager.

---

### Step 5.4 — Shift Financial Report

**Route:** `_authenticated/reports/shifts.tsx` (or accessed from shift detail)

**API endpoint consumed:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/statistics/shifts/:id/report` | Detailed shift financial report |

**Page features:**
- Shift selector: Browse shifts from a list or enter shift ID
- **Report card layout:**

| Section | Content |
|---------|---------|
| Shift Info | User, Device, Branch, Opened/Closed At, Duration |
| Cash Drawer | Opening Cash, Closing Cash, Expected Cash, **Difference** (highlighted red if negative, green if zero/positive) |
| Order Summary | Total Orders, Dine-In Count, Takeaway Count |
| Revenue | Total Revenue, Subtotal, Discounts, Tax, Service Charge |
| Payment Breakdown | **Pie chart** — Cash vs Card vs E-Wallet. Table: method, count, amount, percentage |

**Access:** All staff for their own shifts; Admin + Manager for all shifts.

---

## 7. Phase 6 — Polish & Production Readiness

### Step 6.1 — Error Handling & Toast Notifications

**What it does:**
- Wire `sonner` (toast library) into all mutations globally:
  - **Success toasts:** "User created successfully", "Stock adjusted", "Purchase order received"
  - **Error toasts:** Show API error message from the `ApiError.message` field
- Global API client interceptor: on **401 Unauthorized**, automatically call `supabase.auth.signOut()` and redirect to `/login`
- React Error Boundary wrapping the app for unexpected runtime crashes
- Sentry integration is already configured — ensure it captures unhandled errors

**Toast pattern in mutation hooks:**
```ts
useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    toast.success('User created successfully')
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
  },
  onError: (error: ApiError) => {
    toast.error(error.message || 'Failed to create user')
  }
})
```

---

### Step 6.2 — Loading States & Optimistic Updates

**Loading states:**
- Every list page shows `DataTableSkeleton` (rows of `Skeleton` components matching column layout) when `isLoading` is true
- Every detail/form page shows `Skeleton` blocks matching the card/form layout
- Route transitions show a thin progress bar at the top (or loading spinner)

**Optimistic updates (for toggle actions):**
- Menu item availability toggle: instantly flip the switch in the UI, revert on error
- Device status toggle: same pattern
- User active/deactivate: same pattern
- Uses TanStack Query's `onMutate` → `onError` → `onSettled` pattern for optimistic cache updates

---

### Step 6.3 — Responsive Design

**Breakpoint strategy:**
- Mobile (< 768px): Single column layout, sidebar collapses to `Sheet` drawer, DataTables use horizontal scroll, forms stack vertically
- Tablet (768px - 1024px): Sidebar collapsed by default (can toggle), 2-column dashboard grid
- Desktop (> 1024px): Full sidebar visible, 3-column dashboard grid, side-by-side form sections

**Key responsive patterns:**
- Sidebar: Uses shadcn `Sidebar` component with `collapsible="icon"` mode on tablet, sheet mode on mobile
- DataTable: Wraps in `ScrollArea` with horizontal scroll; hides low-priority columns on small screens via responsive column visibility
- Forms: Use CSS grid `grid-cols-1 md:grid-cols-2` for two-column layouts on desktop
- Dashboard stat cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` responsive grid
- Charts: Responsive container with `ResponsiveContainer` from recharts

---

## 8. Full Route Map

```
src/routes/
├── __root.tsx                              # Root layout (AuthProvider, QueryProvider, CSS)
├── login.tsx                               # Public login page
├── _authenticated.tsx                      # Protected layout (sidebar + top bar + guards)
│   ├── dashboard/
│   │   └── index.tsx                       # Dashboard home (KPI cards)
│   ├── orders/
│   │   ├── index.tsx                       # Order list (read-only)
│   │   └── $orderId.tsx                    # Order detail (read-only)
│   ├── shifts/
│   │   ├── index.tsx                       # Shift list + open/close
│   │   └── $shiftId.tsx                    # Shift detail + summary
│   ├── tables/
│   │   └── index.tsx                       # Floor areas + tables (visual grid)
│   ├── menu-items/
│   │   ├── index.tsx                       # Product list
│   │   ├── create.tsx                      # Create product (tabbed form)
│   │   └── $itemId.tsx                     # Edit product (tabbed form)
│   ├── categories/
│   │   └── index.tsx                       # Category tree view
│   ├── modifiers/
│   │   └── index.tsx                       # Modifier groups + options
│   ├── customers/
│   │   ├── index.tsx                       # Customer list
│   │   └── $customerId.tsx                 # Customer detail
│   ├── reservations/
│   │   └── index.tsx                       # Reservations (list + calendar)
│   ├── inventory/
│   │   ├── index.tsx                       # Stock levels
│   │   └── $inventoryId/
│   │       └── movements.tsx               # Movement history
│   ├── suppliers/
│   │   └── index.tsx                       # Supplier list
│   ├── purchases/
│   │   ├── index.tsx                       # PO list
│   │   ├── create.tsx                      # Create PO with line items
│   │   └── $purchaseId.tsx                 # PO detail + receive/cancel
│   ├── discounts/
│   │   └── index.tsx                       # Discount list
│   ├── users/
│   │   ├── index.tsx                       # User list
│   │   ├── create.tsx                      # Create user
│   │   └── $userId.tsx                     # Edit user
│   ├── branches/
│   │   └── index.tsx                       # Branch list
│   ├── devices/
│   │   └── index.tsx                       # Device list + register
│   ├── reports/
│   │   ├── sales.tsx                       # Sales report + charts
│   │   ├── cash-flow.tsx                   # Cash flow + payment methods
│   │   └── shifts.tsx                      # Shift financial reports
│   ├── settings/
│   │   └── tax.tsx                         # Tax configuration
│   └── audit-logs/
│       └── index.tsx                       # Audit log viewer
```

**Total:** ~35 route files covering 17 domains and 93 backend endpoints.

---

## 9. Further Considerations

### Multi-Branch Pricing
The API reference does not show a dedicated multi-branch pricing endpoint. The `menu_items` table has a single `price` field. For per-branch pricing, either:
1. The backend team adds a `menu_item_branch_prices` table + endpoints
2. Or we handle it by creating branch-specific menu items (less ideal)

**Recommendation:** Discuss with backend team — propose a `menu_item_branch_prices` junction table with endpoints `GET/PUT /api/v1/menu-items/:id/branch-prices`.

### Image Uploads
The `image_url` field on menu items implies image hosting. **Recommendation:** Use **Supabase Storage** — upload via `supabase.storage.from('menu-images').upload()`, get the public URL, and save it to the `image_url` field via the API.

### Real-Time Updates
The dashboard currently uses `refetchInterval` polling (every 60s). For true real-time (new orders, table status changes), consider **Supabase Realtime** subscriptions in a future phase. For the CMS dashboard, polling is sufficient — real-time is more critical for the POS app itself.

### Demo Data Cleanup
Before starting Phase 1 implementation, delete all demo files:
- `src/routes/demo/` (entire directory)
- `src/data/demo-*`
- `src/hooks/demo.*`
- `src/components/demo.*`
- Clean up `src/components/Header.tsx` navigation links

### Variants (Size, Color)
The current schema handles variants through **modifier groups** (e.g., a "Size" modifier group with Small/Medium/Large modifiers, each with an `extra_price`). This is already covered in Step 3.8 — no separate variant system is needed unless the backend adds a dedicated variants table.

### Environment Variables Summary
```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8080
VITE_SENTRY_DSN=your-sentry-dsn (optional)
```
