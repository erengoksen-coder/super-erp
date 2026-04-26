# Güvenlik Özeti (Faz 4 – Sprint 4.1)

Bu belge auth, şifre, rol/izin ve rate limiting yapılandırmasını özetler.

---

## 1. Auth – tek yerde, tutarlı middleware

- **Mimari:** JWT tabanlı. NextAuth / Supabase Auth kullanılmıyor; özel JWT (jose) ile session yönetimi.
- **Token:** `auth-token` veya `access_token` cookie; API isteklerinde `Authorization: Bearer <token>` da kabul edilir.
- **Doğrulama:** `middleware.ts` tüm `/api/*` isteklerinde (public path’ler hariç) token kontrolü yapar; `lib/auth/jwt.ts` → `verifyToken()`. Sayfa isteklerinde cookie yoksa `/auth/login`’e yönlendirilir.
- **Tek giriş noktası:** Auth fonksiyonları `lib/auth/index.ts` üzerinden export edilir: `verifyToken`, `getCurrentUser`, `hashPassword`, `verifyPassword`, `isAdminRole`, `canAccessPath`, vb. Route’lar `@/lib/auth/jwt` veya `@/lib/auth` import edebilir.

**Ortam değişkeni:** `JWT_SECRET` (en az 16 karakter) zorunlu.

---

## 2. Şifre – bcrypt, salt round ayarı

- **Dosya:** `lib/auth/password.ts`
- **Algoritma:** bcrypt (bcryptjs). Maksimum parola uzunluğu 72 bayt (OWASP); daha uzun parolalar reddedilir.
- **Salt round:** Varsayılan 10. Ortam değişkeni `BCRYPT_SALT_ROUNDS` (10–14 arası) ile yapılandırılabilir. 14 üstü CPU maliyeti nedeniyle önerilmez.
- **Eski hash:** SHA-256 ile hash’lenmiş eski kayıtlar `verifyPassword` içinde tanınır ve doğrulanabilir (geçiş dönemi).

---

## 3. Hassas API’lerde rol/izin kontrolü

- **Dosya:** `lib/auth/permissions-check.ts` (ve `lib/auth/permissions.ts` – DB’den izin yükleme)
- **Fonksiyonlar:** `isAdminRole(role)` (admin, manager, planlama, yönetici tam erişim), `canAccessPath(permissions, pathname, action)` (view/create/edit/delete).
- **Kullanım:** Admin-only route’larda (örn. `app/api/admin/backup-status`, `app/api/admin/messaging/conversations`) `getCurrentUser()` sonrası `isAdminRole(user.role)` kontrolü yapılır. Sayfa menüsü Sidebar’da `canAccessPath(permissions, path, 'view')` ile filtrelenir.
- **JWT payload:** Login/refresh sırasında kullanıcı izinleri (`permissions`) token’a eklenir; istemci ve API tarafında rol/izin tutarlı kullanılır.

---

## 4. Rate limiting

- **Dosya:** `lib/api/rateLimit.ts`; uygulama yeri: `middleware.ts`
- **Kotalar:**
  - Genel API: 1500 istek/dakika (IP bazlı)
  - `/api/auth/login`, `/api/auth/register`: 20/dakika
  - `/api/auth/me`, `/api/auth/refresh`: 500/dakika
  - `/api/admin/*`: 100/dakika
- **Diğer:** `app/api/auth/forgot-password` 5/dakika; `app/api/users/[id]/change-password` rate limit'li. Export endpoint'leri `getExportLimits` ile kullanıcı/rol bazlı sınır kullanır.
- **Yanıt:** Limit aşılırsa 429, `Retry-After` ve `x-ratelimit-*` header’ları dönülür.

---

## 5. CSRF değerlendirmesi

- **Mevcut durum:** API’ler cookie tabanlı JWT veya `Authorization: Bearer` kullanıyor. SameSite cookie (varsayılan) cross-site form POST’larında cookie gönderimini sınırlar.
- **Kritik işlemler:** Para transferi, şifre değiştirme, rol değişikliği gibi endpoint’lerde mevcut token + middleware auth zorunlu; ek olarak isteğe bağlı CSRF token veya double-submit cookie değerlendirilebilir.
- **Öneri:** Şu an için SameSite + JWT ile devam; ileride kritik endpoint’lere CSRF token eklenebilir (Faz 4 takip tablosunda “değerlendirme” olarak işaretlendi).

---

## 6. Audit log

- **Dosya:** `lib/audit.ts` → `logAudit(db, { tableName, action, recordId, userId, before, after })`; kayıtlar `audit_logs` tablosunda.
- **Kapsam:** Kullanıcı oluşturma/güncelleme/silme, sipariş CRUD, satın alma talepleri, iş emirleri, üretim iptali, admin temizlik loglanıyor. Üretim servisi station geçişlerinde de log yazar.
- **Görüntüleme:** `GET /api/admin/audit-log` (sadece admin); `app/admin/audit-logs` sayfası.

---

## 7. İlgili dosyalar

| Dosya | Açıklama |
|-------|----------|
| `middleware.ts` | Rate limit, JWT doğrulama, public path’ler, bakım modu |
| `lib/auth/index.ts` | Auth modülü tek giriş noktası |
| `lib/auth/jwt.ts` | Token oluşturma/doğrulama |
| `lib/auth/password.ts` | bcrypt hash/verify, salt round |
| `lib/auth/permissions-check.ts` | isAdminRole, canAccessPath |
| `lib/auth/permissions.ts` | loadUserPermissions (DB) |
| `lib/api/rateLimit.ts` | IP bazlı rate limit |

Detaylı geliştirme önerileri: `docs/GUVENLI_GELISTIRME_ONERILERI.md`, `docs/PAROLA_GUVENLIGI_ANALIZ.md`.
