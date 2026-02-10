# Test ve Lint Komutları

Projede mevcut testler ve tek seferde çalıştırma komutları.

## Hızlı komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run check` | Lint + Jest testleri (önerilen) |
| `npm run lint` | ESLint (app, components, lib, vb.) |
| `npm run lint:fix` | ESLint + otomatik düzeltme |
| `npm run test` | Jest birim testleri |
| `npm run test:watch` | Jest izleme modu |
| `npm run test:coverage` | Jest + coverage raporu |
| `npm run test:rls` | RLS politikaları testi (DB gerekir) |
| `npm run test:rls:setup` | RLS test kullanıcıları kurulumu |
| `npm run test:all` | Jest + E2E (uygulama açık olmalı, E2E için env gerekebilir) |
| `npm run test:e2e` | Playwright E2E testleri |
| `npm run test:e2e:ui` | Playwright E2E (UI modu) |

## E2E testleri (Playwright)

- **Konum:** `e2e/*.spec.ts`
- **Çalıştırma (lokal):** Önce uygulama çalışıyor olmalı (`npm run dev:simple`), sonra ayrı terminalde `npm run test:e2e`.
- **İlk kurulum:** `npx playwright install chromium` (tarayıcı indirir).
- **Girişli test:** `PLAYWRIGHT_TEST_USER` ve `PLAYWRIGHT_TEST_PASSWORD` tanımlıysa “dashboard: giriş sonrası” testi çalışır; yoksa atlanır.
- **Ortam değişkeni (PowerShell):**
  ```powershell
  $env:PLAYWRIGHT_TEST_USER = "admin"
  $env:PLAYWRIGHT_TEST_PASSWORD = "admin1234"
  npm run test:e2e
  ```
  (Cmd/Bash: `PLAYWRIGHT_TEST_USER=admin PLAYWRIGHT_TEST_PASSWORD=admin1234 npm run test:e2e`)
- **CI:** GitHub Actions’ta `CI` job’ından sonra E2E job’ı çalışır (webServer otomatik başlar). Girişli testler için repo **Secrets** gerekir: **Settings → Secrets and variables → Actions** → `PLAYWRIGHT_TEST_USER`, `PLAYWRIGHT_TEST_PASSWORD`. Yoksa girişli modül testleri atlanır. "Tüm ana sayfalar açılır" testi bazen oturum yüklenemediği için atlanır; run yeşil kalır.
- **Komple sistem testi:** `npm run test:all` (önce Jest, sonra E2E). E2E için uygulama çalışıyor olmalı; girişli testler için `PLAYWRIGHT_TEST_USER` ve `PLAYWRIGHT_TEST_PASSWORD` tanımlayın. E2E tek girişle tüm modül sayfalarını (Siparişler, Stok, Üretim, Barkod, Faturalar, Sevkiyat, BOM, Cari, Finans, İK, Kullanıcılar, Ayarlar) kontrol eder.

## Jest test dosyaları (`tests/`)

- `tests/auth/password.test.ts` – Şifre doğrulama
- `tests/password-utilities.test.ts` – Şifre yardımcıları
- `tests/validation/schemas.test.ts` – Validasyon şemaları
- `tests/utils/errors.test.ts` – Hata yardımcıları
- `tests/components/module-placeholder.test.tsx` – Modül placeholder bileşeni
- `tests/rls/production-orders.test.ts` – Üretim siparişleri RLS

## Ne zaman çalıştırılmalı?

- **Her PR/commit öncesi:** `npm run check` (lint + test)
- **Sadece kod kalitesi:** `npm run lint` veya `npm run lint:fix`
- **Sadece testler:** `npm run test` veya `npm run test:coverage`

## Notlar

- `test:rls` ve `test:rls:setup` veritabanı bağlantısı ve Supabase/RLS ortamı gerektirir.
- Jest konfigürasyonu: `jest.config.json` (setup: `tests/setup.ts`).
- E2E (Playwright): `e2e/` — `npm run test:e2e`. TestSprite: `testsprite_tests/` (ayrı Python ortamı).
