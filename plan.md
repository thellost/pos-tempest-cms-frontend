# Mobile-Friendly Coding Plan (Step-by-Step Only)

## 1) Shared foundations (code first)

### Step 1.1 — Add mobile/touch utility styles
Update shared styles to include reusable utilities for:
- minimum tap size (`44x44`),
- edge-safe horizontal padding,
- mobile-friendly spacing,
- bottom safe-area padding.

Target file:
- `src/styles.css`

### Step 1.2 — Add a shared mobile breakpoint helper
Use existing responsive hook/util pattern to expose a consistent mobile check (`< md`).

Target area:
- `src/hooks/use-mobile.ts` (or shared responsive utility)

---

## 2) Data table architecture changes

### Step 2.1 — Create mobile row/card renderer component
Create a reusable component that renders each row as a card/list item on mobile.

Requirements:
- shows primary row identity,
- shows selected key fields,
- supports badge/status,
- includes a touch-safe `More` trigger.

Suggested target:
- new component under `src/components/data-table/` (mobile card renderer)

### Step 2.2 — Add responsive table wrapper
Create a wrapper that decides:
- desktop/tablet: render existing table,
- mobile: render card/list rows.

Requirements:
- same dataset and state,
- no duplicate business logic,
- no behavior drift between views.

Targets:
- `src/components/data-table/data-table.tsx`
- supporting component(s) under `src/components/data-table/`

### Step 2.3 — Keep table state unified
Ensure sorting/filtering/search/pagination state is shared by both render modes.

Targets:
- `src/components/data-table/data-table.tsx`
- `src/components/data-table/data-table-toolbar.tsx`

---

## 3) Row actions refactor (critical mobile pain)

### Step 3.1 — Standardize row action trigger
Replace tiny/edge-clipped action icons with a standardized touch-safe trigger (`More`/kebab with larger hit area).

Targets:
- `src/components/data-table/data-table-row-actions.tsx`
- module-level `columns.tsx` action cells

### Step 3.2 — Add mobile action sheet/drawer
On mobile, open row actions in a stable bottom sheet/drawer instead of fragile small popover.

Requirements:
- full-width action items,
- explicit close/cancel action,
- not positioned flush to edge.

Targets:
- `src/components/ui/*` overlay primitives
- `src/components/data-table/data-table-row-actions.tsx`

### Step 3.3 — Fix premature close behavior
Adjust close logic to prevent accidental dismissal on touch interaction.

Handle cases:
- slight finger movement,
- touchstart/touchend outside-click race,
- scrolling inside action list.

Targets:
- shared overlay/menu components in `src/components/ui/*`

### Step 3.4 — Keep destructive actions safe
Ensure `Delete`/destructive actions always route through confirmation UI that is mobile-friendly.

Targets:
- row action handlers in `columns.tsx`
- confirm/dialog components (`src/components/confirm-dialog.tsx` and related)

---

## 4) Module-by-module coding migration

Apply the same coding sequence for each module:

1. Replace direct table-only rendering with responsive table/card rendering.
2. Define mobile card field mapping (show only important fields).
3. Replace row action cell with standardized action trigger.
4. Wire actions into mobile sheet/drawer.
5. Verify no module-specific logic was duplicated.

### Priority 1 modules
- Orders
- Reservations
- Inventory
- Menu Items
- Customers

### Priority 2 modules
- Purchases
- Suppliers
- Shifts
- Devices
- Users

### Priority 3 modules
- Discounts
- Tax Configs
- Branches
- Audit Logs

Primary files:
- `src/components/**/columns.tsx`
- module table/list components in `src/components/*`
- related route pages in `src/routes/_authenticated/*`

---

## 5) Form/layout code updates (mobile interaction consistency)

### Step 5.1 — Convert dense multi-column forms to responsive stacks
At mobile width, forms should collapse into single-column layout.

Targets:
- `src/components/form-fields/*`
- page-level form containers in module components/routes

### Step 5.2 — Fix sticky header/filter overlap
Adjust z-index/offset/padding so sticky elements do not block taps.

Targets:
- `src/components/layout/*`
- `src/components/filter-bar.tsx`
- module page header sections

### Step 5.3 — Normalize button/input touch sizes
Ensure all primary action buttons and icon buttons follow touch-safe sizing.

Targets:
- `src/components/ui/*`
- shared button/input components used across modules

---

## 6) Coding checklist per module

- [ ] Mobile card renderer integrated
- [ ] Shared table state reused (no duplicate logic)
- [ ] Touch-safe row action trigger used
- [ ] Mobile action sheet/drawer wired
- [ ] Popover/menu no longer closes unexpectedly
- [ ] Destructive actions still confirmed
- [ ] Important actions available without horizontal scroll
