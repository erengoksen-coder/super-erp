# Proje Hata ve Eksikler Raporu

**Tarih:** 2025  
**Build:** Next.js 16.1.1 – `npm run build` başarılı (tip doğrulaması atlanıyor).

---

## 1. Düzeltilen Hata (Build’i Düşüren)

### useSearchParams + Suspense (`/auth/login`)
- **Sorun:** `useSearchParams()` kullanılan sayfa statik üretim sırasında hata veriyordu; Next.js bu hook’un bir Suspense sınırı içinde kullanılmasını istiyor.
- **Yapılan:** Login sayfası `LoginForm` ve `LoginPage` olarak ayrıldı; `LoginPage` artık `<Suspense fallback={...}><LoginForm /></Suspense>` döndürüyor.
- **Sonuç:** Build başarıyla tamamlanıyor.

---

## 2. Build Uyarısı (Henüz Kırıcı Değil)

### Middleware → Proxy
- **Mesaj:** `"middleware" file convention is deprecated. Please use "proxy" instead.`
- **Anlam:** İleride Next.js, `middleware.ts` yerine “proxy” kullanımına geçecek. Şu an sadece uyarı.
- **Öneri:** Next.js dokümantasyonundaki proxy geçiş rehberini takip ederek ileride taşıyabilirsiniz.

---

## 3. TypeScript Hataları (tsc --noEmit)

Build sırasında **“Skipping validation of types”** olduğu için bu hatalar build’i durdurmuyor; ancak `npx tsc --noEmit` çalıştırıldığında görünüyor.

| Dosya | Sorun (kısa) |
|-------|----------------|
| `app/accounts/page.tsx` | number ile string karşılaştırması (97–98) |
| `app/api/hr/attendance/route.ts` | `check_in` property type 'never' üzerinde yok (95) |
| `app/api/materials/[id]/route.ts` | MaterialRow: stock_amount number \| null uyumsuzluğu (210) |
| `app/api/shipments/[id]/tax/route.ts` | `id` property type '{}' üzerinde yok (121) |
| `app/inventory/materials/page.tsx` | unknown[] → Material[] atanması (293) |
| `app/inventory/page.tsx` | `id`, `code` type '{}' üzerinde yok (268–270) |
| `app/inventory/products/print-barcode-label/page.tsx` | `visibility: "visible !important"` tipi (470, 555) |
| `app/orders/page.tsx` | usePolling(mutate) – KeyedMutator tipi (120) |
| `app/production/calendar/page.tsx` | ProductionOrder current_station/sku null/undefined uyumsuzluğu (209) |
| `app/shipments/page.tsx` | usePolling(mutate) – KeyedMutator tipi (159) |
| `components/GlobalBarcodeListener.tsx` | BarcodeApiItem'da production_order_id yok (98) |
| `components/NotificationToaster.tsx` | Argument type – description objesi vs string (30) |
| `components/Sidebar.tsx` | Permission tipi – can_create, can_edit, can_delete eksik (210, 212, 218) |
| `lib/api/validate.ts` | parseJsonBody beklenen argüman sayısı (4) |
| `lib/api/withAuth.ts` | Property 'constructor' type 'never' (74, 78) |
| `lib/cache/memory.ts` | Generic constraint '{}' (3) |
| `lib/hooks/useNotifications.ts` | payload implicitly any (42) |
| `lib/hooks/useOptimizedRealtime.ts` | payload/status implicitly any (94, 108) |
| `lib/hooks/useRealtime.ts` | payload implicitly any (76) |
| `lib/repositories/accounts.ts` | insert/update implicit any return (113, 196) |
| `lib/validation/schemas.ts` | z.enum errorMap / overload (37) |

**Öneri:**  
- `tsconfig.json` içinde `"strict": true` ve benzeri açıksa, bu dosyalarda tipleri düzeltmek veya geçici olarak ilgili satırlarda `// @ts-expect-error` / `as` kullanmak.  
- Uzun vadede her dosya için doğru interface/type tanımları yapılması daha sağlıklı.

---

## 4. Diğer useSearchParams Kullanan Sayfalar

Aşağıdaki sayfalar da `useSearchParams()` kullanıyor; build şu an geçiyor (muhtemelen statik üretime alınmıyorlar). İleride benzer prerender hataları çıkarsa aynı Suspense sarmalayıcı yöntemi uygulanabilir:

- `app/inventory/products/print-barcode-label/page.tsx`
- `app/shipments/page.tsx`
- `app/shipments/new/page.tsx`
- `app/mobile/workstation/station/page.tsx`
- `app/hr/clock/page.tsx`
- `app/mobile/material-stock/page.tsx`
- `app/production/new/page.tsx`
- `app/inventory/products/print-label/page.tsx`
- `app/mobile/phone-scanner/page.tsx`

---

## 5. Ortam Değişkenleri

- `.env.example` içinde `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV` tanımlı.
- `lib/auth/jwt.ts` çalışma anında `JWT_SECRET` yoksa hata fırlatıyor; production’da mutlaka set edilmeli.
- Ngrok için `NGROK_AUTHTOKEN` ve `APP_PUBLIC_URL` opsiyonel olarak dokümante.

---

## 6. Özet

| Kategori | Durum |
|----------|--------|
| Build | Başarılı (login Suspense düzeltmesi sonrası) |
| Lint | Hata yok |
| TypeScript (strict) | 25+ hata (build’i kırmıyor) |
| Middleware | Deprecation uyarısı (proxy’e geçiş) |
| useSearchParams | Sadece login düzeltildi; diğer sayfalar izlenmeli |

İsterseniz bir sonraki adımda TypeScript hatalarını dosya dosya düzeltebilir veya sadece belirli modüllere (örn. `lib/`, `app/api/`) odaklanabiliriz.
