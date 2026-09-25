# Order Receipt PDF Export — Design

Date: 2026-09-24
Status: Approved (approach A)
Feature: Export an order as an 80mm thermal-style PDF receipt from the order detail page.

## Goal

From the CMS order detail page (`/_authenticated/orders/$orderId`), a cashier/admin can click
**Receipt PDF** and download a printable 80mm-wide receipt PDF for that order, generated entirely
in the browser from the already-loaded order data.

## Decisions

| Question | Decision |
|---|---|
| Receipt style | 80mm thermal slip, dynamic height (fits content) |
| Generation | Client-side `jspdf`, direct `.pdf` download |
| Branding | `public/logo.png` centered at top + branch name; Indonesian thank-you footer |
| Code placement | Library module + button in the page (approach A) |

## Context that shapes the design

- Orders are created by the POS app and synced via PowerSync; the CMS only reads them
  (`documentation/API_REFERENCE.md:2582`).
- For weight-based items the POS stores the **weighed line total** in `unit_price` (not a per-unit
  price), with `quantity = 1` and the real weight in `weight`.
  - Displayed quantity = `weight` + `unit_of_measure`.
  - Displayed per-unit price = `unit_price / weight`.
  - `subtotal`, order totals, `payments`, and `discounts` are stored correctly.
- The order detail table already implements this logic inline; it will be extracted so the table
  and the PDF cannot drift apart.

## Architecture

Three touched/added units, each with one responsibility:

### 1. `src/lib/order-items.ts` (new)

Pure helpers shared by the order table and the receipt.

```ts
export function isWeightedItem(item: OrderItem): boolean        // weight != null && weight > 0
export function getItemQuantity(item: OrderItem): number        // weight if weighted, else quantity
export function getItemUnitPrice(item: OrderItem): number       // weighted: unit_price / weight, else unit_price
```

No formatting, no I/O. `$orderId.tsx` is updated to use these helpers (behavior unchanged for
non-weighted rows; weighted rows keep the current display).

### 2. `src/lib/order-receipt.ts` (new)

```ts
export async function buildOrderReceipt(order: Order): Promise<jsPDF>
export async function downloadOrderReceipt(order: Order): Promise<void>
```

- `buildOrderReceipt` lays out the receipt and returns the document (testable seam).
- `downloadOrderReceipt` calls it, then `doc.save('receipt-{order_number}.pdf')`.
- `jspdf` is imported **dynamically** inside these functions so SSR and the initial bundle are
  unaffected.
- The logo is fetched from `/logo.png`, drawn to a canvas at ~400px width to preserve aspect ratio,
  and embedded as a data URL so PDFs stay small (source PNG is ~2.1MB).

### 3. `src/routes/_authenticated/orders/$orderId.tsx` (edited)

- Header actions gain a **Receipt PDF** button (`FileDownIcon`, outline variant), always enabled,
  disabled with a loading label while generating.
- On success: nothing else; on failure: `toast.error('Failed to generate receipt')`.
- Table cells switch to the shared helpers from `order-items.ts`.

## Receipt layout

Page: `jspdf` with `unit: 'mm'`, custom format `[80, computedHeight]`. Margins 8mm; content width
64mm. Font: built-in Helvetica (`normal`/`bold`/`italic`), 7–9pt. Amounts right-aligned; long item
names wrapped with `splitTextToSize`.

```
[ logo.png centered, ~20mm wide, aspect preserved ]
[ branch_name centered, bold ]
--------------------------------------------------
Order#   ORD-...
Date     <localized created_at>
Type     Dine In | Takeaway [ · Table X]
Cashier  <cashier_name>          Customer <name> (N guests)
--------------------------------------------------
<item name>
  <qty label> x <unit price>              <subtotal>
  + <modifier name> (+extra_price)        <- indented, only when present
  <notes>                                 <- italic, when present
[VOID] <item name>                        <- voided rows, marked
--------------------------------------------------
Subtotal                                     ...
Discount                                    -...      <- only when > 0
Tax                                          ...
Service Charge                               ...
Rounding                                     ...      <- only when != 0
TOTAL                                        ...      <- bold, larger
--------------------------------------------------
<method>                                     ...      <- per payment, when present
Change                                       ...
--------------------------------------------------
          Terima kasih atas kunjungan Anda
```

Rules:

- Weighted rows: qty label from `getItemQuantity` + unit; per-unit price from `getItemUnitPrice`.
- Voided rows: rendered with a `[VOID]` prefix.
- Totals are read from `order` fields verbatim — **never recomputed**.
- Payments section omitted when `payments` is empty; each payment shows method, amount, change.
- Receipt labels are English; footer is Indonesian. All strings live in one constants block in
  `order-receipt.ts` so language can change in one place.
- Amounts use `Intl.NumberFormat('id-ID', { currency: 'IDR' })` (same shape as the page's
  `formatIDR`); non-breaking spaces are normalized to regular spaces before being drawn, since
  jsPDF's built-in fonts only cover WinAnsi.

## Height computation

Build an ordered list of render blocks, each with a known line height:

1. logo height (from image aspect) + branch name
2. info rows (6 rows max)
3. per item: wrapped name lines + one price line + modifier/note lines
4. totals rows
5. payments rows
6. footer

Sum + margins → `pageHeight`; then create the document and paint. No pagination (a receipt is
expected to be a single continuous slip).

## Error handling

| Failure | Behavior |
|---|---|
| Order is undefined | Button is not rendered (page already guards) |
| Logo fails to load | Receipt still renders, text header only; no user-facing error |
| jsPDF import or render throws | `toast.error('Failed to generate receipt')` |

## Dependencies

- Add `jspdf` (runtime dependency). No other additions.

## Out of scope

- Server-side PDF generation or storage.
- Printing the receipt directly from the POS app.
- Receipt generation from the orders list (the library module makes it a one-line addition later).
- A4/invoice layout.

## Verification

1. `npx tsc --noEmit` — no new errors.
2. `npx eslint` on changed/added files — no new errors.
3. Manual on `orders/b963d2ef-7783-4ebc-9391-d73649a815fc`:
   - PDF page is 80mm wide, one continuous page.
   - Weighted rows show `4 ons x Rp 28.000` / `3,2 ons x Rp 45.000`.
   - Subtotal/Total match the Financials card; discount/tax/service rows shown correctly.
   - Void item (if any) marked `[VOID]`; modifiers and notes present.
   - Logo renders crisp; file downloads as `receipt-<order_number>.pdf`.
4. Regression: order detail table renders identically before/after the helper extraction.
