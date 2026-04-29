# Financial Data Guide for UI Display

This document explains how sales, revenue, cash flow, and shift reports are calculated so the frontend can display them correctly.

---

## 1. Data Sources (Four Tables)

| Source | What it tracks | Used for |
|---|---|---|
| **orders** (`status = 'completed'`) | Customer orders with subtotal, tax, discounts, total | Revenue, sales, tax reporting |
| **payments** (joined to orders) | How the customer paid and how much | Cash in, change given, non-cash totals |
| **shift_cash_transactions** | Manual cash movements during a shift: deposits (`cash_in`) and withdrawals (`cash_out`) | Owner withdrawals, petty cash, tips, change refills, staff advances |
| **purchases** (`status = 'received'`) | Purchase orders received from suppliers | PO expenses |

---

## 2. Key Formula: How Cash Actually Moves

```
┌─────────────────────────────────────────────────────────────────┐
│                        CASH DRAWER                              │
│                                                                 │
│  START: Opening Cash (entered when shift opens)                 │
│                                                                 │
│    + Customer cash payments received  (order_cash_in)          │
│    - Change given back to customers  (order_cash_out)          │
│    + Manual cash deposits            (shift_cash_in)           │
│    - Manual cash withdrawals         (shift_cash_out)          │
│                                                                 │
│    = EXPECTED CASH in drawer                                    │
│                                                                 │
│  ACTUAL: Closing Cash (entered when shift closes)              │
│                                                                 │
│  Cash Difference = Closing Cash − Expected Cash                 │
│    (Positive = over/surplus, Negative = short/under)            │
└─────────────────────────────────────────────────────────────────┘
```

**PO Expenses** (purchase orders) are tracked separately — they affect cash flow but are **not** part of the cash drawer equation. They represent money the business spent on supplies.

---

## 3. Dashboard Stats (`GET /api/v1/statistics/dashboard`)

| Field | What it means |
|---|---|
| `today_revenue` | SUM(total) of completed orders today |
| `yesterday_revenue` | Same, for yesterday |
| `revenue_change` | `((today - yesterday) / yesterday) * 100` (percentage) |
| `today_orders` | Count of completed orders today |
| `avg_order_value` | `today_revenue / today_orders` |
| `today_expenses` | Sum of today's `shift_cash_out` + received POs |
| `today_net_cash` | `today_revenue − today_expenses` |

> **Display tip:** `today_net_cash` is a quick health check. If deeply negative despite good revenue, check `shift_cash_out` — likely a large owner withdrawal.

---

## 4. Sales Report (`GET /api/v1/statistics/sales`)

Grouped by `day`, `week`, or `month`.

| Field | Formula | Includes tax? |
|---|---|---|
| `total_revenue` | SUM(`order.total`) | ✅ Yes |
| `total_orders` | COUNT(completed orders) | — |
| `total_tax` | SUM(`order.tax_amount`) | — |
| `total_discount` | SUM(`order.discount_amount`) | — |
| `net_revenue` | `total_revenue − total_discount` | ✅ Yes |
| `total_expenses` | `shift_cash_out + PO expenses` | — |
| `net_profit` | `net_revenue − total_expenses` | ✅ Yes |

> **Important:** Tax is included in `total_revenue`, `net_revenue`, and `net_profit`. The `total_tax` field is a separate informational field — do NOT subtract it again.

---

## 5. Daily Cash Flow (`GET /api/v1/statistics/cash-flow`)

This is the **most complete** daily cash picture.

| Field | Source | What it is |
|---|---|---|
| `cash_in` | `payments` WHERE `method = 'cash'` | Cash customers paid for orders |
| `cash_out` | `payments` WHERE `method = 'cash'` (change) | Change returned to customers |
| `shift_cash_in` | `shift_cash_transactions` type `cash_in` | Manual deposits into drawer |
| `shift_cash_out` | `shift_cash_transactions` type `cash_out` | Manual withdrawals from drawer |
| `po_expenses` | `purchases` status `received` | Supplier purchase costs |
| `net_cash` | `cash_in − cash_out + shift_cash_in − shift_cash_out − po_expenses` | **Daily net cash movement** |
| `non_cash_in` | `payments` WHERE `method != 'cash'` | Card, e-wallet, QRIS, bank transfer |
| `total_revenue` | `SUM(amount − change_amount)` from all payments | Gross revenue received |
| `total_expenses` | `shift_cash_out + po_expenses` | Total daily expenses |

> **Display tip for UI:**
> - Show `cash_in` and `non_cash_in` as a stacked bar or pie to show payment mix
> - Show `net_cash` prominently — red if negative, green if positive
> - If `shift_cash_out` is large, flag it as "manual withdrawal" with the reason breakdown (use expense breakdown endpoint)

---

## 6. Shift Report (`GET /api/v1/statistics/shifts/:id`)

This is the **per-shift** detailed financial report. It now matches the daily cash flow formula.

### Revenue Section

| Field | Source |
|---|---|
| `gross_revenue` | SUM(`total`) of completed orders in this shift |
| `total_discounts` | SUM(`discount_amount`) |
| `total_tax` | SUM(`tax_amount`) |
| `total_service_charge` | SUM(`service_charge`) |
| `net_revenue` | `gross_revenue − total_discounts` |

### Cash Flow Section (Updated — now includes order payments)

| Field | What it is |
|---|---|
| `total_order_cash_in` | **NEW** — Cash payment amounts from completed orders (`payment_method = 'cash'`) |
| `total_order_cash_out` | **NEW** — Change given for those cash payments |
| `total_cash_in` | Manual cash deposits (`shift_cash_transactions` type `cash_in`) |
| `total_cash_out` | Manual cash withdrawals (`shift_cash_transactions` type `cash_out`) |
| `total_po_expenses` | Purchase orders received during the shift window |
| `net_cash_movement` | **`total_order_cash_in − total_order_cash_out + total_cash_in − total_cash_out − total_po_expenses`** |

### Shift Balance

| Field | Formula |
|---|---|
| `expected_cash` | `opening_cash + total_order_cash_in − total_order_cash_out + total_cash_in − total_cash_out` |
| `cash_difference` | `closing_cash − expected_cash` |

---

## 7. Understanding the Numbers: Worked Example

Consider this shift:

```
Opening cash:     0
Cash payments:    4,645,000   (from 7 cash orders)
Change given:       887,000
Manual cash in:          0
Manual cash out: 37,000,000   (staff_advance: 36M, owner_withdrawal: 1M)
PO expenses:      2,440,000   (4 purchase orders)
Closing cash:             0
```

**Expected cash in drawer:**
```
0 + 4,645,000 − 887,000 + 0 − 37,000,000 = −33,242,000
```

**Cash difference:**
```
0 − (−33,242,000) = +33,242,000
```
The drawer isn't actually negative — `closing_cash = 0` was entered but the real cash balance was likely ~33M positive if the 37M withdrawal didn't actually leave the drawer, or ~0 if it did. The `cash_difference` tells you the expected vs actual mismatch.

**Net cash movement (shift report):**
```
4,645,000 − 887,000 + 0 − 37,000,000 − 2,440,000 = −35,682,000
```

**Net cash movement (daily cash flow — should match):**
```
4,645,000 − 887,000 + 0 − 37,000,000 − 2,440,000 = −35,682,000 ✓
```

---

## 8. Payment Breakdown

Available in both the shift report and the `GET /api/v1/statistics/payment-methods` endpoint.

| Payment Method | Description |
|---|---|
| `cash` | Physical cash |
| `debit_card` | Debit card |
| `credit_card` | Credit card |
| `ewallet` | E-wallet (GoPay, OVO, etc.) |
| `qris` | QRIS code |
| `bank_transfer` | Bank transfer |

Each entry returns `count`, `total_amount`, and `percentage` of total payments.

---

## 9. Expense Breakdown (`GET /api/v1/statistics/expense-breakdown`)

Shows expenses grouped by reason. Sources:
- **shift_cash_transactions** — categorized by `reason` field (`owner_withdrawal`, `supply_purchase`, `staff_advance`, `petty_cash`, `tip_out`, etc.)
- **purchases** — labeled as reason `purchase_order`

Returns `reason`, `total_amount`, `count`, `percentage` of total expenses.

---

## 10. What the UI Should Show

### Dashboard
- Revenue card: today's revenue + change% from yesterday
- Expenses card: today's expenses  
- Net cash card: today's net cash
- Active tables, open shifts, low stock alerts

### Sales Page
- Bar/line chart of `net_revenue` over time (day/week/month)
- Revenue vs expenses overlay
- `net_profit` trend line
- Separate tax report card (just `total_tax`)
- Category breakdown pie/donut
- Top selling items list

### Cash Flow Page
- Daily `net_cash` bar chart (green = positive, red = negative)
- Payment method breakdown (stacked — cash vs non-cash)
- `shift_cash_out` detail (link to expense breakdown)
- PO expense summary

### Shift Report (Modal or Page)
- Header: shift ID, cashier name, branch, status badge, time range
- Revenue card: `net_revenue` with `gross_revenue`, discounts, tax, service charge as subtotals
- **Cash flow card** (reordered for clarity):
  ```
  Cash from orders:       +4,645,000
  Change given:            −887,000
  ────────────────────────────────
  Net order cash:         +3,758,000
  Manual cash in:                +0
  Manual cash out:      −37,000,000
  PO expenses:           −2,440,000
  ────────────────────────────────
  NET CASH MOVEMENT:    −35,682,000
  ```
- Balance card: opening, expected, closing, difference
- Payment methods donut/pie
- Cash transactions table (each manual in/out)
- PO expenses table

---

## 11. Endpoints Summary

| Endpoint | Use for |
|---|---|
| `GET /statistics/dashboard` | Home dashboard widgets |
| `GET /statistics/sales` | Sales charts (day/week/month) |
| `GET /statistics/revenue-by-category` | Category breakdown pie |
| `GET /statistics/top-items` | Top selling items list |
| `GET /statistics/payment-methods` | Payment method breakdown |
| `GET /statistics/expense-breakdown` | Expense reason breakdown |
| `GET /statistics/cash-flow` | Daily cash flow chart |
| `GET /statistics/shifts/:id` | Per-shift detailed report |
| `GET /shifts/:id/summary` | Simplified shift summary |
