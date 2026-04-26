# Mevcut Mimari (Super ERP)

Bu belge, Faz 1 sonrası güncel mimari özetidir. Detaylı yol haritası için [YOL_HARITASI.md](YOL_HARITASI.md) kullanılır.

---

## Genel bakış

- **Stack:** Next.js (App Router), React, TypeScript, SQLite (better-sqlite3)
- **Veritabanı:** Tek veritabanı — `data/erp.db` (ortam değişkeni `DATABASE_PATH` ile override edilebilir)
- **Auth:** JWT (cookie + Bearer), rol/izin tabanlı erişim

---

## Kök yapı

| Dizin | Açıklama |
|-------|----------|
| `app/` | Next.js App Router: sayfalar (`page.tsx`), layout'lar, API route'ları (`app/api/**/route.ts`) |
| `components/` | Paylaşılan React bileşenleri (ui/, layout, sidebar, vb.) |
| `lib/` | Veritabanı, auth, API client, yardımcı kütüphaneler |
| `types/` | TypeScript tip tanımları (Order, Product, User, ApiResponse vb.) |
| `public/` | Statik dosyalar |
| `docs/` | Tüm teknik dokümantasyon |
| `scripts/` | Node.js scriptleri (migrate, test vb.) |
| `scripts/windows/` | Windows PowerShell (`.ps1`) ve Batch (`.bat`) — sunucu, ngrok, tünel, baslat |
| `e2e/` | Playwright E2E testleri |
| `data/` | SQLite veritabanı dosyası (`erp.db`) — uygulama tarafından yazılır |

Kök yapı ve script konumları ayrıntılı: [GELISTIRME.md](GELISTIRME.md).

---

## Veritabanı

- **Modül:** `lib/database/db.ts`
- **Motor:** better-sqlite3, tek instance (`getDatabase()`)
- **Dosya:** `data/erp.db` (varsayılan); `DATABASE_PATH` ile değiştirilebilir
- **Pragmalar:** WAL, foreign_keys ON, busy_timeout, cache_size
- **Kullanım:** API route'lar doğrudan `getDatabase()` ile `db.prepare(...).get()/all()/run()` kullanır; henüz repository katmanı yok (Faz 2 hedefi)

---

## API katmanı

- **Route konumu:** `app/api/**/route.ts` — GET/POST/PUT/PATCH/DELETE export edilir
- **Auth sarmalayıcı:** `lib/api/withAuth.ts` — `withAuth(handler, allowedRoles?)` ile JWT doğrulama ve `AuthUser` (userId, role) handler’a geçirilir
- **Yanıt:** `lib/api/response.ts` — `ok(data, options?)`, `fail(message, options?)`; tutarlı `{ success, data?, error?, message?, meta? }` formatı
- **Body parsing:** `lib/api/validate.ts` — `parseJsonBody(request, schema?)` (Zod şema opsiyonel)
- **Fetch:** `lib/api/client.ts` — `fetchApi<T>()`; 401’de redirect yapmayan `safeFetch()` bildirim/portal için

API özeti: [API_OVERVIEW.md](API_OVERVIEW.md).

---

## Kimlik doğrulama ve yetki

- **JWT:** `lib/auth/jwt.ts` — token üretimi/doğrulama; session token tek oturum için kullanılır
- **Oturum:** `lib/auth/session.ts` — cookie ve DB ile uyumlu
- **Yetkiler:** `lib/auth/permissions-check.ts` — `canAccessPath`, rol kontrolü; `withAuthAndPermission(handler, path, action)` ile route koruma
- **Bayi filtresi:** `lib/auth/bayi-filter.ts` — bayi rolü için veri kısıtlaması

---

## Frontend

- **Sayfalar:** `app/**/page.tsx` — dashboard, orders, invoices, production, bayi portalı vb.
- **Layout:** `app/layout.tsx`, `components/MainShell.tsx`, `components/Sidebar.tsx`
- **Veri:** `fetchApi()` (auth ile), `safeFetch()` (401’de redirect olmadan); SWR kullanılan yerlerde `mutate` ile güncelleme
- **Durum:** Zustand (auth store vb.), yerel React state

---

## Faz 1 sonrası durum

- Kök dizin sadeleştirildi; scriptler `scripts/windows/` altında
- Lint/TS: `lib` ve `app/api` ile `app`/`components` içinde catch/error tipleri ve birçok `any` düzeltildi
- Dokümantasyon: GELISTIRME.md (kök yapı, scriptler), MEVCUT_MIMARI.md (bu dosya), YOL_HARITASI.md (Faz 1–4)

Faz 2’de repository katmanı ve API validasyonu hedeflenir; detay [YOL_HARITASI.md](YOL_HARITASI.md) içindedir.
