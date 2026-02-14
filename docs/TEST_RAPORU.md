# Uygulama Test Raporu

Bu rapor, programın her aşamasının test edilmesi ve canlı çalışmayan / hata veren yerlerin tespiti için oluşturulmuştur.

## Yapılan Testler

### 1. Birim testleri (Jest)

- **Komut:** `npm test`
- **Sonuç:** Tümü geçti (6 suite, 57 test).
- **Düzeltme:** `tests/utils/errors.test.ts` Vitest (`vi`) yerine Jest (`jest`) kullanacak şekilde güncellendi; böylece test suite hata vermeden çalışıyor.

### 2. E2E testleri (Playwright)

- **Komut:** `npx playwright test`
- **Sonuç:** Oturumsuz testler geçti (login sayfası, yönlendirme, hatalı giriş). Oturum gerektiren testler `PLAYWRIGHT_TEST_USER` / `PLAYWRIGHT_TEST_PASSWORD` tanımlı değilse atlanıyor (23 skipped).
- **Not:** Tam E2E akışları için `.env` veya ortam değişkenlerinde test kullanıcısı tanımlanmalı.

### 3. Sayfa ve API canlı kontrolü

- **Komut:** `node scripts/test-pages-and-apis.js http://localhost:3000`
- **Koşul:** Sunucu çalışıyor olmalı (`npm run dev:simple` veya `npm run dev`).
- **Kontrol edilenler:**
  - Ana sayfalar: `/`, `/auth/login`, `/dashboard`, `/orders`, `/production`, `/invoices`, `/shipments`, `/accounts`, `/payments`, `/inventory`, `/bom`, `/barcodes`, `/finance`, `/hr`, `/users`, `/settings`, `/notifications`, `/reports/stock-movements`, `/finance/journal-entries` vb.
  - Oturumsuz API: `/api/health`, `/api/auth/ping`, `/api/auth/login`
  - Oturum gerektiren API: `/api/auth/me`, `/api/dashboard/stats`, `/api/orders`, `/api/invoices`, `/api/accounts`, `/api/shipments` (401 beklenir)

## Tespit Edilen ve Düzeltilen Hatalar

### 1. Faturalar sayfası 500 hatası (düzeltildi)

- **Dosya:** `app/invoices/page.tsx`
- **Sebep:** `<EmptyState>` bileşeninde `action` prop’u kapatılmamıştı; `/>` öncesi `}` eksikti, bu da derleme (parse) hatasına ve sayfanın 500 dönmesine yol açıyordu.
- **Düzeltme:** `action={ ... }` ifadesi `}` ile kapatıldı; `/>` sadece `<EmptyState />` kapanışı olacak şekilde düzenlendi.
- **Not:** Bu derleme hatası varken Next.js tüm isteklere (ör. `/api/health`) 500 dönüyordu; faturalar düzeltilince health ve diğer sayfalar da normale döndü.

## Test Sonuçları Özeti (düzeltme sonrası)

| Kategori              | Sonuç |
|-----------------------|--------|
| Sayfalar (GET)        | 20 sayfa 200 OK, 1 sayfa 302 (yönlendirme). |
| API health/ping/login | 200 / 200 / 400 (login body eksik 400 normal). |
| API (auth gerekli)    | Beklendiği gibi 401 (yetkisiz). |
| Jest birim testleri   | Tümü geçti. |
| E2E (oturumsuz)       | Geçti. |

## Önerilen Test Akışı

1. **Geliştirme öncesi/sonrası:**  
   `npm test`  
   `node scripts/test-pages-and-apis.js http://localhost:3000`

2. **Playwright ile test verisi girerek (sırayla form akışları):**  
   Test kullanıcısı: veritabanındaki varsayılan admin (şifre: `admin1234`).  
   **PowerShell:**  
   `$env:PLAYWRIGHT_TEST_USER="admin"; $env:PLAYWRIGHT_TEST_PASSWORD="admin1234"; npx playwright test e2e/test-data-flows.spec.ts`  
   Bu spec: giriş, dashboard, sipariş formuna test verisi (bayi, müşteri, ürün, miktar), yeni cari hesap formu, faturalar/stok/üretim sayfalarını açar.

3. **Canlı izleme (ekranda adımları görmek):**  
   - **Komple tam test (tüm modüllere veri):** `npm run test:e2e:tam` veya `npm run test:e2e:tam:yavas` — Tek senaryoda Dashboard → Sipariş → Cari → Faturalar → Ödemeler → Stok (yeni hammadde) → Üretim → Sevkiyat → Bildirimler → İK Devam → Satın alma → BOM → Raporlar → Finans → Usta Terminali; formlara test verisi girer, ekrandan canlı izlenir.  
   - **Tam canlı akış (sipariş → üretim → usta paneli):** `npm run test:e2e:canlı`  
     Tek senaryoda: sipariş oluşturur (Canlı Test Bayi/Müşteri, atlas, 1 adet), üretime alır, Usta Terminali’nde İskelet → Terzihane → Döseme istasyonlarında “Bitti” ile ilerletir. Tarayıcı penceresi açık olduğu için tüm adımlar ekranda canlı izlenir.  
   - **Sadece form testleri (canlı):** `npm run test:e2e:canlı:formlar`  
     Sipariş formu, cari formu, faturalar/stok/üretim sayfalarını açar; tarayıcı açık çalışır.  
   - **Adım adım izleme (UI modu):** `npm run test:e2e:ui:canlı`  
     Playwright Test UI açılır; canlı akış testini tek tek adımlayıp izleyebilirsiniz.  
   Önce uygulamanın çalışıyor olması gerekir (`npm run dev:simple` veya `npm run dev`).

3. **Manuel:**  
   Tarayıcıda giriş yapıp Siparişler, Üretim, Faturalar, Sevkiyat, Cari, Stok, Finans, İK, Ayarlar sayfalarını tek tek açarak hata ve konsol uyarılarını kontrol edin.

## Ek Notlar

- **Middleware:** Sadece `matcher` içindeki yollarda çalışır: `/`, `/bayi`, `/bayi/:path*`, `/api/:path*`. Diğer sayfa yolları middleware’den geçmez.
- **Oturum:** Token yoksa korumalı sayfalar login’e yönlendirilir (302). API’ler 401 döner.
- **test-pages-and-apis.js:** Sadece HTTP durum kodlarını kontrol eder; içerik veya iş mantığı doğrulamaz. Daha ayrıntılı kontrol için E2E veya manuel test kullanılmalı.

Son güncelleme: Bu rapor test çalıştırıldığı tarihteki durumu yansıtır.
