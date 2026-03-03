# POS Tempest CMS Backend — Detailed Implementation Plan

> **Stack:** Go 1.25 · Gin Framework · pgx v5 (PostgreSQL) · Supabase (Auth + DB) · PowerSync (auto-sync to POS app)  
> **Architecture:** Clean Architecture — `Handler → Service → Repository`  
> **Module:** `pos-tempest-cms`

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Phase 1 — Core Infrastructure](#2-phase-1--core-infrastructure)
3. [Phase 2 — Domain Models (Exact Schema Mapping)](#3-phase-2--domain-models-exact-schema-mapping)
4. [Phase 3 — Repository Layer](#4-phase-3--repository-layer)
5. [Phase 4 — Service Layer (Business Logic)](#5-phase-4--service-layer-business-logic)
6. [Phase 5 — Handler Layer (HTTP / Gin)](#6-phase-5--handler-layer-http--gin)
7. [Phase 6 — Router & Entry Point](#7-phase-6--router--entry-point)
8. [Phase 7 — Testing & Verification](#8-phase-7--testing--verification)
9. [Full API Endpoint Reference](#9-full-api-endpoint-reference)
10. [Security & Architecture Decisions](#10-security--architecture-decisions)

---

## 1. Project Structure

```
pos-tempest-cms-backend/
├── cmd/
│   └── server/
│       └── main.go                       # Entry point: load config → connect DB → wire deps → run Gin
│
├── internal/
│   ├── config/
│   │   └── config.go                     # Env var loading & validation
│   │
│   ├── database/
│   │   └── database.go                   # pgxpool connection to Supabase PostgreSQL
│   │
│   ├── middleware/
│   │   ├── auth.go                       # Supabase JWT verification → attach AuthUser to gin.Context
│   │   ├── rbac.go                       # RequireRole("admin","manager") etc.
│   │   ├── cors.go                       # CORS config for Gin
│   │   ├── logger.go                     # Gin-compatible structured request logging
│   │   ├── recovery.go                   # Panic recovery returning JSON 500
│   │   └── audit.go                      # Audit log helper (extracts IP, user-agent, writes to DB)
│   │
│   ├── domain/                           # Pure structs: no imports from other internal packages
│   │   ├── enums.go                      # All PostgreSQL enums as Go string constants
│   │   ├── branch.go                     # Branch entity + DTOs
│   │   ├── role.go                       # Role entity
│   │   ├── user.go                       # User entity + DTOs + filters
│   │   ├── device.go                     # Device entity + DTOs
│   │   ├── shift.go                      # Shift entity + DTOs + summary types
│   │   ├── floor_area.go                 # FloorArea entity + DTOs
│   │   ├── table.go                      # Table entity + DTOs + filters
│   │   ├── category.go                   # Category entity + DTOs + tree node
│   │   ├── menu_item.go                  # MenuItem entity + DTOs + filters
│   │   ├── modifier.go                   # ModifierGroup + Modifier + link table + DTOs
│   │   ├── customer.go                   # Customer entity + DTOs + filters
│   │   ├── reservation.go               # Reservation entity + DTOs + filters
│   │   ├── order.go                      # Order + OrderItem + OrderItemModifier + OrderDiscount (read-only)
│   │   ├── payment.go                    # Payment entity (read-only)
│   │   ├── discount.go                   # Discount entity + DTOs
│   │   ├── inventory.go                  # Inventory + InventoryMovement + DTOs
│   │   ├── supplier.go                   # Supplier entity + DTOs
│   │   ├── purchase.go                   # Purchase + PurchaseItem + DTOs
│   │   ├── tax_config.go                 # TaxConfig entity + DTOs
│   │   ├── audit_log.go                  # AuditLog entity + filters (read-only)
│   │   └── statistics.go                 # All statistics / report response types
│   │
│   ├── repository/                       # Raw SQL via pgx, 1 file per entity group
│   │   ├── query_builder.go              # Dynamic WHERE clause builder
│   │   ├── branch_repo.go
│   │   ├── user_repo.go
│   │   ├── device_repo.go
│   │   ├── shift_repo.go
│   │   ├── floor_area_repo.go
│   │   ├── table_repo.go
│   │   ├── category_repo.go
│   │   ├── menu_item_repo.go
│   │   ├── modifier_repo.go
│   │   ├── customer_repo.go
│   │   ├── reservation_repo.go
│   │   ├── order_repo.go
│   │   ├── payment_repo.go
│   │   ├── discount_repo.go
│   │   ├── inventory_repo.go
│   │   ├── supplier_repo.go
│   │   ├── purchase_repo.go
│   │   ├── audit_repo.go
│   │   ├── tax_config_repo.go
│   │   └── statistics_repo.go
│   │
│   ├── service/                          # Business logic, orchestration, validation
│   │   ├── branch_service.go
│   │   ├── user_service.go
│   │   ├── device_service.go
│   │   ├── shift_service.go
│   │   ├── table_service.go
│   │   ├── category_service.go
│   │   ├── menu_service.go
│   │   ├── modifier_service.go
│   │   ├── customer_service.go
│   │   ├── reservation_service.go
│   │   ├── order_service.go
│   │   ├── discount_service.go
│   │   ├── inventory_service.go
│   │   ├── supply_service.go
│   │   ├── audit_service.go
│   │   └── statistics_service.go
│   │
│   └── handler/                          # Gin handlers (thin: parse → call service → respond)
│       ├── branch_handler.go
│       ├── user_handler.go
│       ├── device_handler.go
│       ├── shift_handler.go
│       ├── table_handler.go
│       ├── category_handler.go
│       ├── menu_handler.go
│       ├── modifier_handler.go
│       ├── customer_handler.go
│       ├── reservation_handler.go
│       ├── order_handler.go
│       ├── discount_handler.go
│       ├── inventory_handler.go
│       ├── supply_handler.go
│       ├── audit_handler.go
│       ├── statistics_handler.go
│       └── router.go                     # RegisterRoutes(engine, handlers, middleware)
│
├── pkg/                                  # Reusable, import-safe packages
│   ├── httputil/
│   │   ├── response.go                  # JSON envelope: { success, data, error, meta }
│   │   └── request.go                   # Pagination, query param helpers
│   └── supabase/
│       └── client.go                     # Supabase Admin API (create/update/delete auth users)
│
├── .env.example
├── go.mod
└── go.sum
```

---

## 2. Phase 1 — Core Infrastructure

### Step 1.1 — `.env.example`

Create `.env.example` with all required environment variables:

```env
# Server
PORT=8080
ENV=development                           # development | production

# Supabase
SUPABASE_JWT_SECRET=your-jwt-secret

# Database (Supabase PostgreSQL direct connection)
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Application Defaults
DEFAULT_CURRENCY=IDR
DEFAULT_TIMEZONE=Asia/Jakarta
```

### Step 1.2 — Config Loader (`internal/config/config.go`)

**What it does:**
- Reads every env var listed above
- Validates that `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, and `DATABASE_URL` are non-empty
- Returns a `Config` struct or an error at startup (fail fast)
- Provides `IsDevelopment() bool` helper
- Splits `CORS_ALLOWED_ORIGINS` by comma into `[]string`

**Struct fields:**
```
Port                   string
Env                    string
SupabaseURL            string
SupabaseAnonKey        string
SupabaseServiceRoleKey string
SupabaseJWTSecret      string
DatabaseURL            string
CORSAllowedOrigins     []string
DefaultCurrency        string
DefaultTimezone        string
```

**Important:** All default values (currency, timezone, etc.) should be configured via environment variables, not hardcoded in services.

### Step 1.3 — Database Connection (`internal/database/database.go`)

**What it does:**
- Accepts `context.Context` and `databaseURL string`
- Parses config via `pgxpool.ParseConfig()`
- Sets pool parameters:
  - `MaxConns = 25`
  - `MinConns = 5`
  - `MaxConnLifetime = 1 hour`
  - `MaxConnIdleTime = 30 minutes`
- Creates pool with `pgxpool.NewWithConfig()`
- Pings DB to verify connection, returns `(*pgxpool.Pool, error)`
- On failure: closes pool and returns wrapped error

### Step 1.4 — Supabase Admin Client (`pkg/supabase/client.go`)

**Why:** We don't store passwords. Supabase Auth handles authentication. When the CMS creates a new staff user, we must first create them in Supabase Auth, then store their profile in our `users` table with the returned `supabase_auth_id`.

**Struct:** `Client` with `baseURL`, `serviceRoleKey`, `*http.Client` (30s timeout)

**Methods:**
| Method | HTTP Call | Purpose |
|--------|-----------|---------|
| `CreateUser(ctx, CreateUserRequest)` → `*SupabaseUser` | `POST /auth/v1/admin/users` | Create auth user; returns UUID |
| `UpdateUser(ctx, userID, map)` | `PUT /auth/v1/admin/users/{id}` | Update email/password in auth |
| `DeleteUser(ctx, userID)` | `DELETE /auth/v1/admin/users/{id}` | Remove from auth system |
| `GetUser(ctx, userID)` → `*SupabaseUser` | `GET /auth/v1/admin/users/{id}` | Verify auth user exists |

**Headers on every request:**
```
Content-Type: application/json
Authorization: Bearer <service_role_key>
apikey: <service_role_key>
```

### Step 1.5 — HTTP Response Utilities (`pkg/httputil/response.go`)

**Standard envelope:**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": { "page": 1, "page_size": 20, "total": 150, "total_pages": 8 }
}
```

**Functions (all write to `*gin.Context`):**
| Function | Status | Use Case |
|----------|--------|----------|
| `Success(c, statusCode, data)` | 200/201 | Normal response |
| `SuccessWithMeta(c, statusCode, data, meta)` | 200 | Paginated list |
| `Error(c, statusCode, code, message)` | any | Generic error |
| `BadRequest(c, message)` | 400 | Invalid input |
| `Unauthorized(c, message)` | 401 | No/bad token |
| `Forbidden(c, message)` | 403 | Insufficient role |
| `NotFound(c, message)` | 404 | Entity not found |
| `Conflict(c, message)` | 409 | Duplicate key |
| `ValidationError(c, message)` | 422 | Field validation fail |
| `InternalError(c, message)` | 500 | Unexpected server error |

### Step 1.6 — HTTP Request Utilities (`pkg/httputil/request.go`)

**Pagination helper:**
```go
type Pagination struct {
    Page     int  // default 1
    PageSize int  // default 20, max 100
    Offset   int  // computed: (Page-1) * PageSize
}

func GetPagination(c *gin.Context) Pagination { ... }
func (p Pagination) ToMeta(total int) *Meta { ... }
```

**Other helpers:**
| Function | Purpose |
|----------|---------|
| `ParamInt(c, "id")` → `(int, error)` | Parse URL path param to int |
| `QueryStr(c, "key", "default")` → `string` | Query param with default |
| `QueryInt(c, "key", default)` → `int` | Integer query param |
| `QueryBool(c, "key")` → `*bool` | Optional bool query param |

### Step 1.7 — Auth Middleware (`internal/middleware/auth.go`)

**Flow for every protected request:**
1. Extract `Authorization: Bearer <token>` header
2. Parse JWT using `github.com/golang-jwt/jwt/v5` with HMAC signing and `SUPABASE_JWT_SECRET`
3. Validate expiry, signature
4. Extract `sub` claim (this is the Supabase auth UUID)
5. Call `UserRepository.GetBySupabaseID(ctx, sub)` to load full user profile from DB
6. Verify `is_active = true`
7. Construct `AuthUser` and store in `gin.Context`:
   ```go
   type AuthUser struct {
       SupabaseID string
       UserID     int
       RoleID     int
       RoleName   string   // "admin", "manager", "cashier", "chef"
       BranchID   int
       Name       string
       Email      string
   }
   ```
8. Call `c.Next()` on success; abort with 401 JSON on failure

**Note:** The `UserLookupFunc` is injected to avoid circular imports:
```go
type UserLookupFunc func(ctx context.Context, supabaseID string) (*AuthUser, error)

func Auth(jwtSecret string, lookupUser UserLookupFunc) gin.HandlerFunc { ... }
```

### Step 1.8 — RBAC Middleware (`internal/middleware/rbac.go`)

**Functions:**
```go
RequireRole(roles ...string) gin.HandlerFunc
// Reads AuthUser from gin.Context
// If AuthUser is nil → 401
// If AuthUser.RoleName not in roles → 403
// Otherwise → c.Next()

// Convenience shortcuts:
RequireAdmin()           → RequireRole("admin")
RequireAdminOrManager()  → RequireRole("admin", "manager")
RequireAnyStaff()        → RequireRole("admin", "manager", "cashier", "chef")
```

### Step 1.9 — Logging Middleware (`internal/middleware/logger.go`)

- Wraps `gin.HandlerFunc`
- Captures: start time, method, path, query, status code, response size, duration, remote addr
- Logs via `slog.Info("request", ...)` with structured key-value pairs
- In production: JSON output; in development: text output

### Step 1.10 — Recovery Middleware (`internal/middleware/recovery.go`)

- Catches panics in any handler
- Logs error + full stack trace via `slog.Error`
- Returns `{ "success": false, "error": { "code": "INTERNAL_ERROR", "message": "internal server error" } }`
- Status 500

### Step 1.11 — CORS Middleware (`internal/middleware/cors.go`)

- Reads allowed origins from config
- Sets headers: `Access-Control-Allow-Origin`, `Allow-Methods` (GET, POST, PUT, PATCH, DELETE, OPTIONS), `Allow-Headers` (Accept, Authorization, Content-Type, X-Requested-With), `Allow-Credentials: true`, `Max-Age: 86400`
- Handles `OPTIONS` preflight with 204 No Content

### Step 1.12 — Audit Helper (`internal/middleware/audit.go`)

**Not a middleware per se, but a helper used by services:**
```go
type AuditEntry struct {
    UserID      *int
    BranchID    *int
    Action      string            // matches audit_action enum
    TableName   string
    RecordID    *int
    OldValues   json.RawMessage   // nullable
    NewValues   json.RawMessage   // nullable
    Description string
    IPAddress   string
    UserAgent   string
    SessionID   string
}

func ExtractRequestInfo(c *gin.Context) (ipAddress, userAgent string)
```

Services will call `AuditRepo.Create(ctx, entry)` after mutations.

---

## 3. Phase 2 — Domain Models (Exact Schema Mapping)

> Every struct maps 1:1 to a database table. JSON tags use `snake_case`. Nullable DB columns use pointers in Go. Request DTOs use `binding:"required"` for Gin validation.

---

### Step 2.1 — `domain/enums.go`

Define all PostgreSQL enums as Go string constants:

```go
// role_type
const (
    RoleAdmin   = "admin"
    RoleManager = "manager"
    RoleCashier = "cashier"
    RoleChef    = "chef"
)

// pricing_type
const (
    PricingFixed       = "fixed"
    PricingWeightBased = "weight_based"
)

// unit_of_measure
const (
    UnitPiece   = "piece"
    UnitKg      = "kg"
    UnitGram    = "gram"
    UnitOns     = "ons"
    UnitLiter   = "liter"
    UnitMl      = "ml"
    UnitPortion = "portion"
)

// order_type
const (
    OrderTypeDineIn   = "dine_in"
    OrderTypeTakeaway = "takeaway"
)

// order_status
const (
    OrderStatusPending    = "pending"
    OrderStatusConfirmed  = "confirmed"
    OrderStatusPreparing  = "preparing"
    OrderStatusReady      = "ready"
    OrderStatusServed     = "served"
    OrderStatusCompleted  = "completed"
    OrderStatusCancelled  = "cancelled"
)

// payment_method_type
const (
    PaymentCash         = "cash"
    PaymentDebitCard    = "debit_card"
    PaymentCreditCard   = "credit_card"
    PaymentEWallet      = "ewallet"
    PaymentQRIS         = "qris"
    PaymentBankTransfer = "bank_transfer"
)

// payment_status
const (
    PaymentStatusUnpaid   = "unpaid"
    PaymentStatusPartial  = "partial"
    PaymentStatusPaid     = "paid"
    PaymentStatusRefunded = "refunded"
)

// table_status
const (
    TableAvailable   = "available"
    TableOccupied    = "occupied"
    TableReserved    = "reserved"
    TableMaintenance = "maintenance"
)

// purchase_status
const (
    PurchaseOrdered         = "ordered"
    PurchasePartialReceived = "partial_received"
    PurchaseReceived        = "received"
    PurchaseCancelled       = "cancelled"
)

// shift_status
const (
    ShiftOpen   = "open"
    ShiftClosed = "closed"
)

// device_status
const (
    DeviceActive   = "active"
    DeviceInactive = "inactive"
)

// discount_type
const (
    DiscountPercentage  = "percentage"
    DiscountFixedAmount = "fixed_amount"
)

// kot_status
const (
    KOTStatusPending    = "pending"
    KOTStatusInProgress = "in_progress"
    KOTStatusReady      = "ready"
    KOTStatusServed     = "served"
    KOTStatusCancelled  = "cancelled"
)

// reservation_status
const (
    ReservationConfirmed = "confirmed"
    ReservationSeated    = "seated"
    ReservationCompleted = "completed"
    ReservationNoShow    = "no_show"
    ReservationCancelled = "cancelled"
)

// audit_action
const (
    AuditInsert       = "INSERT"
    AuditUpdate       = "UPDATE"
    AuditDelete       = "DELETE"
    AuditLogin        = "LOGIN"
    AuditLogout       = "LOGOUT"
    AuditVoid         = "VOID"
    AuditRefund       = "REFUND"
    AuditPrint        = "PRINT"
    AuditOpenDrawer   = "OPEN_DRAWER"
    AuditOverride     = "OVERRIDE"
    AuditStatusChange = "STATUS_CHANGE"
)
```

---

### Step 2.2 — `domain/role.go`

**Entity (maps to `roles` table):**
```go
type Role struct {
    ID          int        `json:"id"`
    Name        string     `json:"name"`          // role_type enum: admin|manager|cashier|chef
    Description *string    `json:"description"`    // varchar(255), nullable
    CreatedAt   time.Time  `json:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at"`
}
```

No DTOs needed — roles are seeded, not managed via API.

---

### Step 2.3 — `domain/branch.go`

**Entity (maps to `branches` table):**
```go
type Branch struct {
    ID                int        `json:"id"`
    Name              string     `json:"name"`                // varchar(100) NOT NULL
    Address           *string    `json:"address"`             // text, nullable
    Phone             *string    `json:"phone"`               // varchar(20), nullable
    TaxRate           float64    `json:"tax_rate"`            // decimal(5,2) DEFAULT 0
    ServiceChargeRate float64    `json:"service_charge_rate"` // decimal(5,2) DEFAULT 0
    Currency          string     `json:"currency"`            // varchar(3) DEFAULT 'IDR'
    Timezone          string     `json:"timezone"`            // varchar(50) DEFAULT 'Asia/Jakarta'
    IsActive          bool       `json:"is_active"`           // DEFAULT true
    CreatedAt         time.Time  `json:"created_at"`
    UpdatedAt         time.Time  `json:"updated_at"`
}
```

**DTOs:**
```go
type CreateBranchRequest struct {
    Name              string  `json:"name" binding:"required,max=100"`
    Address           *string `json:"address"`
    Phone             *string `json:"phone" binding:"omitempty,max=20"`
    TaxRate           float64 `json:"tax_rate" binding:"gte=0,lte=100"`
    ServiceChargeRate float64 `json:"service_charge_rate" binding:"gte=0,lte=100"`
    Currency          string  `json:"currency" binding:"max=3"`
    Timezone          string  `json:"timezone"`
}

type UpdateBranchRequest struct {
    Name              *string  `json:"name" binding:"omitempty,max=100"`
    Address           *string  `json:"address"`
    Phone             *string  `json:"phone" binding:"omitempty,max=20"`
    TaxRate           *float64 `json:"tax_rate" binding:"omitempty,gte=0,lte=100"`
    ServiceChargeRate *float64 `json:"service_charge_rate" binding:"omitempty,gte=0,lte=100"`
    Currency          *string  `json:"currency" binding:"omitempty,max=3"`
    Timezone          *string  `json:"timezone"`
    IsActive          *bool    `json:"is_active"`
}
```

---

### Step 2.4 — `domain/user.go`

**Entity (maps to `users` table):**
```go
type User struct {
    ID             int        `json:"id"`
    SupabaseAuthID string     `json:"supabase_auth_id"` // uuid UNIQUE NOT NULL → links to Supabase auth.users.id
    RoleID         int        `json:"role_id"`          // FK → roles.id
    BranchID       int        `json:"branch_id"`        // FK → branches.id
    Name           string     `json:"name"`             // varchar(100) NOT NULL
    Email          *string    `json:"email"`            // varchar(255) UNIQUE, nullable
    Phone          *string    `json:"phone"`            // varchar(20), nullable
    PinCode        *string    `json:"-"`                // TEXT, nullable — NEVER exposed in JSON
    AvatarURL      *string    `json:"avatar_url"`       // varchar(500), nullable
    IsActive       bool       `json:"is_active"`        // DEFAULT true
    LastLoginAt    *time.Time `json:"last_login_at"`    // nullable
    RetryAttempts  int64      `json:"retry_attempts"`   // DEFAULT 0
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`

    // Joined fields (not in DB, populated by JOINs)
    RoleName   string `json:"role_name,omitempty"`
    BranchName string `json:"branch_name,omitempty"`
}
```

**DTOs:**
```go
type CreateUserRequest struct {
    Email    string  `json:"email" binding:"required,email,max=255"`
    Password string  `json:"password" binding:"required,min=8"`
    Name     string  `json:"name" binding:"required,max=100"`
    RoleID   int     `json:"role_id" binding:"required"`
    BranchID int     `json:"branch_id" binding:"required"`
    Phone    *string `json:"phone" binding:"omitempty,max=20"`
    PinCode  *string `json:"pin_code" binding:"omitempty,min=4,max=8"`
}

type UpdateUserRequest struct {
    Name      *string `json:"name" binding:"omitempty,max=100"`
    Phone     *string `json:"phone" binding:"omitempty,max=20"`
    PinCode   *string `json:"pin_code" binding:"omitempty,min=4,max=8"`
    AvatarURL *string `json:"avatar_url" binding:"omitempty,max=500"`
    IsActive  *bool   `json:"is_active"`
    RoleID    *int    `json:"role_id"`
    BranchID  *int    `json:"branch_id"`
}

type UserFilter struct {
    BranchID *int    `form:"branch_id"`
    RoleID   *int    `form:"role_id"`
    IsActive *bool   `form:"is_active"`
    Search   string  `form:"search"`   // searches name, email
}
```

---

### Step 2.5 — `domain/device.go`

**Entity (maps to `devices` table):**
```go
type Device struct {
    ID           int       `json:"id"`
    BranchID     int       `json:"branch_id"`      // FK → branches.id
    DeviceUID    string    `json:"device_uid"`      // varchar(36) UNIQUE NOT NULL — UUID from AsyncStorage
    DeviceName   string    `json:"device_name"`     // varchar(100) NOT NULL — e.g. "Kasir 1", "Bar"
    Status       string    `json:"status"`          // device_status: active|inactive
    RegisteredAt time.Time `json:"registered_at"`
    LastSeenAt   time.Time `json:"last_seen_at"`    // updated on each app launch/heartbeat

    // Joined
    BranchName string `json:"branch_name,omitempty"`
}
```

**DTOs:**
```go
type RegisterDeviceRequest struct {
    BranchID   int    `json:"branch_id" binding:"required"`
    DeviceUID  string `json:"device_uid" binding:"required,max=36"`
    DeviceName string `json:"device_name" binding:"required,max=100"`
}

type UpdateDeviceRequest struct {
    DeviceName *string `json:"device_name" binding:"omitempty,max=100"`
    Status     *string `json:"status" binding:"omitempty,oneof=active inactive"`
}
```

---

### Step 2.6 — `domain/shift.go`

> Shifts are device-scoped. The cash drawer is tied to the physical device, not the user. `user_id` tracks who opened it.

**Entity (maps to `shifts` table):**
```go
type Shift struct {
    ID             int        `json:"id"`
    UserID         int        `json:"user_id"`         // FK → users.id (who opened)
    DeviceID       int        `json:"device_id"`       // FK → devices.id (physical terminal)
    BranchID       int        `json:"branch_id"`       // FK → branches.id
    Status         string     `json:"status"`          // shift_status: open|closed
    OpeningCash    float64    `json:"opening_cash"`    // decimal(14,2) DEFAULT 0
    ClosingCash    *float64   `json:"closing_cash"`    // decimal(14,2), nullable
    ExpectedCash   *float64   `json:"expected_cash"`   // decimal(14,2), nullable — computed on close
    CashDifference *float64   `json:"cash_difference"` // decimal(14,2), nullable — closing - expected
    OpenedAt       time.Time  `json:"opened_at"`
    ClosedAt       *time.Time `json:"closed_at"`       // nullable
    Notes          *string    `json:"notes"`           // text, nullable

    // Joined
    UserName   string `json:"user_name,omitempty"`
    DeviceName string `json:"device_name,omitempty"`
    BranchName string `json:"branch_name,omitempty"`
}
```

**DTOs:**
```go
type OpenShiftRequest struct {
    DeviceID    int     `json:"device_id" binding:"required"`
    BranchID    int     `json:"branch_id" binding:"required"`
    OpeningCash float64 `json:"opening_cash" binding:"gte=0"`
}

type CloseShiftRequest struct {
    ClosingCash float64 `json:"closing_cash" binding:"gte=0"`
    Notes       *string `json:"notes"`
}

type ShiftFilter struct {
    BranchID *int    `form:"branch_id"`
    DeviceID *int    `form:"device_id"`
    UserID   *int    `form:"user_id"`
    Status   *string `form:"status"`    // open|closed
    DateFrom *string `form:"date_from"` // YYYY-MM-DD
    DateTo   *string `form:"date_to"`   // YYYY-MM-DD
}
```

**Summary type (aggregated from orders + payments within a shift):**
```go
type ShiftSummary struct {
    ShiftID          int                      `json:"shift_id"`
    TotalOrders      int                      `json:"total_orders"`
    TotalRevenue     float64                  `json:"total_revenue"`
    TotalDiscount    float64                  `json:"total_discount"`
    TotalTax         float64                  `json:"total_tax"`
    TotalService     float64                  `json:"total_service"`
    NetRevenue       float64                  `json:"net_revenue"`
    OpeningCash      float64                  `json:"opening_cash"`
    ClosingCash      *float64                 `json:"closing_cash"`
    ExpectedCash     *float64                 `json:"expected_cash"`
    CashDifference   *float64                 `json:"cash_difference"`
    PaymentBreakdown []PaymentMethodBreakdown `json:"payment_breakdown"`
}
```

---

### Step 2.7 — `domain/floor_area.go`

**Entity (maps to `floor_areas` table):**
```go
type FloorArea struct {
    ID        int       `json:"id"`
    BranchID  int       `json:"branch_id"`  // FK → branches.id
    Name      string    `json:"name"`       // varchar(50) NOT NULL — e.g. "Indoor", "Outdoor", "VIP"
    SortOrder int       `json:"sort_order"` // DEFAULT 0
    IsActive  bool      `json:"is_active"`  // DEFAULT true
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`

    // Nested
    Tables []Table `json:"tables,omitempty"` // populated optionally
}
```

**DTOs:**
```go
type CreateFloorAreaRequest struct {
    BranchID  int    `json:"branch_id" binding:"required"`
    Name      string `json:"name" binding:"required,max=50"`
    SortOrder int    `json:"sort_order"`
}

type UpdateFloorAreaRequest struct {
    Name      *string `json:"name" binding:"omitempty,max=50"`
    SortOrder *int    `json:"sort_order"`
    IsActive  *bool   `json:"is_active"`
}
```

**Constraint:** UNIQUE(branch_id, name) — repo must handle conflict.

---

### Step 2.8 — `domain/table.go`

**Entity (maps to `tables` table):**
```go
type Table struct {
    ID          int       `json:"id"`
    BranchID    int       `json:"branch_id"`    // FK → branches.id
    FloorAreaID int       `json:"floor_area_id"` // FK → floor_areas.id
    TableNumber string    `json:"table_number"`  // varchar(10) NOT NULL
    Capacity    int       `json:"capacity"`      // DEFAULT 4
    Status      string    `json:"status"`        // table_status: available|occupied|reserved|maintenance
    IsActive    bool      `json:"is_active"`     // DEFAULT true
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`

    // Joined
    FloorAreaName string `json:"floor_area_name,omitempty"`
    BranchName    string `json:"branch_name,omitempty"`
}
```

**DTOs:**
```go
type CreateTableRequest struct {
    BranchID    int    `json:"branch_id" binding:"required"`
    FloorAreaID int    `json:"floor_area_id" binding:"required"`
    TableNumber string `json:"table_number" binding:"required,max=10"`
    Capacity    int    `json:"capacity" binding:"required,gte=1"`
}

type UpdateTableRequest struct {
    FloorAreaID *int    `json:"floor_area_id"`
    TableNumber *string `json:"table_number" binding:"omitempty,max=10"`
    Capacity    *int    `json:"capacity" binding:"omitempty,gte=1"`
    IsActive    *bool   `json:"is_active"`
}

type UpdateTableStatusRequest struct {
    Status string `json:"status" binding:"required,oneof=available occupied reserved maintenance"`
}

type TableFilter struct {
    BranchID    *int    `form:"branch_id"`
    FloorAreaID *int    `form:"floor_area_id"`
    Status      *string `form:"status"`
    IsActive    *bool   `form:"is_active"`
}
```

**Constraint:** UNIQUE(branch_id, table_number)

---

### Step 2.9 — `domain/category.go`

**Entity (maps to `categories` table):**
```go
type Category struct {
    ID          int        `json:"id"`
    ParentID    *int       `json:"parent_id"`   // FK self-ref, nullable — for subcategories
    Name        string     `json:"name"`        // varchar(100) NOT NULL
    Description *string    `json:"description"` // text, nullable
    SortOrder   int        `json:"sort_order"`  // DEFAULT 0
    IsActive    bool       `json:"is_active"`   // DEFAULT true
    CreatedAt   time.Time  `json:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at"`

    // Tree response
    Children []Category `json:"children,omitempty"`
}
```

**DTOs:**
```go
type CreateCategoryRequest struct {
    ParentID    *int    `json:"parent_id"`
    Name        string  `json:"name" binding:"required,max=100"`
    Description *string `json:"description"`
    SortOrder   int     `json:"sort_order"`
}

type UpdateCategoryRequest struct {
    ParentID    *int    `json:"parent_id"`
    Name        *string `json:"name" binding:"omitempty,max=100"`
    Description *string `json:"description"`
    SortOrder   *int    `json:"sort_order"`
    IsActive    *bool   `json:"is_active"`
}
```

---

### Step 2.10 — `domain/menu_item.go`

**Entity (maps to `menu_items` table):**
```go
type MenuItem struct {
    ID                     int        `json:"id"`
    CategoryID             *int       `json:"category_id"`              // FK → categories.id, nullable
    Name                   string     `json:"name"`                     // varchar(150) NOT NULL
    Description            *string    `json:"description"`              // text, nullable
    SKU                    *string    `json:"sku"`                      // varchar(50) UNIQUE, nullable
    Barcode                *string    `json:"barcode"`                  // varchar(50), nullable
    ImageURL               *string    `json:"image_url"`                // varchar(500), nullable
    PricingType            string     `json:"pricing_type"`             // pricing_type: fixed|weight_based
    UnitOfMeasure          string     `json:"unit_of_measure"`          // unit_of_measure enum
    Price                  float64    `json:"price"`                    // decimal(12,2) — base price / price per unit
    Cost                   *float64   `json:"cost"`                     // decimal(12,2), nullable — COGS
    MinOrderQty            float64    `json:"min_order_qty"`            // decimal(8,3) DEFAULT 1
    PreparationTimeMinutes *int       `json:"preparation_time_minutes"` // nullable
    IsAvailable            bool       `json:"is_available"`             // DEFAULT true — toggle when out of stock
    IsActive               bool       `json:"is_active"`                // DEFAULT true — soft delete
    SortOrder              int        `json:"sort_order"`               // DEFAULT 0
    CreatedAt              time.Time  `json:"created_at"`
    UpdatedAt              time.Time  `json:"updated_at"`

    // Joined
    CategoryName   string          `json:"category_name,omitempty"`
    ModifierGroups []ModifierGroup `json:"modifier_groups,omitempty"`
}
```

**DTOs:**
```go
type CreateMenuItemRequest struct {
    CategoryID             *int     `json:"category_id"`
    Name                   string   `json:"name" binding:"required,max=150"`
    Description            *string  `json:"description"`
    SKU                    *string  `json:"sku" binding:"omitempty,max=50"`
    Barcode                *string  `json:"barcode" binding:"omitempty,max=50"`
    ImageURL               *string  `json:"image_url" binding:"omitempty,max=500"`
    PricingType            string   `json:"pricing_type" binding:"required,oneof=fixed weight_based"`
    UnitOfMeasure          string   `json:"unit_of_measure" binding:"required,oneof=piece kg gram ons liter ml portion"`
    Price                  float64  `json:"price" binding:"required,gt=0"`
    Cost                   *float64 `json:"cost" binding:"omitempty,gte=0"`
    MinOrderQty            float64  `json:"min_order_qty" binding:"gt=0"`
    PreparationTimeMinutes *int     `json:"preparation_time_minutes" binding:"omitempty,gte=0"`
    SortOrder              int      `json:"sort_order"`
}

type UpdateMenuItemRequest struct {
    CategoryID             *int     `json:"category_id"`
    Name                   *string  `json:"name" binding:"omitempty,max=150"`
    Description            *string  `json:"description"`
    SKU                    *string  `json:"sku" binding:"omitempty,max=50"`
    Barcode                *string  `json:"barcode" binding:"omitempty,max=50"`
    ImageURL               *string  `json:"image_url" binding:"omitempty,max=500"`
    PricingType            *string  `json:"pricing_type" binding:"omitempty,oneof=fixed weight_based"`
    UnitOfMeasure          *string  `json:"unit_of_measure" binding:"omitempty,oneof=piece kg gram ons liter ml portion"`
    Price                  *float64 `json:"price" binding:"omitempty,gt=0"`
    Cost                   *float64 `json:"cost" binding:"omitempty,gte=0"`
    MinOrderQty            *float64 `json:"min_order_qty" binding:"omitempty,gt=0"`
    PreparationTimeMinutes *int     `json:"preparation_time_minutes" binding:"omitempty,gte=0"`
    IsAvailable            *bool    `json:"is_available"`
    IsActive               *bool    `json:"is_active"`
    SortOrder              *int     `json:"sort_order"`
}

type MenuItemFilter struct {
    CategoryID  *int    `form:"category_id"`
    PricingType *string `form:"pricing_type"`
    IsAvailable *bool   `form:"is_available"`
    IsActive    *bool   `form:"is_active"`
    Search      string  `form:"search"`       // searches name, sku, barcode
}
```

---

### Step 2.11 — `domain/modifier.go`

**Entities (maps to `modifier_groups`, `modifiers`, `menu_item_modifier_groups`):**
```go
type ModifierGroup struct {
    ID            int        `json:"id"`
    Name          string     `json:"name"`           // varchar(100) NOT NULL
    Description   *string    `json:"description"`    // nullable
    IsRequired    bool       `json:"is_required"`    // DEFAULT false
    MinSelections int        `json:"min_selections"` // DEFAULT 0
    MaxSelections int        `json:"max_selections"` // DEFAULT 1 (1=single choice, >1=multi)
    SortOrder     int        `json:"sort_order"`     // DEFAULT 0
    IsActive      bool       `json:"is_active"`      // DEFAULT true
    CreatedAt     time.Time  `json:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at"`

    Modifiers []Modifier `json:"modifiers,omitempty"` // nested modifiers
}

type Modifier struct {
    ID              int       `json:"id"`
    ModifierGroupID int       `json:"modifier_group_id"` // FK → modifier_groups.id
    Name            string    `json:"name"`              // varchar(100) — e.g. "Fried", "Grilled"
    ExtraPrice      float64   `json:"extra_price"`       // decimal(12,2) DEFAULT 0
    SortOrder       int       `json:"sort_order"`        // DEFAULT 0
    IsActive        bool      `json:"is_active"`         // DEFAULT true
    CreatedAt       time.Time `json:"created_at"`
    UpdatedAt       time.Time `json:"updated_at"`
}

type MenuItemModifierGroup struct {
    ID              int `json:"id"`
    MenuItemID      int `json:"menu_item_id"`      // FK → menu_items.id
    ModifierGroupID int `json:"modifier_group_id"` // FK → modifier_groups.id
    SortOrder       int `json:"sort_order"`         // DEFAULT 0
}
```

**DTOs:**
```go
type CreateModifierGroupRequest struct {
    Name          string  `json:"name" binding:"required,max=100"`
    Description   *string `json:"description"`
    IsRequired    bool    `json:"is_required"`
    MinSelections int     `json:"min_selections" binding:"gte=0"`
    MaxSelections int     `json:"max_selections" binding:"gte=1"`
    SortOrder     int     `json:"sort_order"`
}

type UpdateModifierGroupRequest struct {
    Name          *string `json:"name" binding:"omitempty,max=100"`
    Description   *string `json:"description"`
    IsRequired    *bool   `json:"is_required"`
    MinSelections *int    `json:"min_selections" binding:"omitempty,gte=0"`
    MaxSelections *int    `json:"max_selections" binding:"omitempty,gte=1"`
    SortOrder     *int    `json:"sort_order"`
    IsActive      *bool   `json:"is_active"`
}

type CreateModifierRequest struct {
    Name       string  `json:"name" binding:"required,max=100"`
    ExtraPrice float64 `json:"extra_price" binding:"gte=0"`
    SortOrder  int     `json:"sort_order"`
}

type UpdateModifierRequest struct {
    Name       *string  `json:"name" binding:"omitempty,max=100"`
    ExtraPrice *float64 `json:"extra_price" binding:"omitempty,gte=0"`
    SortOrder  *int     `json:"sort_order"`
    IsActive   *bool    `json:"is_active"`
}

type AssignModifierGroupRequest struct {
    ModifierGroupID int `json:"modifier_group_id" binding:"required"`
    SortOrder       int `json:"sort_order"`
}
```

**Constraint:** UNIQUE(menu_item_id, modifier_group_id) on link table.

---

### Step 2.12 — `domain/customer.go`

**Entity (maps to `customers` table):**
```go
type Customer struct {
    ID            int        `json:"id"`
    Name          string     `json:"name"`           // varchar(100) NOT NULL
    Phone         *string    `json:"phone"`          // varchar(20), nullable
    Email         *string    `json:"email"`          // varchar(255), nullable
    Address       *string    `json:"address"`        // text, nullable
    LoyaltyPoints int       `json:"loyalty_points"` // DEFAULT 0 — managed by order system
    TotalVisits   int        `json:"total_visits"`   // DEFAULT 0 — managed by order system
    TotalSpent    float64    `json:"total_spent"`    // decimal(14,2) DEFAULT 0 — managed by order system
    Notes         *string    `json:"notes"`          // text, nullable
    IsActive      bool       `json:"is_active"`      // DEFAULT true
    CreatedAt     time.Time  `json:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at"`
}
```

**DTOs:**
```go
type CreateCustomerRequest struct {
    Name    string  `json:"name" binding:"required,max=100"`
    Phone   *string `json:"phone" binding:"omitempty,max=20"`
    Email   *string `json:"email" binding:"omitempty,email,max=255"`
    Address *string `json:"address"`
    Notes   *string `json:"notes"`
}

type UpdateCustomerRequest struct {
    Name     *string `json:"name" binding:"omitempty,max=100"`
    Phone    *string `json:"phone" binding:"omitempty,max=20"`
    Email    *string `json:"email" binding:"omitempty,email,max=255"`
    Address  *string `json:"address"`
    Notes    *string `json:"notes"`
    IsActive *bool   `json:"is_active"`
}

type CustomerFilter struct {
    Search   string  `form:"search"`    // name, phone, email
    IsActive *bool   `form:"is_active"`
    SortBy   string  `form:"sort_by"`   // name|visits|spent|points|created_at
    SortDir  string  `form:"sort_dir"`  // asc|desc
}
```

---

### Step 2.13 — `domain/reservation.go`

**Entity (maps to `reservations` table):**
```go
type Reservation struct {
    ID                  int        `json:"id"`
    BranchID            int        `json:"branch_id"`            // FK → branches.id
    TableID             *int       `json:"table_id"`             // FK → tables.id, nullable
    CustomerID          *int       `json:"customer_id"`          // FK → customers.id, nullable
    CustomerName        string     `json:"customer_name"`        // varchar(100) — for walk-in without account
    CustomerPhone       *string    `json:"customer_phone"`       // varchar(20), nullable
    GuestCount          int        `json:"guest_count"`          // DEFAULT 1
    ReservationDatetime time.Time  `json:"reservation_datetime"` // timestamp NOT NULL
    DurationMinutes     int        `json:"duration_minutes"`     // DEFAULT 120
    Status              string     `json:"status"`               // reservation_status enum
    Notes               *string    `json:"notes"`                // text, nullable
    CreatedBy           int        `json:"created_by"`           // FK → users.id
    CreatedAt           time.Time  `json:"created_at"`
    UpdatedAt           time.Time  `json:"updated_at"`

    // Joined
    TableNumber   *string `json:"table_number,omitempty"`
    CreatedByName string  `json:"created_by_name,omitempty"`
    BranchName    string  `json:"branch_name,omitempty"`
}
```

**DTOs:**
```go
type CreateReservationRequest struct {
    BranchID            int     `json:"branch_id" binding:"required"`
    TableID             *int    `json:"table_id"`
    CustomerID          *int    `json:"customer_id"`
    CustomerName        string  `json:"customer_name" binding:"required,max=100"`
    CustomerPhone       *string `json:"customer_phone" binding:"omitempty,max=20"`
    GuestCount          int     `json:"guest_count" binding:"required,gte=1"`
    ReservationDatetime string  `json:"reservation_datetime" binding:"required"` // ISO 8601
    DurationMinutes     int     `json:"duration_minutes" binding:"gte=15"`
    Notes               *string `json:"notes"`
}

type UpdateReservationRequest struct {
    TableID             *int    `json:"table_id"`
    CustomerName        *string `json:"customer_name" binding:"omitempty,max=100"`
    CustomerPhone       *string `json:"customer_phone" binding:"omitempty,max=20"`
    GuestCount          *int    `json:"guest_count" binding:"omitempty,gte=1"`
    ReservationDatetime *string `json:"reservation_datetime"`
    DurationMinutes     *int    `json:"duration_minutes" binding:"omitempty,gte=15"`
    Notes               *string `json:"notes"`
}

type UpdateReservationStatusRequest struct {
    Status string `json:"status" binding:"required,oneof=confirmed seated completed no_show cancelled"`
}

type ReservationFilter struct {
    BranchID *int    `form:"branch_id"`
    TableID  *int    `form:"table_id"`
    Status   *string `form:"status"`
    DateFrom *string `form:"date_from"` // YYYY-MM-DD
    DateTo   *string `form:"date_to"`
}
```

---

### Step 2.14 — `domain/order.go` (READ-ONLY for CMS)

**Entities (maps to `orders`, `order_items`, `order_item_modifiers`, `order_discounts`):**
```go
type Order struct {
    ID             int        `json:"id"`
    OrderNumber    string     `json:"order_number"`    // varchar(30) UNIQUE NOT NULL
    BranchID       int        `json:"branch_id"`
    TableID        *int       `json:"table_id"`        // NULL for takeaway
    CashierID      int        `json:"cashier_id"`
    CustomerID     *int       `json:"customer_id"`
    ShiftID        *int       `json:"shift_id"`
    OrderType      string     `json:"order_type"`      // dine_in|takeaway
    Status         string     `json:"status"`          // order_status enum
    GuestCount     *int       `json:"guest_count"`
    Subtotal       float64    `json:"subtotal"`        // decimal(14,2)
    DiscountAmount float64    `json:"discount_amount"` // decimal(14,2)
    TaxAmount      float64    `json:"tax_amount"`      // decimal(14,2)
    ServiceCharge  float64    `json:"service_charge"`  // decimal(14,2)
    RoundingAmount float64    `json:"rounding_amount"` // decimal(14,2)
    Total          float64    `json:"total"`           // decimal(14,2)
    PaymentStatus  string     `json:"payment_status"`  // payment_status enum
    Notes          *string    `json:"notes"`
    VoidedBy       *int       `json:"voided_by"`
    VoidedAt       *time.Time `json:"voided_at"`
    VoidReason     *string    `json:"void_reason"`
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`

    // Joined
    CashierName  string  `json:"cashier_name,omitempty"`
    CustomerName *string `json:"customer_name,omitempty"`
    TableNumber  *string `json:"table_number,omitempty"`
    BranchName   string  `json:"branch_name,omitempty"`

    // Nested
    Items     []OrderItem     `json:"items,omitempty"`
    Payments  []Payment       `json:"payments,omitempty"`
    Discounts []OrderDiscount `json:"discounts,omitempty"`
}

type OrderItem struct {
    ID             int       `json:"id"`
    OrderID        int       `json:"order_id"`
    MenuItemID     int       `json:"menu_item_id"`
    MenuItemName   string    `json:"menu_item_name"`   // snapshot at order time
    Quantity       float64   `json:"quantity"`          // decimal(8,3) — supports 1.2kg
    UnitOfMeasure  string    `json:"unit_of_measure"`
    UnitPrice      float64   `json:"unit_price"`        // snapshot
    ModifierTotal  float64   `json:"modifier_total"`
    Subtotal       float64   `json:"subtotal"`          // (qty * unit_price) + modifier_total
    DiscountAmount float64   `json:"discount_amount"`
    Total          float64   `json:"total"`
    Notes          *string   `json:"notes"`             // "no onion, extra sauce"
    IsVoided       bool      `json:"is_voided"`
    VoidedBy       *int      `json:"voided_by"`
    VoidReason     *string   `json:"void_reason"`
    CreatedAt      time.Time `json:"created_at"`

    Modifiers []OrderItemModifier `json:"modifiers,omitempty"`
}

type OrderItemModifier struct {
    ID                int     `json:"id"`
    OrderItemID       int     `json:"order_item_id"`
    ModifierID        int     `json:"modifier_id"`
    ModifierName      string  `json:"modifier_name"`       // snapshot: "Grilled"
    ModifierGroupName string  `json:"modifier_group_name"` // snapshot: "Cooking Method"
    ExtraPrice        float64 `json:"extra_price"`         // snapshot
}

type OrderDiscount struct {
    ID            int       `json:"id"`
    OrderID       int       `json:"order_id"`
    DiscountID    *int      `json:"discount_id"`     // NULL for manual/ad-hoc
    DiscountName  string    `json:"discount_name"`   // snapshot
    DiscountType  string    `json:"discount_type"`   // percentage|fixed_amount
    DiscountValue float64   `json:"discount_value"`
    AppliedAmount float64   `json:"applied_amount"`  // actual amount deducted
    AppliedBy     int       `json:"applied_by"`
    CreatedAt     time.Time `json:"created_at"`
}
```

**Filter:**
```go
type OrderFilter struct {
    BranchID      *int    `form:"branch_id"`
    Status        *string `form:"status"`
    PaymentStatus *string `form:"payment_status"`
    OrderType     *string `form:"order_type"`
    CashierID     *int    `form:"cashier_id"`
    CustomerID    *int    `form:"customer_id"`
    ShiftID       *int    `form:"shift_id"`
    TableID       *int    `form:"table_id"`
    DateFrom      *string `form:"date_from"`
    DateTo        *string `form:"date_to"`
    Search        string  `form:"search"` // order_number
}
```

---

### Step 2.15 — `domain/payment.go` (READ-ONLY for CMS)

**Entity (maps to `payments` table):**
```go
type Payment struct {
    ID              int       `json:"id"`
    OrderID         int       `json:"order_id"`          // FK → orders.id
    ShiftID         *int      `json:"shift_id"`          // FK → shifts.id, nullable
    PaymentMethod   string    `json:"payment_method"`    // payment_method_type enum
    Amount          float64   `json:"amount"`            // decimal(14,2)
    ChangeAmount    float64   `json:"change_amount"`     // decimal(14,2) — change for cash
    ReferenceNumber *string   `json:"reference_number"`  // card approval code, e-wallet ref
    PaidAt          time.Time `json:"paid_at"`
}
```

---

### Step 2.16 — `domain/discount.go`

**Entity (maps to `discounts` table):**
```go
type Discount struct {
    ID                int        `json:"id"`
    Name              string     `json:"name"`               // varchar(100) NOT NULL
    Description       *string    `json:"description"`        // text, nullable
    DiscountType      string     `json:"discount_type"`      // discount_type: percentage|fixed_amount
    Value             float64    `json:"value"`              // the percentage (e.g. 10) or amount (e.g. 25000)
    MinOrderAmount    *float64   `json:"min_order_amount"`   // decimal(14,2), nullable
    MaxDiscountAmount *float64   `json:"max_discount_amount"` // cap for % discounts, nullable
    ValidFrom         *time.Time `json:"valid_from"`         // nullable
    ValidUntil        *time.Time `json:"valid_until"`        // nullable
    IsActive          bool       `json:"is_active"`          // DEFAULT true
    CreatedAt         time.Time  `json:"created_at"`
    UpdatedAt         time.Time  `json:"updated_at"`
}
```

**DTOs:**
```go
type CreateDiscountRequest struct {
    Name              string   `json:"name" binding:"required,max=100"`
    Description       *string  `json:"description"`
    DiscountType      string   `json:"discount_type" binding:"required,oneof=percentage fixed_amount"`
    Value             float64  `json:"value" binding:"required,gt=0"`
    MinOrderAmount    *float64 `json:"min_order_amount" binding:"omitempty,gte=0"`
    MaxDiscountAmount *float64 `json:"max_discount_amount" binding:"omitempty,gt=0"`
    ValidFrom         *string  `json:"valid_from"`  // ISO 8601
    ValidUntil        *string  `json:"valid_until"` // ISO 8601
}

type UpdateDiscountRequest struct {
    Name              *string  `json:"name" binding:"omitempty,max=100"`
    Description       *string  `json:"description"`
    DiscountType      *string  `json:"discount_type" binding:"omitempty,oneof=percentage fixed_amount"`
    Value             *float64 `json:"value" binding:"omitempty,gt=0"`
    MinOrderAmount    *float64 `json:"min_order_amount" binding:"omitempty,gte=0"`
    MaxDiscountAmount *float64 `json:"max_discount_amount" binding:"omitempty,gt=0"`
    ValidFrom         *string  `json:"valid_from"`
    ValidUntil        *string  `json:"valid_until"`
    IsActive          *bool    `json:"is_active"`
}
```

---

### Step 2.17 — `domain/inventory.go`

**Entities (maps to `inventories` and `inventory_movements`):**
```go
type Inventory struct {
    ID                int       `json:"id"`
    BranchID          int       `json:"branch_id"`          // FK → branches.id
    MenuItemID        int       `json:"menu_item_id"`       // FK → menu_items.id
    StockQuantity     float64   `json:"stock_quantity"`     // decimal(12,3) — supports fractional (kg)
    LowStockThreshold *float64  `json:"low_stock_threshold"` // decimal(12,3) DEFAULT 10
    UpdatedAt         time.Time `json:"updated_at"`

    // Joined
    MenuItemName string  `json:"menu_item_name,omitempty"`
    MenuItemSKU  *string `json:"menu_item_sku,omitempty"`
    BranchName   string  `json:"branch_name,omitempty"`
    IsLowStock   bool    `json:"is_low_stock"` // computed: stock_quantity <= low_stock_threshold
}

type InventoryMovement struct {
    ID              int       `json:"id"`
    InventoryID     int       `json:"inventory_id"`     // FK → inventories.id
    UserID          int       `json:"user_id"`          // FK → users.id (who did it)
    MovementType    string    `json:"movement_type"`    // purchase_in|sale_out|adjustment|waste|transfer
    QuantityChange  float64   `json:"quantity_change"`  // decimal(12,3) — positive=in, negative=out
    QuantityBefore  float64   `json:"quantity_before"`  // decimal(12,3)
    QuantityAfter   float64   `json:"quantity_after"`   // decimal(12,3)
    ReferenceType   *string   `json:"reference_type"`   // order|purchase|manual_adjustment
    ReferenceID     *int      `json:"reference_id"`     // ID of related order/purchase
    Reason          *string   `json:"reason"`           // text, nullable
    CreatedAt       time.Time `json:"created_at"`

    // Joined
    UserName string `json:"user_name,omitempty"`
}
```

**DTOs:**
```go
type AdjustInventoryRequest struct {
    InventoryID    int     `json:"inventory_id" binding:"required"`
    QuantityChange float64 `json:"quantity_change" binding:"required"` // positive or negative
    MovementType   string  `json:"movement_type" binding:"required,oneof=adjustment waste transfer"`
    Reason         *string `json:"reason"`
}

type UpdateInventoryThresholdRequest struct {
    LowStockThreshold float64 `json:"low_stock_threshold" binding:"gte=0"`
}

type InventoryFilter struct {
    BranchID     *int  `form:"branch_id"`
    LowStockOnly *bool `form:"low_stock_only"` // only items where stock <= threshold
    MenuItemID   *int  `form:"menu_item_id"`
}
```

**Constraint:** UNIQUE(branch_id, menu_item_id)

---

### Step 2.18 — `domain/supplier.go`

**Entity (maps to `suppliers` table):**
```go
type Supplier struct {
    ID            int       `json:"id"`
    Name          string    `json:"name"`           // varchar(100) NOT NULL
    ContactPerson *string   `json:"contact_person"` // varchar(100), nullable
    Phone         *string   `json:"phone"`          // varchar(20), nullable
    Email         *string   `json:"email"`          // varchar(255), nullable
    Address       *string   `json:"address"`        // text, nullable
    IsActive      bool      `json:"is_active"`      // DEFAULT true
    CreatedAt     time.Time `json:"created_at"`
    UpdatedAt     time.Time `json:"updated_at"`
}
```

**DTOs:**
```go
type CreateSupplierRequest struct {
    Name          string  `json:"name" binding:"required,max=100"`
    ContactPerson *string `json:"contact_person" binding:"omitempty,max=100"`
    Phone         *string `json:"phone" binding:"omitempty,max=20"`
    Email         *string `json:"email" binding:"omitempty,email,max=255"`
    Address       *string `json:"address"`
}

type UpdateSupplierRequest struct {
    Name          *string `json:"name" binding:"omitempty,max=100"`
    ContactPerson *string `json:"contact_person" binding:"omitempty,max=100"`
    Phone         *string `json:"phone" binding:"omitempty,max=20"`
    Email         *string `json:"email" binding:"omitempty,email,max=255"`
    Address       *string `json:"address"`
    IsActive      *bool   `json:"is_active"`
}
```

---

### Step 2.19 — `domain/purchase.go`

**Entities (maps to `purchases` and `purchase_items`):**
```go
type Purchase struct {
    ID             int        `json:"id"`
    PurchaseNumber string     `json:"purchase_number"` // varchar(30) UNIQUE NOT NULL
    SupplierID     int        `json:"supplier_id"`     // FK → suppliers.id
    BranchID       int        `json:"branch_id"`       // FK → branches.id
    OrderedBy      int        `json:"ordered_by"`      // FK → users.id
    ReceivedBy     *int       `json:"received_by"`     // FK → users.id, nullable
    Subtotal       float64    `json:"subtotal"`        // decimal(14,2)
    TaxAmount      float64    `json:"tax_amount"`      // decimal(14,2)
    Total          float64    `json:"total"`           // decimal(14,2)
    Status         string     `json:"status"`          // purchase_status enum
    Notes          *string    `json:"notes"`
    OrderedAt      time.Time  `json:"ordered_at"`
    ReceivedAt     *time.Time `json:"received_at"`     // nullable
    CreatedAt      time.Time  `json:"created_at"`
    UpdatedAt      time.Time  `json:"updated_at"`

    // Joined
    SupplierName   string `json:"supplier_name,omitempty"`
    OrderedByName  string `json:"ordered_by_name,omitempty"`
    ReceivedByName string `json:"received_by_name,omitempty"`
    BranchName     string `json:"branch_name,omitempty"`

    // Nested
    Items []PurchaseItem `json:"items,omitempty"`
}

type PurchaseItem struct {
    ID            int     `json:"id"`
    PurchaseID    int     `json:"purchase_id"`
    MenuItemID    int     `json:"menu_item_id"`    // FK → menu_items.id
    Quantity      float64 `json:"quantity"`         // decimal(12,3)
    UnitOfMeasure string  `json:"unit_of_measure"` // unit_of_measure enum
    CostPerUnit   float64 `json:"cost_per_unit"`   // decimal(12,2)
    Total         float64 `json:"total"`           // decimal(14,2)

    // Joined
    MenuItemName string `json:"menu_item_name,omitempty"`
}
```

**DTOs:**
```go
type CreatePurchaseRequest struct {
    SupplierID int                        `json:"supplier_id" binding:"required"`
    BranchID   int                        `json:"branch_id" binding:"required"`
    Notes      *string                    `json:"notes"`
    TaxAmount  float64                    `json:"tax_amount" binding:"gte=0"`
    Items      []CreatePurchaseItemRequest `json:"items" binding:"required,min=1,dive"`
}

type CreatePurchaseItemRequest struct {
    MenuItemID    int     `json:"menu_item_id" binding:"required"`
    Quantity      float64 `json:"quantity" binding:"required,gt=0"`
    UnitOfMeasure string  `json:"unit_of_measure" binding:"required,oneof=piece kg gram ons liter ml portion"`
    CostPerUnit   float64 `json:"cost_per_unit" binding:"required,gt=0"`
}

type ReceivePurchaseRequest struct {
    Notes *string `json:"notes"`
    // On receive: all items are added to inventory
}

type PurchaseFilter struct {
    SupplierID *int    `form:"supplier_id"`
    BranchID   *int    `form:"branch_id"`
    Status     *string `form:"status"`
    DateFrom   *string `form:"date_from"`
    DateTo     *string `form:"date_to"`
}
```

---

### Step 2.20 — `domain/tax_config.go`

**Entity (maps to `tax_configs` table):**
```go
type TaxConfig struct {
    ID          int       `json:"id"`
    BranchID    int       `json:"branch_id"`    // FK → branches.id
    Name        string    `json:"name"`         // varchar(50) — "PPN", "PB1", "Service Tax"
    Rate        float64   `json:"rate"`         // decimal(5,2) — e.g. 11.00 for 11%
    IsInclusive bool      `json:"is_inclusive"` // true = already in menu price
    IsActive    bool      `json:"is_active"`    // DEFAULT true
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
```

**DTOs:**
```go
type CreateTaxConfigRequest struct {
    BranchID    int     `json:"branch_id" binding:"required"`
    Name        string  `json:"name" binding:"required,max=50"`
    Rate        float64 `json:"rate" binding:"required,gt=0,lte=100"`
    IsInclusive bool    `json:"is_inclusive"`
}

type UpdateTaxConfigRequest struct {
    Name        *string  `json:"name" binding:"omitempty,max=50"`
    Rate        *float64 `json:"rate" binding:"omitempty,gt=0,lte=100"`
    IsInclusive *bool    `json:"is_inclusive"`
    IsActive    *bool    `json:"is_active"`
}
```

---

### Step 2.21 — `domain/audit_log.go` (READ-ONLY)

**Entity (maps to `audit_logs` table):**
```go
type AuditLog struct {
    ID          int64           `json:"id"`              // BIGINT
    UserID      *int            `json:"user_id"`         // nullable (NULL for system actions)
    BranchID    *int            `json:"branch_id"`       // nullable
    Action      string          `json:"action"`          // audit_action enum
    TableName   string          `json:"table_name"`      // varchar(100) — "orders", "users", etc.
    RecordID    *int            `json:"record_id"`       // PK of affected record, nullable
    OldValues   json.RawMessage `json:"old_values"`      // jsonb, nullable — previous state
    NewValues   json.RawMessage `json:"new_values"`      // jsonb, nullable — new state
    Description *string         `json:"description"`     // human-readable
    IPAddress   *string         `json:"ip_address"`      // varchar(45)
    UserAgent   *string         `json:"user_agent"`      // text
    SessionID   *string         `json:"session_id"`      // varchar(255)
    CreatedAt   time.Time       `json:"created_at"`

    // Joined
    UserName string `json:"user_name,omitempty"`
}
```

**Filter:**
```go
type AuditLogFilter struct {
    UserID    *int    `form:"user_id"`
    BranchID  *int    `form:"branch_id"`
    Action    *string `form:"action"`     // INSERT|UPDATE|DELETE|LOGIN|...
    TableName *string `form:"table_name"` // orders|users|menu_items|...
    RecordID  *int    `form:"record_id"`
    DateFrom  *string `form:"date_from"`
    DateTo    *string `form:"date_to"`
}
```

---

### Step 2.22 — `domain/statistics.go`

**Response types for all statistics/report endpoints:**
```go
// Dashboard overview
type DashboardStats struct {
    TodayRevenue        float64 `json:"today_revenue"`
    YesterdayRevenue    float64 `json:"yesterday_revenue"`
    RevenueChange       float64 `json:"revenue_change_pct"`     // percentage
    TodayOrders         int     `json:"today_orders"`
    YesterdayOrders     int     `json:"yesterday_orders"`
    OrdersChange        float64 `json:"orders_change_pct"`
    AvgOrderValue       float64 `json:"avg_order_value"`
    ActiveTables        int     `json:"active_tables"`
    OpenShifts          int     `json:"open_shifts"`
    LowStockItems       int     `json:"low_stock_items"`
    PendingReservations int     `json:"pending_reservations"`
}

// Sales report — grouped by day/week/month
type SalesReportEntry struct {
    Period        string  `json:"period"`        // "2026-02-27", "2026-W09", "2026-02"
    TotalRevenue  float64 `json:"total_revenue"`
    TotalOrders   int     `json:"total_orders"`
    TotalTax      float64 `json:"total_tax"`
    TotalDiscount float64 `json:"total_discount"`
    NetRevenue    float64 `json:"net_revenue"`
}

// Revenue by menu category
type RevenueByCategory struct {
    CategoryID   int     `json:"category_id"`
    CategoryName string  `json:"category_name"`
    TotalRevenue float64 `json:"total_revenue"`
    OrderCount   int     `json:"order_count"`
    ItemsSold    float64 `json:"items_sold"`
}

// Top selling items
type TopSellingItem struct {
    MenuItemID   int     `json:"menu_item_id"`
    MenuItemName string  `json:"menu_item_name"`
    QuantitySold float64 `json:"quantity_sold"`
    TotalRevenue float64 `json:"total_revenue"`
    OrderCount   int     `json:"order_count"`
}

// Payment method breakdown
type PaymentMethodBreakdown struct {
    PaymentMethod string  `json:"payment_method"` // cash|debit_card|credit_card|ewallet|qris|bank_transfer
    Count         int     `json:"count"`
    TotalAmount   float64 `json:"total_amount"`
    Percentage    float64 `json:"percentage"`     // % of total
}

// Cash flow summary
type CashFlowSummary struct {
    Date         string  `json:"date"`
    CashIn       float64 `json:"cash_in"`        // cash payments received
    CashOut      float64 `json:"cash_out"`        // change given
    NetCash      float64 `json:"net_cash"`        // cash_in - cash_out
    NonCashIn    float64 `json:"non_cash_in"`     // card/ewallet/qris
    TotalRevenue float64 `json:"total_revenue"`
}

// Shift financial report
type ShiftReport struct {
    Shift              Shift                    `json:"shift"`
    TotalOrders        int                      `json:"total_orders"`
    CompletedOrders    int                      `json:"completed_orders"`
    CancelledOrders    int                      `json:"cancelled_orders"`
    VoidedOrders       int                      `json:"voided_orders"`
    GrossRevenue       float64                  `json:"gross_revenue"`
    TotalDiscounts     float64                  `json:"total_discounts"`
    TotalTax           float64                  `json:"total_tax"`
    TotalServiceCharge float64                  `json:"total_service_charge"`
    NetRevenue         float64                  `json:"net_revenue"`
    PaymentBreakdown   []PaymentMethodBreakdown `json:"payment_breakdown"`
}

// Common filter for statistics endpoints
type StatsFilter struct {
    BranchID *int    `form:"branch_id"`
    DateFrom *string `form:"date_from"` // YYYY-MM-DD
    DateTo   *string `form:"date_to"`   // YYYY-MM-DD
    GroupBy  string  `form:"group_by"`  // day|week|month (for sales report)
    Limit    int     `form:"limit"`     // for top-N queries
}
```

---

## 4. Phase 3 — Repository Layer

> Each repository is a struct with `*pgxpool.Pool`. All methods accept `context.Context` first. Use parameterized queries ($1, $2) exclusively — never string interpolation. Dynamic filters are built with conditional `WHERE` clauses using a query builder helper.

### Step 3.0 — Query Builder Helper (`repository/query_builder.go`)

Create a small internal helper for dynamic WHERE clauses:
```go
type QueryBuilder struct {
    conditions []string
    args       []interface{}
    argIndex   int
}

func NewQueryBuilder() *QueryBuilder { ... }
func (qb *QueryBuilder) AddCondition(condition string, value interface{}) { ... }
func (qb *QueryBuilder) WhereClause() string { ... }  // returns "" or "WHERE x AND y AND z"
func (qb *QueryBuilder) Args() []interface{} { ... }
func (qb *QueryBuilder) NextArg() string { ... }      // returns "$1", "$2", etc.
```

---

### Step 3.1 — `repository/branch_repo.go`

**Struct:** `BranchRepo` with `pool *pgxpool.Pool`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, branch) → (Branch, error)` | `INSERT INTO branches (name, address, phone, tax_rate, service_charge_rate, currency, timezone) VALUES ($1..$7) RETURNING *` | |
| `GetByID(ctx, id) → (Branch, error)` | `SELECT * FROM branches WHERE id = $1` | Return `ErrNotFound` if no rows |
| `List(ctx, pagination) → ([]Branch, total, error)` | `SELECT * FROM branches ORDER BY name` + `SELECT COUNT(*) FROM branches` | Paginated |
| `Update(ctx, id, req) → (Branch, error)` | Dynamic `UPDATE branches SET ... WHERE id = $N RETURNING *` | Only update non-nil fields, set `updated_at = NOW()` |
| `Delete(ctx, id) → error` | `UPDATE branches SET is_active = false, updated_at = NOW() WHERE id = $1` | Soft delete |

---

### Step 3.2 — `repository/user_repo.go`

**Struct:** `UserRepo` with `pool *pgxpool.Pool`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, user) → (User, error)` | `INSERT INTO users (...) VALUES (...) RETURNING *` | Includes `supabase_auth_id` |
| `GetByID(ctx, id) → (User, error)` | `SELECT u.*, r.name as role_name, b.name as branch_name FROM users u JOIN roles r ON r.id=u.role_id JOIN branches b ON b.id=u.branch_id WHERE u.id=$1` | With role + branch names |
| `GetBySupabaseID(ctx, supabaseID) → (User, error)` | `SELECT u.*, r.name... WHERE u.supabase_auth_id=$1 AND u.is_active=true` | **Used by auth middleware** |
| `List(ctx, filter, pagination) → ([]User, total, error)` | Dynamic WHERE: branch_id, role_id, is_active, ILIKE search on name/email | Paginated |
| `Update(ctx, id, req) → (User, error)` | Dynamic SET | PIN is bcrypt-hashed before storing |
| `Deactivate(ctx, id) → error` | `UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1` | |

---

### Step 3.3 — `repository/device_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Register(ctx, device) → (Device, error)` | `INSERT ... RETURNING *` | `device_uid` UNIQUE constraint |
| `GetByID(ctx, id) → (Device, error)` | `SELECT d.*, b.name ... FROM devices d JOIN branches b ...` | |
| `GetByUID(ctx, uid) → (Device, error)` | Same JOIN, `WHERE d.device_uid = $1` | |
| `ListByBranch(ctx, branchID, pagination) → ([]Device, total, error)` | Filtered by branch | |
| `Update(ctx, id, req) → (Device, error)` | Dynamic SET on device_name, status | |
| `UpdateLastSeen(ctx, id) → error` | `UPDATE devices SET last_seen_at = NOW() WHERE id = $1` | Called on heartbeat |

---

### Step 3.4 — `repository/shift_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Open(ctx, shift) → (Shift, error)` | `INSERT INTO shifts (user_id, device_id, branch_id, opening_cash) VALUES (...) RETURNING *` | |
| `Close(ctx, id, closingCash, expectedCash, cashDifference, notes) → (Shift, error)` | `UPDATE shifts SET status='closed', closing_cash=$2, expected_cash=$3, cash_difference=$4, closed_at=NOW(), notes=$5 WHERE id=$1 RETURNING *` | |
| `GetByID(ctx, id) → (Shift, error)` | JOIN users, devices, branches for names | |
| `List(ctx, filter, pagination) → ([]Shift, total, error)` | Dynamic WHERE: branch_id, device_id, user_id, status, date range on opened_at | |
| `GetOpenShiftForDevice(ctx, deviceID) → (Shift, error)` | `WHERE device_id=$1 AND status='open'` | Returns error if none (no open shift) |
| `GetShiftPaymentSummary(ctx, shiftID) → (cashTotal, nonCashTotal, changeTotal float64, error)` | `SELECT SUM(CASE WHEN payment_method='cash' THEN amount ELSE 0 END), SUM(CASE WHEN payment_method!='cash' THEN amount ELSE 0 END), SUM(change_amount) FROM payments WHERE shift_id=$1` | For computing expected_cash |

---

### Step 3.5 — `repository/floor_area_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, area) → (FloorArea, error)` | INSERT RETURNING * | UNIQUE(branch_id, name) |
| `GetByID(ctx, id) → (FloorArea, error)` | SELECT | |
| `ListByBranch(ctx, branchID) → ([]FloorArea, error)` | `ORDER BY sort_order, name` | No pagination (usually few) |
| `Update(ctx, id, req) → (FloorArea, error)` | Dynamic SET | |
| `Delete(ctx, id) → error` | `DELETE FROM floor_areas WHERE id=$1` | Hard delete — FK restricts if tables exist |

---

### Step 3.6 — `repository/table_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, table) → (Table, error)` | INSERT RETURNING * | UNIQUE(branch_id, table_number) |
| `GetByID(ctx, id) → (Table, error)` | JOIN floor_areas, branches | |
| `List(ctx, filter, pagination) → ([]Table, total, error)` | Dynamic WHERE: branch_id, floor_area_id, status, is_active | |
| `Update(ctx, id, req) → (Table, error)` | Dynamic SET | |
| `UpdateStatus(ctx, id, status) → error` | `UPDATE tables SET status=$2, updated_at=NOW() WHERE id=$1` | |
| `Delete(ctx, id) → error` | Soft delete: `is_active = false` | |

---

### Step 3.7 — `repository/category_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, cat) → (Category, error)` | INSERT RETURNING * | |
| `GetByID(ctx, id) → (Category, error)` | SELECT | |
| `List(ctx, pagination) → ([]Category, total, error)` | Flat list, `ORDER BY sort_order, name` | |
| `GetAll(ctx) → ([]Category, error)` | `SELECT * FROM categories WHERE is_active=true ORDER BY sort_order` | For tree building in service |
| `Update(ctx, id, req) → (Category, error)` | Dynamic SET | |
| `Delete(ctx, id) → error` | `UPDATE categories SET is_active=false WHERE id=$1` | |
| `HasMenuItems(ctx, id) → (bool, error)` | `SELECT EXISTS(SELECT 1 FROM menu_items WHERE category_id=$1 AND is_active=true)` | Guard before delete |

---

### Step 3.8 — `repository/menu_item_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, item) → (MenuItem, error)` | INSERT RETURNING * | SKU UNIQUE if not null |
| `GetByID(ctx, id) → (MenuItem, error)` | JOIN categories | |
| `List(ctx, filter, pagination) → ([]MenuItem, total, error)` | Dynamic WHERE: category_id, pricing_type, is_available, is_active, ILIKE search on name/sku/barcode | |
| `Update(ctx, id, req) → (MenuItem, error)` | Dynamic SET | |
| `Delete(ctx, id) → error` | Soft delete | |
| `ToggleAvailability(ctx, id, available bool) → error` | `UPDATE menu_items SET is_available=$2, updated_at=NOW() WHERE id=$1` | |
| `GetBySKU(ctx, sku) → (MenuItem, error)` | For uniqueness check | |

---

### Step 3.9 — `repository/modifier_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `CreateGroup(ctx, group) → (ModifierGroup, error)` | INSERT RETURNING * | |
| `GetGroupByID(ctx, id) → (ModifierGroup, error)` | SELECT | |
| `ListGroups(ctx, pagination) → ([]ModifierGroup, total, error)` | With nested modifiers via separate query | |
| `UpdateGroup(ctx, id, req) → (ModifierGroup, error)` | Dynamic SET | |
| `DeleteGroup(ctx, id) → error` | Soft delete | |
| `CreateModifier(ctx, groupID, mod) → (Modifier, error)` | INSERT RETURNING * | |
| `UpdateModifier(ctx, id, req) → (Modifier, error)` | Dynamic SET | |
| `DeleteModifier(ctx, id) → error` | Soft delete | |
| `GetModifiersByGroupID(ctx, groupID) → ([]Modifier, error)` | `WHERE modifier_group_id=$1 ORDER BY sort_order` | |
| `AssignGroupToItem(ctx, menuItemID, modifierGroupID, sortOrder) → error` | `INSERT INTO menu_item_modifier_groups ...` | UNIQUE constraint |
| `UnassignGroupFromItem(ctx, menuItemID, modifierGroupID) → error` | `DELETE FROM menu_item_modifier_groups WHERE ...` | |
| `GetGroupsForItem(ctx, menuItemID) → ([]ModifierGroup, error)` | JOIN menu_item_modifier_groups → modifier_groups → modifiers | Full tree for an item |

---

### Step 3.10 — `repository/customer_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, customer) → (Customer, error)` | INSERT RETURNING * | |
| `GetByID(ctx, id) → (Customer, error)` | SELECT * | |
| `List(ctx, filter, pagination) → ([]Customer, total, error)` | ILIKE search on name/phone/email, dynamic ORDER BY (name, visits, spent, points) | |
| `Update(ctx, id, req) → (Customer, error)` | Dynamic SET | |

---

### Step 3.11 — `repository/reservation_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, res) → (Reservation, error)` | INSERT RETURNING * | |
| `GetByID(ctx, id) → (Reservation, error)` | JOIN tables, users (created_by) | |
| `List(ctx, filter, pagination) → ([]Reservation, total, error)` | Dynamic WHERE: branch_id, table_id, status, date range | |
| `Update(ctx, id, req) → (Reservation, error)` | Dynamic SET | |
| `UpdateStatus(ctx, id, status) → error` | `UPDATE reservations SET status=$2, updated_at=NOW() WHERE id=$1` | |
| `CheckAvailability(ctx, tableID, datetime, durationMinutes) → (bool, error)` | Check for overlapping reservations: `WHERE table_id=$1 AND status IN ('confirmed','seated') AND reservation_datetime < $endTime AND reservation_datetime + (duration_minutes * interval '1 minute') > $startTime` | Prevent double-booking |

---

### Step 3.12 — `repository/order_repo.go` (READ-ONLY)

| Method | SQL | Notes |
|--------|-----|-------|
| `GetByID(ctx, id) → (Order, error)` | JOIN branches, users (cashier), customers, tables | |
| `GetOrderItems(ctx, orderID) → ([]OrderItem, error)` | SELECT * FROM order_items WHERE order_id=$1 | |
| `GetOrderItemModifiers(ctx, orderItemIDs) → ([]OrderItemModifier, error)` | `WHERE order_item_id = ANY($1)` | Batch load |
| `GetOrderDiscounts(ctx, orderID) → ([]OrderDiscount, error)` | SELECT * FROM order_discounts WHERE order_id=$1 | |
| `GetOrderPayments(ctx, orderID) → ([]Payment, error)` | SELECT * FROM payments WHERE order_id=$1 | |
| `List(ctx, filter, pagination) → ([]Order, total, error)` | Dynamic WHERE: branch_id, status, payment_status, order_type, cashier_id, customer_id, shift_id, date range, order_number search | |

---

### Step 3.13 — `repository/discount_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, discount) → (Discount, error)` | INSERT RETURNING * | |
| `GetByID(ctx, id) → (Discount, error)` | SELECT | |
| `List(ctx, pagination) → ([]Discount, total, error)` | ORDER BY created_at DESC | |
| `GetActive(ctx) → ([]Discount, error)` | `WHERE is_active=true AND (valid_from IS NULL OR valid_from <= NOW()) AND (valid_until IS NULL OR valid_until >= NOW())` | |
| `Update(ctx, id, req) → (Discount, error)` | Dynamic SET | |
| `Delete(ctx, id) → error` | Soft delete via is_active=false | |

---

### Step 3.14 — `repository/inventory_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `GetByID(ctx, id) → (Inventory, error)` | JOIN menu_items, branches | |
| `GetByBranchAndItem(ctx, branchID, menuItemID) → (Inventory, error)` | UNIQUE(branch_id, menu_item_id) | |
| `List(ctx, filter, pagination) → ([]Inventory, total, error)` | Dynamic WHERE: branch_id, low_stock_only (`stock_quantity <= low_stock_threshold`), menu_item_id | |
| `AdjustStock(ctx, inventoryID, quantityChange) → (Inventory, error)` | `UPDATE inventories SET stock_quantity = stock_quantity + $2, updated_at = NOW() WHERE id = $1 RETURNING *` | Atomic update |
| `UpdateThreshold(ctx, id, threshold) → error` | UPDATE | |
| `CreateMovement(ctx, movement) → (InventoryMovement, error)` | INSERT RETURNING * | |
| `GetMovements(ctx, inventoryID, pagination) → ([]InventoryMovement, total, error)` | JOIN users, ORDER BY created_at DESC | |
| `CreateForMenuItem(ctx, branchID, menuItemID) → (Inventory, error)` | INSERT with default stock=0 | Called when new menu item is created |
| `GetLowStockCount(ctx, branchID) → (int, error)` | `SELECT COUNT(*) FROM inventories WHERE branch_id=$1 AND stock_quantity <= COALESCE(low_stock_threshold, 10)` | For dashboard |

---

### Step 3.15 — `repository/supplier_repo.go`

Standard CRUD: `Create`, `GetByID`, `List` (paginated), `Update`, `Deactivate` (soft delete).

---

### Step 3.16 — `repository/purchase_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, purchase) → (Purchase, error)` | INSERT, auto-generate `purchase_number` (`PO-YYYYMMDD-XXXX`) | |
| `CreateItems(ctx, purchaseID, items) → error` | Batch INSERT into purchase_items | |
| `GetByID(ctx, id) → (Purchase, error)` | JOIN suppliers, users, branches + load items | |
| `List(ctx, filter, pagination) → ([]Purchase, total, error)` | Dynamic WHERE: supplier_id, branch_id, status, date range | |
| `UpdateStatus(ctx, id, status, receivedBy) → error` | `UPDATE purchases SET status=$2, received_by=$3, received_at=NOW(), updated_at=NOW() WHERE id=$1` | |
| `GetItems(ctx, purchaseID) → ([]PurchaseItem, error)` | JOIN menu_items for names | |

---

### Step 3.17 — `repository/audit_repo.go`

| Method | SQL | Notes |
|--------|-----|-------|
| `Create(ctx, entry) → error` | `INSERT INTO audit_logs (...)` | Called by services after every mutation |
| `List(ctx, filter, pagination) → ([]AuditLog, total, error)` | Dynamic WHERE: user_id, branch_id, action, table_name, record_id, date range. JOIN users for names | |
| `GetByRecord(ctx, tableName, recordID, pagination) → ([]AuditLog, total, error)` | Filter by table_name + record_id — full history of one entity | |

---

### Step 3.18 — `repository/tax_config_repo.go`

Standard CRUD: `Create`, `GetByID`, `ListByBranch`, `Update`, `Delete` (soft delete).

---

### Step 3.19 — `repository/statistics_repo.go`

> All queries use aggregation on the `orders`, `order_items`, `payments`, `shifts` tables. All accept branch_id + date range filters.

| Method | SQL Summary |
|--------|-------------|
| `GetDashboardStats(ctx, branchID)` | Multiple subqueries: today/yesterday revenue from completed orders, count orders, count active tables, count open shifts, count low-stock, count pending reservations |
| `GetSalesReport(ctx, filter)` | `SELECT date_trunc($group_by, created_at) as period, SUM(total), COUNT(*), SUM(tax_amount), SUM(discount_amount) FROM orders WHERE status='completed' GROUP BY period ORDER BY period` |
| `GetRevenueByCategory(ctx, filter)` | JOIN order_items → menu_items → categories, GROUP BY category |
| `GetTopSellingItems(ctx, filter)` | JOIN order_items → menu_items, GROUP BY menu_item_id, ORDER BY quantity DESC LIMIT N |
| `GetPaymentMethodBreakdown(ctx, filter)` | `SELECT payment_method, COUNT(*), SUM(amount) FROM payments JOIN orders ... GROUP BY payment_method` |
| `GetCashFlowSummary(ctx, filter)` | Cash vs non-cash payments per day + change given |
| `GetShiftReport(ctx, shiftID)` | Aggregate orders + payments for a single shift |

---

## 5. Phase 4 — Service Layer (Business Logic)

> Services are structs that receive repositories (and optionally the Supabase client). They enforce business rules, validate data, and write audit logs.

### Step 4.1 — `service/branch_service.go`

**Struct:** `BranchService` with `branchRepo`, `auditRepo`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser) → Branch` | 1. Validate: name required. 2. Default currency and timezone from config (config.DefaultCurrency(), config.DefaultTimezone()) if empty. 3. Insert via repo. 4. Write audit log (INSERT, "branches", new values). |
| `GetByID(ctx, id) → Branch` | Fetch from repo, return 404 if not found. |
| `List(ctx, pagination) → ([]Branch, meta)` | Pass through to repo. |
| `Update(ctx, id, req, authUser) → Branch` | 1. Fetch existing (404 check). 2. Snapshot old values. 3. Update via repo. 4. Write audit log (UPDATE, old → new). |
| `Delete(ctx, id, authUser)` | 1. Fetch existing. 2. Soft delete. 3. Audit log (DELETE). |

---

### Step 4.2 — `service/user_service.go`

**Struct:** `UserService` with `userRepo`, `auditRepo`, `supabaseClient`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser) → User` | 1. Validate role_id and branch_id exist. 2. Call `supabaseClient.CreateUser()` with email + password → get back UUID. 3. If req.PinCode provided, hash with bcrypt. 4. INSERT into users table with supabase_auth_id. 5. Audit log. **On failure at step 4:** call `supabaseClient.DeleteUser()` to rollback auth user. |
| `GetByID(ctx, id) → User` | Fetch with JOINs, 404 check. |
| `GetMe(ctx, authUser) → User` | Use `userRepo.GetByID(authUser.UserID)`. |
| `List(ctx, filter, pagination) → ([]User, meta)` | Pass filter + pagination to repo. |
| `Update(ctx, id, req, authUser) → User` | 1. Fetch existing. 2. If email changes, also call `supabaseClient.UpdateUser()`. 3. If pin_code changes, bcrypt hash it. 4. Update in DB. 5. Audit log. |
| `Deactivate(ctx, id, authUser)` | 1. Fetch existing. 2. Set is_active=false in DB. 3. Optionally ban in Supabase Auth. 4. Audit log. |

---

### Step 4.3 — `service/device_service.go`

**Struct:** `DeviceService` with `deviceRepo`, `auditRepo`

| Method | Logic |
|--------|-------|
| `Register(ctx, req, authUser) → Device` | 1. Validate branch exists. 2. Check device_uid not already registered (UNIQUE constraint). 3. Insert. 4. Audit log. |
| `List(ctx, branchID, pagination) → ([]Device, meta)` | |
| `Update(ctx, id, req, authUser) → Device` | Audit log on change. |
| `UpdateStatus(ctx, id, status, authUser)` | Audit log (STATUS_CHANGE). |

---

### Step 4.4 — `service/shift_service.go`

**Struct:** `ShiftService` with `shiftRepo`, `auditRepo`

| Method | Logic |
|--------|-------|
| `Open(ctx, req, authUser) → Shift` | 1. Check no existing open shift for this device: `shiftRepo.GetOpenShiftForDevice()`. If open shift exists → error "device already has an open shift". 2. Insert new shift with opening_cash. 3. Audit log. |
| `Close(ctx, id, req, authUser) → Shift` | 1. Fetch shift, verify status='open'. 2. Query payments in this shift: `shiftRepo.GetShiftPaymentSummary(id)` → cashTotal, changeTotal. 3. Compute: `expected_cash = opening_cash + cashTotal - changeTotal`. 4. Compute: `cash_difference = req.ClosingCash - expected_cash`. 5. Update shift. 6. Audit log. |
| `GetByID(ctx, id) → Shift` | |
| `GetSummary(ctx, id) → ShiftSummary` | Aggregate all orders + payments for the shift. |
| `List(ctx, filter, pagination) → ([]Shift, meta)` | |

---

### Step 4.5 — `service/table_service.go`

**Struct:** `TableService` with `tableRepo`, `floorAreaRepo`, `auditRepo`

**Floor Area methods:** `CreateFloorArea`, `ListFloorAreas`, `UpdateFloorArea`, `DeleteFloorArea`

**Table methods:**
| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser) → Table` | Validate floor_area belongs to same branch. Check unique table_number in branch. Insert. Audit. |
| `List(ctx, filter, pagination)` | |
| `Update(ctx, id, req, authUser) → Table` | If table_number changes, recheck uniqueness. Audit. |
| `UpdateStatus(ctx, id, req, authUser)` | Validate status transition. Audit (STATUS_CHANGE). |
| `Delete(ctx, id, authUser)` | Soft delete. Check table not occupied/reserved. Audit. |

**Status transition rules:**
- `available` → `occupied`, `reserved`, `maintenance`
- `occupied` → `available` (when cleared)
- `reserved` → `occupied` (guest seated), `available` (cancelled)
- `maintenance` → `available`

---

### Step 4.6 — `service/category_service.go`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser)` | If parent_id provided, verify parent exists. Insert. Audit. |
| `GetTree(ctx)` | 1. Fetch all active categories flat. 2. Build tree in memory: group by parent_id, recursively nest children. 3. Return root-level categories with children populated. |
| `List(ctx, pagination)` | Flat paginated list. |
| `Update(ctx, id, req, authUser)` | If parent_id changes, prevent circular reference (can't be own parent or descendant). Audit. |
| `Delete(ctx, id, authUser)` | Check `HasMenuItems()` — if true, return error "reassign menu items first". Soft delete. Audit. |

---

### Step 4.7 — `service/menu_service.go`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser) → MenuItem` | 1. Validate pricing_type ↔ unit_of_measure coherence: `weight_based` should use kg/gram/ons; `fixed` can use piece/portion/any. 2. If SKU provided, check uniqueness. 3. Insert menu item. 4. **Auto-create inventory records** for each active branch: `inventoryRepo.CreateForMenuItem(branchID, menuItemID)`. 5. Audit. |
| `GetByID(ctx, id) → MenuItem` | Fetch with category name + modifier groups (via `modifierRepo.GetGroupsForItem`). |
| `List(ctx, filter, pagination)` | |
| `Update(ctx, id, req, authUser) → MenuItem` | Validate SKU uniqueness if changed. Audit. |
| `ToggleAvailability(ctx, id, available, authUser)` | Simple flag toggle. Audit (STATUS_CHANGE). |
| `Delete(ctx, id, authUser)` | Soft delete. Audit. |

---

### Step 4.8 — `service/modifier_service.go`

| Method | Logic |
|--------|-------|
| `CreateGroup(ctx, req, authUser)` | Validate min_selections ≤ max_selections. Insert. Audit. |
| `ListGroups(ctx, pagination)` | With nested modifiers. |
| `UpdateGroup` / `DeleteGroup` | Audit. |
| `AddModifier(ctx, groupID, req, authUser)` | Verify group exists. Insert. Audit. |
| `UpdateModifier` / `DeleteModifier` | Audit. |
| `AssignToMenuItem(ctx, menuItemID, req, authUser)` | Verify both item and group exist. Insert link. Audit. |
| `UnassignFromMenuItem(ctx, menuItemID, groupID, authUser)` | Delete link. Audit. |

---

### Step 4.9 — `service/customer_service.go`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser)` | Insert. Audit. |
| `GetByID(ctx, id)` | Includes loyalty_points, total_visits, total_spent (read-only, managed by order system). |
| `List(ctx, filter, pagination)` | Supports search + sorting by visits/spent/points. |
| `Update(ctx, id, req, authUser)` | Only profile fields. loyalty_points/visits/spent are NOT updatable via CMS. Audit. |

---

### Step 4.10 — `service/reservation_service.go`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser)` | 1. Parse datetime. 2. If table_id provided, call `reservationRepo.CheckAvailability()` — reject if overlapping reservation exists. 3. Insert with created_by = authUser.UserID. 4. Audit. |
| `List(ctx, filter, pagination)` | |
| `Update(ctx, id, req, authUser)` | If table_id or datetime changes, re-check availability. Audit. |
| `UpdateStatus(ctx, id, req, authUser)` | 1. Validate transition: confirmed→seated→completed, confirmed→no_show, confirmed→cancelled. 2. If seated: auto-update table status to `occupied`. 3. If completed/cancelled: auto-update table status to `available`. 4. Audit. |

---

### Step 4.11 — `service/order_service.go` (READ-ONLY)

| Method | Logic |
|--------|-------|
| `GetByID(ctx, id) → Order` | Fetch order + load items (with modifiers) + payments + discounts. Assemble nested response. |
| `List(ctx, filter, pagination)` | Powerful filtering. List view doesn't need nested items. |

**No create/update/delete** — orders originate from the POS app and sync via PowerSync.

---

### Step 4.12 — `service/discount_service.go`

| Method | Logic |
|--------|-------|
| `Create(ctx, req, authUser)` | Validate: if percentage, value ≤ 100. If percentage with max_discount_amount, ensure max > 0. If valid_from & valid_until both present, ensure from < until. Insert. Audit. |
| `GetByID` / `List` / `GetActive` | |
| `Update(ctx, id, req, authUser)` | Same validations. Audit. |
| `Delete(ctx, id, authUser)` | Soft delete (is_active=false). Audit. |

---

### Step 4.13 — `service/inventory_service.go`

| Method | Logic |
|--------|-------|
| `List(ctx, filter, pagination)` | Includes `is_low_stock` computed field. |
| `GetLowStock(ctx, branchID, pagination)` | Filter where stock ≤ threshold. |
| `AdjustStock(ctx, req, authUser)` | 1. Fetch current inventory. 2. Compute `quantity_before = current.StockQuantity`, `quantity_after = quantity_before + req.QuantityChange`. 3. Validate quantity_after ≥ 0 (can't go negative). 4. Atomically update stock. 5. Create inventory_movement record with user_id, movement_type, quantities, reason. 6. Audit. |
| `UpdateThreshold(ctx, id, req, authUser)` | Update low_stock_threshold. Audit. |
| `GetMovements(ctx, inventoryID, pagination)` | History of all stock changes. |

---

### Step 4.14 — `service/supply_service.go`

**Struct:** `SupplyService` with `supplierRepo`, `purchaseRepo`, `inventoryRepo`, `auditRepo`

**Supplier methods:** Standard CRUD with audit.

**Purchase methods:**
| Method | Logic |
|--------|-------|
| `CreatePurchase(ctx, req, authUser)` | 1. Validate supplier exists and is active. 2. Generate purchase_number: `PO-YYYYMMDD-NNNN`. 3. Compute item totals: `quantity * cost_per_unit`. 4. Compute subtotal = sum of item totals. 5. Total = subtotal + tax_amount. 6. Insert purchase + items. 7. Audit. |
| `GetPurchase(ctx, id)` | With items + joined names. |
| `ListPurchases(ctx, filter, pagination)` | |
| `ReceivePurchase(ctx, id, req, authUser)` | 1. Fetch purchase, verify status in (ordered, partial_received). 2. For each purchase item: call `inventoryRepo.AdjustStock()` with +quantity, movement_type="purchase_in", reference_type="purchase", reference_id=purchase.id. 3. Update purchase status to "received", set received_by and received_at. 4. Audit. |
| `CancelPurchase(ctx, id, authUser)` | Verify status ≠ "received". Update status to "cancelled". Audit. |

---

### Step 4.15 — `service/audit_service.go`

| Method | Logic |
|--------|-------|
| `List(ctx, filter, pagination)` | Pass-through to repo with all filters. |
| `GetRecordHistory(ctx, tableName, recordID, pagination)` | Full change history for one entity. |

Read-only. Audit logs are written by other services, not by this one.

---

### Step 4.16 — `service/statistics_service.go`

**Struct:** `StatisticsService` with `statisticsRepo`

| Method | Logic |
|--------|-------|
| `GetDashboard(ctx, branchID)` | Call `statisticsRepo.GetDashboardStats()`. Compute percentage changes. |
| `GetSalesReport(ctx, filter)` | Validate group_by ∈ {day, week, month}. Default date range: last 30 days. Call repo. |
| `GetRevenueByCategory(ctx, filter)` | Call repo. |
| `GetTopSellingItems(ctx, filter)` | Default limit=10, max limit=50. Call repo. |
| `GetPaymentMethodBreakdown(ctx, filter)` | Call repo. Compute percentage for each method. |
| `GetCashFlow(ctx, filter)` | Call repo. |
| `GetShiftReport(ctx, shiftID)` | Call repo. |

---

## 6. Phase 5 — Handler Layer (HTTP / Gin)

> Every handler is a struct with its service injected. Each method takes `*gin.Context`. Pattern: parse params → call service → respond.

### Common Handler Pattern

```go
type XHandler struct {
    service *service.XService
}

func NewXHandler(s *service.XService) *XHandler {
    return &XHandler{service: s}
}

func (h *XHandler) List(c *gin.Context) {
    var filter domain.XFilter
    if err := c.ShouldBindQuery(&filter); err != nil {
        httputil.BadRequest(c, err.Error())
        return
    }
    pagination := httputil.GetPagination(c)

    items, total, err := h.service.List(c.Request.Context(), filter, pagination)
    if err != nil {
        httputil.InternalError(c, "failed to list items")
        return
    }

    httputil.SuccessWithMeta(c, http.StatusOK, items, pagination.ToMeta(total))
}
```

---

### Step 5.1 — `handler/branch_handler.go`

| Handler Method | Route | Parses | Calls |
|----------------|-------|--------|-------|
| `List(c)` | `GET /api/v1/branches` | pagination | `branchService.List()` |
| `GetByID(c)` | `GET /api/v1/branches/:id` | URL param `id` | `branchService.GetByID()` |
| `Create(c)` | `POST /api/v1/branches` | JSON body → `CreateBranchRequest` | `branchService.Create()` |
| `Update(c)` | `PUT /api/v1/branches/:id` | URL param + JSON body | `branchService.Update()` |
| `Delete(c)` | `DELETE /api/v1/branches/:id` | URL param | `branchService.Delete()` |

---

### Step 5.2 — `handler/user_handler.go`

| Handler Method | Route | Parses | Calls |
|----------------|-------|--------|-------|
| `List(c)` | `GET /api/v1/users` | query → `UserFilter` + pagination | `userService.List()` |
| `GetByID(c)` | `GET /api/v1/users/:id` | URL param | `userService.GetByID()` |
| `GetMe(c)` | `GET /api/v1/users/me` | auth user from context | `userService.GetMe()` |
| `Create(c)` | `POST /api/v1/users` | JSON → `CreateUserRequest` | `userService.Create()` |
| `Update(c)` | `PUT /api/v1/users/:id` | URL param + JSON | `userService.Update()` |
| `Deactivate(c)` | `PATCH /api/v1/users/:id/deactivate` | URL param | `userService.Deactivate()` |

---

### Step 5.3 — `handler/device_handler.go`

| Handler Method | Route | Notes |
|----------------|-------|-------|
| `List(c)` | `GET /api/v1/devices` | Query: `branch_id` |
| `Register(c)` | `POST /api/v1/devices` | JSON → `RegisterDeviceRequest` |
| `Update(c)` | `PUT /api/v1/devices/:id` | |
| `UpdateStatus(c)` | `PATCH /api/v1/devices/:id/status` | JSON → `UpdateDeviceRequest` (status only) |

---

### Step 5.4 — `handler/shift_handler.go`

| Handler Method | Route | Notes |
|----------------|-------|-------|
| `List(c)` | `GET /api/v1/shifts` | Query → `ShiftFilter` |
| `GetByID(c)` | `GET /api/v1/shifts/:id` | |
| `GetSummary(c)` | `GET /api/v1/shifts/:id/summary` | Returns `ShiftSummary` with payment breakdown |
| `Open(c)` | `POST /api/v1/shifts/open` | JSON → `OpenShiftRequest`; user_id from auth |
| `Close(c)` | `POST /api/v1/shifts/:id/close` | JSON → `CloseShiftRequest` |

---

### Step 5.5 — `handler/table_handler.go`

**Floor areas:**
| Handler Method | Route |
|----------------|-------|
| `ListFloorAreas(c)` | `GET /api/v1/floor-areas` — query: branch_id |
| `CreateFloorArea(c)` | `POST /api/v1/floor-areas` |
| `UpdateFloorArea(c)` | `PUT /api/v1/floor-areas/:id` |
| `DeleteFloorArea(c)` | `DELETE /api/v1/floor-areas/:id` |

**Tables:**
| Handler Method | Route |
|----------------|-------|
| `ListTables(c)` | `GET /api/v1/tables` — query → `TableFilter` |
| `GetTable(c)` | `GET /api/v1/tables/:id` |
| `CreateTable(c)` | `POST /api/v1/tables` |
| `UpdateTable(c)` | `PUT /api/v1/tables/:id` |
| `UpdateTableStatus(c)` | `PATCH /api/v1/tables/:id/status` |
| `DeleteTable(c)` | `DELETE /api/v1/tables/:id` |

---

### Step 5.6 — `handler/category_handler.go`

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/categories` — flat list |
| `GetTree(c)` | `GET /api/v1/categories/tree` — nested tree |
| `GetByID(c)` | `GET /api/v1/categories/:id` |
| `Create(c)` | `POST /api/v1/categories` |
| `Update(c)` | `PUT /api/v1/categories/:id` |
| `Delete(c)` | `DELETE /api/v1/categories/:id` |

---

### Step 5.7 — `handler/menu_handler.go`

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/menu-items` — query → `MenuItemFilter` |
| `GetByID(c)` | `GET /api/v1/menu-items/:id` — includes modifier groups |
| `Create(c)` | `POST /api/v1/menu-items` |
| `Update(c)` | `PUT /api/v1/menu-items/:id` |
| `ToggleAvailability(c)` | `PATCH /api/v1/menu-items/:id/availability` — `{ "is_available": true/false }` |
| `Delete(c)` | `DELETE /api/v1/menu-items/:id` |

---

### Step 5.8 — `handler/modifier_handler.go`

| Handler Method | Route |
|----------------|-------|
| `ListGroups(c)` | `GET /api/v1/modifier-groups` |
| `GetGroup(c)` | `GET /api/v1/modifier-groups/:id` |
| `CreateGroup(c)` | `POST /api/v1/modifier-groups` |
| `UpdateGroup(c)` | `PUT /api/v1/modifier-groups/:id` |
| `DeleteGroup(c)` | `DELETE /api/v1/modifier-groups/:id` |
| `AddModifier(c)` | `POST /api/v1/modifier-groups/:id/modifiers` |
| `UpdateModifier(c)` | `PUT /api/v1/modifiers/:id` |
| `DeleteModifier(c)` | `DELETE /api/v1/modifiers/:id` |
| `AssignToItem(c)` | `POST /api/v1/menu-items/:id/modifier-groups` |
| `UnassignFromItem(c)` | `DELETE /api/v1/menu-items/:itemId/modifier-groups/:groupId` |

---

### Step 5.9 — `handler/customer_handler.go`

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/customers` — query → `CustomerFilter` |
| `GetByID(c)` | `GET /api/v1/customers/:id` |
| `Create(c)` | `POST /api/v1/customers` |
| `Update(c)` | `PUT /api/v1/customers/:id` |

---

### Step 5.10 — `handler/reservation_handler.go`

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/reservations` — query → `ReservationFilter` |
| `GetByID(c)` | `GET /api/v1/reservations/:id` |
| `Create(c)` | `POST /api/v1/reservations` |
| `Update(c)` | `PUT /api/v1/reservations/:id` |
| `UpdateStatus(c)` | `PATCH /api/v1/reservations/:id/status` |

---

### Step 5.11 — `handler/order_handler.go` (READ-ONLY)

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/orders` — query → `OrderFilter` |
| `GetByID(c)` | `GET /api/v1/orders/:id` — full detail with items, modifiers, payments, discounts |

---

### Step 5.12 — `handler/discount_handler.go`

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/discounts` |
| `GetActive(c)` | `GET /api/v1/discounts/active` |
| `GetByID(c)` | `GET /api/v1/discounts/:id` |
| `Create(c)` | `POST /api/v1/discounts` |
| `Update(c)` | `PUT /api/v1/discounts/:id` |
| `Delete(c)` | `DELETE /api/v1/discounts/:id` |

---

### Step 5.13 — `handler/inventory_handler.go`

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/inventory` — query → `InventoryFilter` |
| `GetLowStock(c)` | `GET /api/v1/inventory/low-stock` — query: branch_id |
| `AdjustStock(c)` | `POST /api/v1/inventory/adjust` — JSON → `AdjustInventoryRequest` |
| `UpdateThreshold(c)` | `PATCH /api/v1/inventory/:id/threshold` |
| `GetMovements(c)` | `GET /api/v1/inventory/:id/movements` |

---

### Step 5.14 — `handler/supply_handler.go`

**Suppliers:**
| Handler Method | Route |
|----------------|-------|
| `ListSuppliers(c)` | `GET /api/v1/suppliers` |
| `GetSupplier(c)` | `GET /api/v1/suppliers/:id` |
| `CreateSupplier(c)` | `POST /api/v1/suppliers` |
| `UpdateSupplier(c)` | `PUT /api/v1/suppliers/:id` |

**Purchases:**
| Handler Method | Route |
|----------------|-------|
| `ListPurchases(c)` | `GET /api/v1/purchases` — query → `PurchaseFilter` |
| `GetPurchase(c)` | `GET /api/v1/purchases/:id` |
| `CreatePurchase(c)` | `POST /api/v1/purchases` — JSON → `CreatePurchaseRequest` with items[] |
| `ReceivePurchase(c)` | `POST /api/v1/purchases/:id/receive` |
| `CancelPurchase(c)` | `PATCH /api/v1/purchases/:id/cancel` |

---

### Step 5.15 — `handler/audit_handler.go` (READ-ONLY)

| Handler Method | Route |
|----------------|-------|
| `List(c)` | `GET /api/v1/audit-logs` — query → `AuditLogFilter` |
| `GetRecordHistory(c)` | `GET /api/v1/audit-logs/record/:table/:recordId` |

---

### Step 5.16 — `handler/statistics_handler.go`

| Handler Method | Route |
|----------------|-------|
| `GetDashboard(c)` | `GET /api/v1/statistics/dashboard` — query: branch_id |
| `GetSalesReport(c)` | `GET /api/v1/statistics/sales` — query: branch_id, date_from, date_to, group_by |
| `GetRevenueByCategory(c)` | `GET /api/v1/statistics/revenue-by-category` |
| `GetTopSellingItems(c)` | `GET /api/v1/statistics/top-items` — query: limit |
| `GetPaymentMethodBreakdown(c)` | `GET /api/v1/statistics/payment-methods` |
| `GetCashFlow(c)` | `GET /api/v1/statistics/cash-flow` |
| `GetShiftReport(c)` | `GET /api/v1/statistics/shifts/:id` |

---

## 7. Phase 6 — Router & Entry Point

### Step 6.1 — `handler/router.go`

```go
func RegisterRoutes(
    r *gin.Engine,
    authMW gin.HandlerFunc,
    // all handlers...
)
```

**Route groups with RBAC:**

```
r.Use(recoveryMW, loggingMW, corsMW)

api := r.Group("/api/v1")
api.Use(authMW)
{
    // --- Admin only ---
    admin := api.Group("")
    admin.Use(RequireAdmin())
    {
        admin.POST("/branches", branchHandler.Create)
        admin.PUT("/branches/:id", branchHandler.Update)
        admin.DELETE("/branches/:id", branchHandler.Delete)
        admin.PATCH("/users/:id/deactivate", userHandler.Deactivate)
    }

    // --- Admin + Manager ---
    mgmt := api.Group("")
    mgmt.Use(RequireAdminOrManager())
    {
        // Branches (read)
        mgmt.GET("/branches", branchHandler.List)
        mgmt.GET("/branches/:id", branchHandler.GetByID)

        // Users
        mgmt.GET("/users", userHandler.List)
        mgmt.GET("/users/:id", userHandler.GetByID)
        mgmt.POST("/users", userHandler.Create)
        mgmt.PUT("/users/:id", userHandler.Update)

        // Devices
        mgmt.GET("/devices", deviceHandler.List)
        mgmt.POST("/devices", deviceHandler.Register)
        mgmt.PUT("/devices/:id", deviceHandler.Update)
        mgmt.PATCH("/devices/:id/status", deviceHandler.UpdateStatus)

        // Floor Areas
        mgmt.GET("/floor-areas", tableHandler.ListFloorAreas)
        mgmt.POST("/floor-areas", tableHandler.CreateFloorArea)
        mgmt.PUT("/floor-areas/:id", tableHandler.UpdateFloorArea)
        mgmt.DELETE("/floor-areas/:id", tableHandler.DeleteFloorArea)

        // Tables
        mgmt.GET("/tables", tableHandler.ListTables)
        mgmt.GET("/tables/:id", tableHandler.GetTable)
        mgmt.POST("/tables", tableHandler.CreateTable)
        mgmt.PUT("/tables/:id", tableHandler.UpdateTable)
        mgmt.PATCH("/tables/:id/status", tableHandler.UpdateTableStatus)
        mgmt.DELETE("/tables/:id", tableHandler.DeleteTable)

        // Categories
        mgmt.GET("/categories", categoryHandler.List)
        mgmt.GET("/categories/tree", categoryHandler.GetTree)
        mgmt.GET("/categories/:id", categoryHandler.GetByID)
        mgmt.POST("/categories", categoryHandler.Create)
        mgmt.PUT("/categories/:id", categoryHandler.Update)
        mgmt.DELETE("/categories/:id", categoryHandler.Delete)

        // Menu Items
        mgmt.GET("/menu-items", menuHandler.List)
        mgmt.GET("/menu-items/:id", menuHandler.GetByID)
        mgmt.POST("/menu-items", menuHandler.Create)
        mgmt.PUT("/menu-items/:id", menuHandler.Update)
        mgmt.PATCH("/menu-items/:id/availability", menuHandler.ToggleAvailability)
        mgmt.DELETE("/menu-items/:id", menuHandler.Delete)

        // Modifier Groups
        mgmt.GET("/modifier-groups", modifierHandler.ListGroups)
        mgmt.GET("/modifier-groups/:id", modifierHandler.GetGroup)
        mgmt.POST("/modifier-groups", modifierHandler.CreateGroup)
        mgmt.PUT("/modifier-groups/:id", modifierHandler.UpdateGroup)
        mgmt.DELETE("/modifier-groups/:id", modifierHandler.DeleteGroup)
        mgmt.POST("/modifier-groups/:id/modifiers", modifierHandler.AddModifier)

        // Modifiers
        mgmt.PUT("/modifiers/:id", modifierHandler.UpdateModifier)
        mgmt.DELETE("/modifiers/:id", modifierHandler.DeleteModifier)

        // Menu ↔ Modifier links
        mgmt.POST("/menu-items/:id/modifier-groups", modifierHandler.AssignToItem)
        mgmt.DELETE("/menu-items/:itemId/modifier-groups/:groupId", modifierHandler.UnassignFromItem)

        // Discounts
        mgmt.GET("/discounts", discountHandler.List)
        mgmt.GET("/discounts/active", discountHandler.GetActive)
        mgmt.GET("/discounts/:id", discountHandler.GetByID)
        mgmt.POST("/discounts", discountHandler.Create)
        mgmt.PUT("/discounts/:id", discountHandler.Update)
        mgmt.DELETE("/discounts/:id", discountHandler.Delete)

        // Orders (read-only)
        mgmt.GET("/orders", orderHandler.List)
        mgmt.GET("/orders/:id", orderHandler.GetByID)

        // Inventory
        mgmt.GET("/inventory", inventoryHandler.List)
        mgmt.GET("/inventory/low-stock", inventoryHandler.GetLowStock)
        mgmt.POST("/inventory/adjust", inventoryHandler.AdjustStock)
        mgmt.PATCH("/inventory/:id/threshold", inventoryHandler.UpdateThreshold)
        mgmt.GET("/inventory/:id/movements", inventoryHandler.GetMovements)

        // Suppliers
        mgmt.GET("/suppliers", supplyHandler.ListSuppliers)
        mgmt.GET("/suppliers/:id", supplyHandler.GetSupplier)
        mgmt.POST("/suppliers", supplyHandler.CreateSupplier)
        mgmt.PUT("/suppliers/:id", supplyHandler.UpdateSupplier)

        // Purchases
        mgmt.GET("/purchases", supplyHandler.ListPurchases)
        mgmt.GET("/purchases/:id", supplyHandler.GetPurchase)
        mgmt.POST("/purchases", supplyHandler.CreatePurchase)
        mgmt.POST("/purchases/:id/receive", supplyHandler.ReceivePurchase)
        mgmt.PATCH("/purchases/:id/cancel", supplyHandler.CancelPurchase)

        // Audit Logs
        mgmt.GET("/audit-logs", auditHandler.List)
        mgmt.GET("/audit-logs/record/:table/:recordId", auditHandler.GetRecordHistory)

        // Statistics
        mgmt.GET("/statistics/dashboard", statsHandler.GetDashboard)
        mgmt.GET("/statistics/sales", statsHandler.GetSalesReport)
        mgmt.GET("/statistics/revenue-by-category", statsHandler.GetRevenueByCategory)
        mgmt.GET("/statistics/top-items", statsHandler.GetTopSellingItems)
        mgmt.GET("/statistics/payment-methods", statsHandler.GetPaymentMethodBreakdown)
        mgmt.GET("/statistics/cash-flow", statsHandler.GetCashFlow)
        mgmt.GET("/statistics/shifts/:id", statsHandler.GetShiftReport)
    }

    // --- All Staff ---
    staff := api.Group("")
    staff.Use(RequireAnyStaff())
    {
        staff.GET("/users/me", userHandler.GetMe)

        // Shifts
        staff.GET("/shifts", shiftHandler.List)
        staff.GET("/shifts/:id", shiftHandler.GetByID)
        staff.GET("/shifts/:id/summary", shiftHandler.GetSummary)
        staff.POST("/shifts/open", shiftHandler.Open)
        staff.POST("/shifts/:id/close", shiftHandler.Close)

        // Customers
        staff.GET("/customers", customerHandler.List)
        staff.GET("/customers/:id", customerHandler.GetByID)
        staff.POST("/customers", customerHandler.Create)
        staff.PUT("/customers/:id", customerHandler.Update)

        // Reservations
        staff.GET("/reservations", reservationHandler.List)
        staff.GET("/reservations/:id", reservationHandler.GetByID)
        staff.POST("/reservations", reservationHandler.Create)
        staff.PUT("/reservations/:id", reservationHandler.Update)
        staff.PATCH("/reservations/:id/status", reservationHandler.UpdateStatus)
    }
}
```

### Step 6.2 — `cmd/server/main.go`

**Execution flow:**
```
func main() {
    1.  Load .env file (godotenv — dev only, skip in production)
    2.  cfg := config.Load()  — fail if missing required vars
    3.  Setup slog logger (JSON in prod, text in dev)
    4.  ctx := context.Background()
    5.  pool := database.Connect(ctx, cfg.DatabaseURL)  — fail if can't connect
    6.  defer pool.Close()
    7.  supaClient := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey)

    // Wire repositories
    8.  branchRepo := repository.NewBranchRepo(pool)
        userRepo := repository.NewUserRepo(pool)
        deviceRepo := repository.NewDeviceRepo(pool)
        shiftRepo := repository.NewShiftRepo(pool)
        floorAreaRepo := repository.NewFloorAreaRepo(pool)
        tableRepo := repository.NewTableRepo(pool)
        categoryRepo := repository.NewCategoryRepo(pool)
        menuItemRepo := repository.NewMenuItemRepo(pool)
        modifierRepo := repository.NewModifierRepo(pool)
        customerRepo := repository.NewCustomerRepo(pool)
        reservationRepo := repository.NewReservationRepo(pool)
        orderRepo := repository.NewOrderRepo(pool)
        discountRepo := repository.NewDiscountRepo(pool)
        inventoryRepo := repository.NewInventoryRepo(pool)
        supplierRepo := repository.NewSupplierRepo(pool)
        purchaseRepo := repository.NewPurchaseRepo(pool)
        auditRepo := repository.NewAuditRepo(pool)
        taxConfigRepo := repository.NewTaxConfigRepo(pool)
        statsRepo := repository.NewStatisticsRepo(pool)

    // Wire services
    9.  branchSvc := service.NewBranchService(branchRepo, auditRepo)
        userSvc := service.NewUserService(userRepo, auditRepo, supaClient)
        deviceSvc := service.NewDeviceService(deviceRepo, auditRepo)
        shiftSvc := service.NewShiftService(shiftRepo, auditRepo)
        tableSvc := service.NewTableService(tableRepo, floorAreaRepo, auditRepo)
        categorySvc := service.NewCategoryService(categoryRepo, auditRepo)
        menuSvc := service.NewMenuService(menuItemRepo, inventoryRepo, branchRepo, auditRepo)
        modifierSvc := service.NewModifierService(modifierRepo, auditRepo)
        customerSvc := service.NewCustomerService(customerRepo, auditRepo)
        reservationSvc := service.NewReservationService(reservationRepo, tableRepo, auditRepo)
        orderSvc := service.NewOrderService(orderRepo)
        discountSvc := service.NewDiscountService(discountRepo, auditRepo)
        inventorySvc := service.NewInventoryService(inventoryRepo, auditRepo)
        supplySvc := service.NewSupplyService(supplierRepo, purchaseRepo, inventoryRepo, auditRepo)
        auditSvc := service.NewAuditService(auditRepo)
        statsSvc := service.NewStatisticsService(statsRepo)

    // Wire handlers
    10. branchHandler := handler.NewBranchHandler(branchSvc)
        userHandler := handler.NewUserHandler(userSvc)
        deviceHandler := handler.NewDeviceHandler(deviceSvc)
        shiftHandler := handler.NewShiftHandler(shiftSvc)
        tableHandler := handler.NewTableHandler(tableSvc)
        categoryHandler := handler.NewCategoryHandler(categorySvc)
        menuHandler := handler.NewMenuHandler(menuSvc)
        modifierHandler := handler.NewModifierHandler(modifierSvc)
        customerHandler := handler.NewCustomerHandler(customerSvc)
        reservationHandler := handler.NewReservationHandler(reservationSvc)
        orderHandler := handler.NewOrderHandler(orderSvc)
        discountHandler := handler.NewDiscountHandler(discountSvc)
        inventoryHandler := handler.NewInventoryHandler(inventorySvc)
        supplyHandler := handler.NewSupplyHandler(supplySvc)
        auditHandler := handler.NewAuditHandler(auditSvc)
        statsHandler := handler.NewStatisticsHandler(statsSvc)

    // Auth middleware with user lookup
    11. userLookup := func(ctx context.Context, supabaseID string) (*middleware.AuthUser, error) {
            user, err := userRepo.GetBySupabaseID(ctx, supabaseID)
            if err != nil { return nil, err }
            return &middleware.AuthUser{
                SupabaseID: user.SupabaseAuthID,
                UserID:     user.ID,
                RoleID:     user.RoleID,
                RoleName:   user.RoleName,
                BranchID:   user.BranchID,
                Name:       user.Name,
                Email:      *user.Email,
            }, nil
        }
        authMW := middleware.Auth(cfg.SupabaseJWTSecret, userLookup)

    // Setup Gin
    12. if !cfg.IsDevelopment() {
            gin.SetMode(gin.ReleaseMode)
        }
        r := gin.New()  // not Default() — we add our own middleware
        r.Use(middleware.Recovery(logger))
        r.Use(middleware.Logging(logger))
        r.Use(middleware.CORS(cfg.CORSAllowedOrigins))

    // Health check (no auth)
    13. r.GET("/health", func(c *gin.Context) {
            c.JSON(200, gin.H{"status": "ok"})
        })

    // Register all routes
    14. handler.RegisterRoutes(r, authMW, /* all handlers */)

    // Graceful shutdown
    15. srv := &http.Server{Addr: ":" + cfg.Port, Handler: r}
        go func() { srv.ListenAndServe() }()

        quit := make(chan os.Signal, 1)
        signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
        <-quit

        logger.Info("shutting down server...")
        shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
        defer cancel()
        srv.Shutdown(shutdownCtx)
        pool.Close()
        logger.Info("server stopped")
}
```

---

## 8. Phase 7 — Testing & Verification

### Step 7.1 — Compile & Vet
```bash
go mod tidy
go build ./...
go vet ./...
```

### Step 7.2 — Manual Smoke Tests

| # | Test | Expected |
|---|------|----------|
| 1 | `GET /health` | 200 `{"status":"ok"}` |
| 2 | `GET /api/v1/branches` (no token) | 401 |
| 3 | `GET /api/v1/branches` (valid admin token) | 200 with branches list |
| 4 | `POST /api/v1/branches` (cashier token) | 403 |
| 5 | `POST /api/v1/users` (create with password) | 201, user appears in Supabase Auth + DB |
| 6 | `POST /api/v1/shifts/open` | 201, shift created |
| 7 | `POST /api/v1/shifts/:id/close` | 200, cash_difference computed |
| 8 | `POST /api/v1/inventory/adjust` | 200, movement record created |
| 9 | `POST /api/v1/purchases/:id/receive` | 200, inventory updated |
| 10 | `GET /api/v1/statistics/dashboard` | 200 with aggregated stats |
| 11 | `GET /api/v1/audit-logs` | 200 with log entries from previous operations |

### Step 7.3 — Future Enhancements (Not in Initial Build)
- [ ] Unit tests with mocked repositories (interfaces + testify)
- [ ] Integration tests with test database
- [ ] Rate limiting middleware
- [ ] Request ID middleware for tracing
- [ ] Image upload for menu items → Supabase Storage
- [ ] WebSocket for real-time KOT updates
- [ ] Export reports to CSV/PDF
- [ ] Webhook notifications (low stock alerts, shift close)
- [ ] API versioning strategy (v2 namespace)

---

## 9. Full API Endpoint Reference

| # | Method | Path | Auth | Roles | Purpose |
|---|--------|------|------|-------|---------|
| 1 | GET | `/health` | ❌ | — | Health check |
| **Branches** |
| 2 | GET | `/api/v1/branches` | ✅ | admin, manager | List branches |
| 3 | GET | `/api/v1/branches/:id` | ✅ | admin, manager | Get branch |
| 4 | POST | `/api/v1/branches` | ✅ | admin | Create branch |
| 5 | PUT | `/api/v1/branches/:id` | ✅ | admin | Update branch |
| 6 | DELETE | `/api/v1/branches/:id` | ✅ | admin | Deactivate branch |
| **Users** |
| 7 | GET | `/api/v1/users` | ✅ | admin, manager | List users |
| 8 | GET | `/api/v1/users/me` | ✅ | all staff | Get own profile |
| 9 | GET | `/api/v1/users/:id` | ✅ | admin, manager | Get user |
| 10 | POST | `/api/v1/users` | ✅ | admin, manager | Create user (Supabase Auth + DB) |
| 11 | PUT | `/api/v1/users/:id` | ✅ | admin, manager | Update user |
| 12 | PATCH | `/api/v1/users/:id/deactivate` | ✅ | admin | Deactivate user |
| **Devices** |
| 13 | GET | `/api/v1/devices` | ✅ | admin, manager | List devices |
| 14 | POST | `/api/v1/devices` | ✅ | admin, manager | Register device |
| 15 | PUT | `/api/v1/devices/:id` | ✅ | admin, manager | Update device |
| 16 | PATCH | `/api/v1/devices/:id/status` | ✅ | admin, manager | Change device status |
| **Shifts** |
| 17 | GET | `/api/v1/shifts` | ✅ | all staff | List shifts |
| 18 | GET | `/api/v1/shifts/:id` | ✅ | all staff | Get shift |
| 19 | GET | `/api/v1/shifts/:id/summary` | ✅ | all staff | Get shift financial summary |
| 20 | POST | `/api/v1/shifts/open` | ✅ | all staff | Open shift |
| 21 | POST | `/api/v1/shifts/:id/close` | ✅ | all staff | Close shift (computes cash) |
| **Floor Areas** |
| 22 | GET | `/api/v1/floor-areas` | ✅ | admin, manager | List floor areas |
| 23 | POST | `/api/v1/floor-areas` | ✅ | admin, manager | Create floor area |
| 24 | PUT | `/api/v1/floor-areas/:id` | ✅ | admin, manager | Update floor area |
| 25 | DELETE | `/api/v1/floor-areas/:id` | ✅ | admin, manager | Delete floor area |
| **Tables** |
| 26 | GET | `/api/v1/tables` | ✅ | admin, manager | List tables |
| 27 | GET | `/api/v1/tables/:id` | ✅ | admin, manager | Get table |
| 28 | POST | `/api/v1/tables` | ✅ | admin, manager | Create table |
| 29 | PUT | `/api/v1/tables/:id` | ✅ | admin, manager | Update table |
| 30 | PATCH | `/api/v1/tables/:id/status` | ✅ | admin, manager | Change table status |
| 31 | DELETE | `/api/v1/tables/:id` | ✅ | admin, manager | Soft-delete table |
| **Categories** |
| 32 | GET | `/api/v1/categories` | ✅ | admin, manager | Flat list |
| 33 | GET | `/api/v1/categories/tree` | ✅ | admin, manager | Nested tree |
| 34 | GET | `/api/v1/categories/:id` | ✅ | admin, manager | Get category |
| 35 | POST | `/api/v1/categories` | ✅ | admin, manager | Create category |
| 36 | PUT | `/api/v1/categories/:id` | ✅ | admin, manager | Update category |
| 37 | DELETE | `/api/v1/categories/:id` | ✅ | admin, manager | Soft-delete category |
| **Menu Items** |
| 38 | GET | `/api/v1/menu-items` | ✅ | admin, manager | List with filters |
| 39 | GET | `/api/v1/menu-items/:id` | ✅ | admin, manager | Get with modifiers |
| 40 | POST | `/api/v1/menu-items` | ✅ | admin, manager | Create item |
| 41 | PUT | `/api/v1/menu-items/:id` | ✅ | admin, manager | Update item |
| 42 | PATCH | `/api/v1/menu-items/:id/availability` | ✅ | admin, manager | Toggle availability |
| 43 | DELETE | `/api/v1/menu-items/:id` | ✅ | admin, manager | Soft-delete item |
| **Modifier Groups** |
| 44 | GET | `/api/v1/modifier-groups` | ✅ | admin, manager | List groups + modifiers |
| 45 | GET | `/api/v1/modifier-groups/:id` | ✅ | admin, manager | Get group |
| 46 | POST | `/api/v1/modifier-groups` | ✅ | admin, manager | Create group |
| 47 | PUT | `/api/v1/modifier-groups/:id` | ✅ | admin, manager | Update group |
| 48 | DELETE | `/api/v1/modifier-groups/:id` | ✅ | admin, manager | Delete group |
| 49 | POST | `/api/v1/modifier-groups/:id/modifiers` | ✅ | admin, manager | Add modifier to group |
| **Modifiers** |
| 50 | PUT | `/api/v1/modifiers/:id` | ✅ | admin, manager | Update modifier |
| 51 | DELETE | `/api/v1/modifiers/:id` | ✅ | admin, manager | Delete modifier |
| **Menu ↔ Modifier Links** |
| 52 | POST | `/api/v1/menu-items/:id/modifier-groups` | ✅ | admin, manager | Assign group to item |
| 53 | DELETE | `/api/v1/menu-items/:itemId/modifier-groups/:groupId` | ✅ | admin, manager | Unassign group |
| **Customers** |
| 54 | GET | `/api/v1/customers` | ✅ | admin, manager, cashier | List/search customers |
| 55 | GET | `/api/v1/customers/:id` | ✅ | admin, manager, cashier | Get customer |
| 56 | POST | `/api/v1/customers` | ✅ | admin, manager, cashier | Create customer |
| 57 | PUT | `/api/v1/customers/:id` | ✅ | admin, manager, cashier | Update customer |
| **Reservations** |
| 58 | GET | `/api/v1/reservations` | ✅ | admin, manager, cashier | List reservations |
| 59 | GET | `/api/v1/reservations/:id` | ✅ | admin, manager, cashier | Get reservation |
| 60 | POST | `/api/v1/reservations` | ✅ | admin, manager, cashier | Create reservation |
| 61 | PUT | `/api/v1/reservations/:id` | ✅ | admin, manager, cashier | Update reservation |
| 62 | PATCH | `/api/v1/reservations/:id/status` | ✅ | admin, manager, cashier | Change status |
| **Orders (read-only)** |
| 63 | GET | `/api/v1/orders` | ✅ | admin, manager | List orders (transactions) |
| 64 | GET | `/api/v1/orders/:id` | ✅ | admin, manager | Get full order detail |
| **Discounts** |
| 65 | GET | `/api/v1/discounts` | ✅ | admin, manager | List all discounts |
| 66 | GET | `/api/v1/discounts/active` | ✅ | admin, manager | List active discounts |
| 67 | GET | `/api/v1/discounts/:id` | ✅ | admin, manager | Get discount |
| 68 | POST | `/api/v1/discounts` | ✅ | admin, manager | Create discount |
| 69 | PUT | `/api/v1/discounts/:id` | ✅ | admin, manager | Update discount |
| 70 | DELETE | `/api/v1/discounts/:id` | ✅ | admin, manager | Deactivate discount |
| **Inventory** |
| 71 | GET | `/api/v1/inventory` | ✅ | admin, manager | List stock levels |
| 72 | GET | `/api/v1/inventory/low-stock` | ✅ | admin, manager | Low stock alerts |
| 73 | POST | `/api/v1/inventory/adjust` | ✅ | admin, manager | Manual adjustment |
| 74 | PATCH | `/api/v1/inventory/:id/threshold` | ✅ | admin, manager | Update low stock threshold |
| 75 | GET | `/api/v1/inventory/:id/movements` | ✅ | admin, manager | Stock movement history |
| **Suppliers** |
| 76 | GET | `/api/v1/suppliers` | ✅ | admin, manager | List suppliers |
| 77 | GET | `/api/v1/suppliers/:id` | ✅ | admin, manager | Get supplier |
| 78 | POST | `/api/v1/suppliers` | ✅ | admin, manager | Create supplier |
| 79 | PUT | `/api/v1/suppliers/:id` | ✅ | admin, manager | Update supplier |
| **Purchases** |
| 80 | GET | `/api/v1/purchases` | ✅ | admin, manager | List purchase orders |
| 81 | GET | `/api/v1/purchases/:id` | ✅ | admin, manager | Get purchase detail |
| 82 | POST | `/api/v1/purchases` | ✅ | admin, manager | Create purchase order |
| 83 | POST | `/api/v1/purchases/:id/receive` | ✅ | admin, manager | Receive goods → update inventory |
| 84 | PATCH | `/api/v1/purchases/:id/cancel` | ✅ | admin, manager | Cancel purchase |
| **Audit Logs (read-only)** |
| 85 | GET | `/api/v1/audit-logs` | ✅ | admin, manager | List audit logs |
| 86 | GET | `/api/v1/audit-logs/record/:table/:recordId` | ✅ | admin, manager | Record change history |
| **Statistics** |
| 87 | GET | `/api/v1/statistics/dashboard` | ✅ | admin, manager | Dashboard overview |
| 88 | GET | `/api/v1/statistics/sales` | ✅ | admin, manager | Sales report |
| 89 | GET | `/api/v1/statistics/revenue-by-category` | ✅ | admin, manager | Revenue by category |
| 90 | GET | `/api/v1/statistics/top-items` | ✅ | admin, manager | Top selling items |
| 91 | GET | `/api/v1/statistics/payment-methods` | ✅ | admin, manager | Payment breakdown |
| 92 | GET | `/api/v1/statistics/cash-flow` | ✅ | admin, manager | Cash flow summary |
| 93 | GET | `/api/v1/statistics/shifts/:id` | ✅ | admin, manager | Shift financial report |

**Total: 93 endpoints**

---

## 10. Security & Architecture Decisions

| Concern | Decision |
|---------|----------|
| **Authentication** | Supabase JWT verified on every request via middleware. Token `sub` → look up user in DB. |
| **Authorization** | RBAC middleware per route group. 4 roles: admin > manager > cashier > chef. |
| **Password storage** | Supabase Auth handles this (bcrypt). We never see or store passwords. |
| **PIN codes** | Hashed with `golang.org/x/crypto/bcrypt` before INSERT/UPDATE. Never exposed in JSON (`json:"-"`). |
| **SQL injection** | 100% parameterized queries via pgx (`$1`, `$2`). Zero string interpolation. |
| **Input validation** | Gin's `binding` tags on all request DTOs. `DisallowUnknownFields()` where appropriate. |
| **CORS** | Configurable origins list. No `*` in production. |
| **Panic recovery** | Middleware catches panics → log stack → return JSON 500. |
| **Audit trail** | Every mutation writes to `audit_logs` with old/new values, user, IP, user-agent. |
| **Soft deletes** | Entities use `is_active = false` instead of `DELETE`. Data is never lost. |
| **Connection pooling** | pgxpool with 25 max / 5 min connections. Prevents exhaustion. |
| **Graceful shutdown** | `SIGINT`/`SIGTERM` → drain connections → close DB pool → exit cleanly. |
| **PowerSync compatibility** | We only write to Supabase PostgreSQL. PowerSync watches the DB for changes and syncs to the POS app automatically. No extra work needed from our side. |

---

## Go Dependencies

```
github.com/gin-gonic/gin             — HTTP framework
github.com/jackc/pgx/v5              — PostgreSQL driver + connection pool
github.com/golang-jwt/jwt/v5         — JWT parsing & validation
github.com/joho/godotenv             — .env file loading (dev only)
golang.org/x/crypto                  — bcrypt for PIN hashing
```
