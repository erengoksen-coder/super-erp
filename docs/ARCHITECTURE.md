# Architecture Documentation — Super ERP

## System Overview

Super ERP (Liva ERP) is a full-stack **Next.js 14** application serving both the frontend UI and backend API routes. It uses a local **SQLite** database via `better-sqlite3` and a custom JWT-based authentication system.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Database | SQLite via `better-sqlite3` |
| Authentication | Custom JWT (`jose`) |
| State Management | Zustand (client-side) |
| Data Fetching | SWR |
| Styling | Tailwind CSS + CSS Variables |
| Validation | Zod |
| Logging | Winston |
| Testing | Vitest + Testing Library |

---

## Directory Structure

```
super-erp/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # ~200+ REST API endpoints
│   │   ├── auth/         # Login, logout, register, refresh, me
│   │   ├── users/        # User management
│   │   ├── orders/       # Sales orders
│   │   ├── production/   # Production orders
│   │   └── ...           # All other domains
│   ├── dashboard/        # Admin dashboard
│   ├── auth/             # Login / register pages
│   ├── bayi/             # Dealer portal (RBAC isolated)
│   ├── layout.tsx        # Root layout (Providers wrapper)
│   ├── error.tsx         # Global error boundary
│   └── not-found.tsx     # Custom 404 page
├── components/           # Shared React components
│   ├── ui/               # Design system (Button, Card, Modal, etc.)
│   ├── Sidebar.tsx
│   ├── AuthGuard.tsx     # Client-side auth + RBAC enforcement
│   └── Providers.tsx     # App-wide context providers
├── lib/                  # Core business logic & utilities
│   ├── api/              # API helpers (handler, response, withAuth, rateLimit)
│   ├── auth/             # JWT, session, permissions
│   ├── database/         # SQLite connection & query helpers
│   ├── store/            # Zustand stores (authStore)
│   ├── validation/       # Zod schemas for all entities
│   ├── errors.ts         # Custom error classes (AppError, AuthError, etc.)
│   ├── logger.ts         # Winston logger (file + console)
│   ├── rate-limit.ts     # LRU-cache based rate limiting
│   ├── api-handler.ts    # Production-grade route wrapper
│   └── index.ts          # Barrel export
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
├── middleware.ts          # Next.js middleware (RBAC + rate limiting + CORS)
├── docs/                 # Project documentation
├── tests/                # Vitest test suite
├── scripts/              # Utility scripts (security-audit, migrations)
└── migrations/           # SQL migration files
```

---

## Authentication Flow

```
Client                     Server (middleware.ts)         API Routes
  │                               │                           │
  │── POST /api/auth/login ──────>│                           │
  │                               │── verify credentials ────>│
  │                               │<── set cookie (auth-token)│
  │<── redirect /dashboard ───────│                           │
  │                               │                           │
  │── GET /dashboard ────────────>│                           │
  │                               │── verifyToken(cookie) ───>│ (middleware.ts)
  │                               │── RBAC role check ────────│
  │<── render page ───────────────│                           │
  │                               │                           │
  │── GET /api/auth/me ──────────>│── withAuth() ────────────>│
  │<── { user, permissions } ─────│<─────────────────────────│
```

### Token Lifecycle
- **Access Token:** Short-lived JWT stored in `auth-token` HTTP-only cookie.
- **Refresh Token:** Stored in `refresh-token` cookie; used by `/api/auth/refresh` to issue a new access token.
- **Verification:** Every protected API route calls `withAuth()` → `getAuthUserPayload()` → `verifyToken()`.

---

## RBAC (Role-Based Access Control)

Implemented at two layers:

### 1. Middleware Layer (server-side, fast)
- `middleware.ts` verifies the JWT and enforces `ROLE_DASHBOARDS` and `RESTRICTED_PATHS`.
- Unauthenticated users → redirect to `/auth/login`.
- Wrong role accessing restricted path → redirect to their own dashboard.

### 2. AuthGuard Layer (client-side, granular)
- `components/AuthGuard.tsx` verifies the session on every route change via `/api/auth/me`.
- Checks `user.permissions[]` for page-level `can_view`, `can_create`, `can_edit`, `can_delete`.

---

## API Route Pattern

All API routes follow this pattern:

```typescript
// Recommended pattern (existing routes)
export const GET = withAuth(async (request: NextRequest) => {
  return handleApi(async () => {
    // 1. Validate input
    // 2. Query DB with prepared statements
    // 3. Return ok() or fail()
  })
})
```

For new routes, use the enhanced `apiHandler` from `lib/api-handler.ts`:
```typescript
export const GET = apiHandler(async (req) => {
  // Throws AppError subclasses for typed HTTP status codes
  // Winston logging happens automatically
})
```

---

## Error Handling Strategy

```
Route throws ValidationError(400)
  ↓
handleApi / apiHandler catches it
  ↓
Maps to { success: false, error: "...", status: 400 }
  ↓
Winston logs as WARN (not ERROR)

Route throws generic Error
  ↓
Maps to { success: false, error: "Sunucu hatası", status: 500 }
  ↓
Winston logs as ERROR with stack trace
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite instead of Postgres | Single-machine deployment, zero infrastructure cost, sufficient for current scale |
| Custom JWT auth | Avoids NextAuth complexity; full control over session data and cookie strategy |
| Zustand for client state | Lightweight, no boilerplate, integrates well with SSR via `persist` + `safeStorage` |
| SWR for data fetching | Automatic caching, revalidation, and background updates |
| Root directory (not `src/`) | Planned migration to `src/` deferred to scaling phase |
