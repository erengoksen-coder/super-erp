# Geliştirme Önerileri

Bu dokümanda **super-erp** için yapılabilecek geliştirmeler özetlenmiştir. **Uygulanan** maddeler aşağıda işaretlidir; kalan maddeler onay sonrası ele alınabilir.

---

## 1. Güvenlik

| Öneri | Açıklama | Kaynak |
|-------|----------|--------|
| **Parola hash** | SHA-256 yerine **bcrypt** veya **argon2** kullanımı; tuz ve yavaş hash ile güvenlik artışı. | PROJE_EKSIKLIKLERI |
| **Token saklama** | Mümkünse JWT’yi **HttpOnly cookie** ile taşıma; XSS’te localStorage’dan çalınma riski azalır. (Mevcut cookie + localStorage karma kullanımı dokümante edilebilir.) | PROJE_EKSIKLIKLERI |
| **CSRF** | Form/state-değiştiren isteklerde CSRF token veya SameSite cookie politikası gözden geçirilebilir. | PROJE_EKSIKLIKLERI |
| **Input / output** | Tüm API girişlerinde Zod/validation; çıkışta XSS için escape/sanitize. | Genel |

---

## 2. Kod Kalitesi ve TypeScript

| Öneri | Açıklama |
|-------|----------|
| **`any` azaltma** | `any` kullanımlarını tip tanımlarıyla (interface, type) değiştirmek; API cevapları için ortak tipler. |
| **Build type-check** | `next.config.ts` içindeki `typescript.ignoreBuildErrors` kapatılarak gerçek type-check; önce hatalar tek tek düzeltilir. |
| **Ortak hata/response** | API’lerde tek bir response helper (`ok()`, `fail()`) ve frontend’de tek bir hata gösterim/yönlendirme katmanı. |
| **Magic string** | Sayfa yolları, rol adları, API path’leri sabit dosyada (örn. `lib/constants.ts`) toplanabilir. |

---

## 3. Test ve CI

| Öneri | Açıklama |
|-------|----------|
| **E2E skip azaltma** | Auth state’in neden bazen kaybolduğu (cookie/origin, storage state) araştırılıp “tüm ana sayfalar” ve modül testlerindeki skip oranı düşürülebilir. |
| **E2E kapsam** | Sipariş oluşturma (form doldurup kaydetme), fatura filtreleme, sevkiyat onayı gibi akışlar eklenebilir. |
| **Birim test** | Kritik lib fonksiyonları (validation, auth, format) ve API route’ları için Jest/Vitest testleri artırılabilir. |
| **CI** | Lint + unit + build zaten var; E2E için `PLAYWRIGHT_TEST_*` secret’ları tanımlanıp dokümante edildi. İsteğe bağlı: PR’da sadece değişen modüllere ait E2E’leri çalıştırma. |

---

## 4. API ve Backend

| Öneri | Açıklama |
|-------|----------|
| **Response standardı** | Tüm API’lerde `{ success, data?, error?, message?, meta? }` benzeri tek format; frontend’de tek parse mantığı. |
| **Sayfalama** | Büyük listelerde (sipariş, fatura, cari, stok) tutarlı `limit`/`offset` veya cursor; `meta.total` ile toplam. |
| **Caching** | Sık değişmeyen listeler (ürün, BOM, birimler) için Cache-Control veya kısa TTL cache stratejisi. |
| **Merkezi hata log** | API hatalarında tek bir log/raporlama noktası (dosya veya harici servis). |

---

## 5. Frontend ve UX

| Öneri | Açıklama | Durum |
|-------|----------|--------|
| **Toast** | `alert()` → toast. | ✅ Uygulandı: barcodes, shipments, accounts [id], bom, inventory/materials, production/page, print-barcode-label ve diğer birçok sayfa. Kalan sayfalarda aynı pattern (`import { toast } from '@/lib/notify'` + `toast.success`/`toast.error`/`toast.warning`) uygulanabilir. |
| **Loading / boş durum** | Ortak `<PageLoader />` / `<Skeleton />`. | ✅ `components/ui/PageLoader.tsx` mevcut; liste sayfalarında kullanım yaygınlaştırılabilir. |
| **Form validasyonu** | react-hook-form + Zod, alan bazlı hata. | Kısmen: Zod şemaları var; formlarda inline hata için entegrasyon artırılabilir. |
| **Erişilebilirlik** | Escape, Enter, aria-label. | Mevcut hook: `lib/hooks/useKeyboardShortcut.ts`. |
| **SWR yaygınlaştırma** | `useApi` (SWR) kullanımı. | Birçok sayfada zaten kullanılıyor; kalan sayfalar için geçiş yapılabilir. |

---

## 6. Özellikler (İş / Modül)

| Öneri | Açıklama |
|-------|----------|
| **PDKS / İK** | `docs/PDKS_*.md` ve `docs/IK_*.md` planlarına göre giriş/çıkış, izin, bordro ekranları. |
| **Finans** | `docs/FINANS_BOLUMU_DUZENLEME_PLANI.md` ile ödeme/fiş/rapor akışları. |
| **E-posta / SMS** | Sipariş, sevkiyat, şifre sıfırlama için `lib/notifications` kullanımı; env ile SMTP/SMS açılıp kapatılabilir. |
| **Webhook** | Mevcut webhook altyapısına yeni event’ler (stok düşümü, fatura kesimi vb.) eklenebilir. |
| **Excel/export** | Dashboard export dışında sipariş, cari, stok listeleri için Excel/CSV indirme. |
| **Raporlar** | Satış özeti, stok hareketi, cari hesap özeti gibi sabit rapor sayfaları. |

---

## 7. DevOps ve Dokümantasyon

| Öneri | Açıklama | Durum |
|-------|----------|--------|
| **PWA** | manifest + service worker. | ✅ `public/manifest.webmanifest` mevcut; `public/sw.js` var. |
| **Yedekleme** | Zamanlanmış yedek. | ✅ `scripts/backup-database.js` mevcut; `docs/ENVIRONMENT_SETUP.md` içine Windows/Linux zamanlama notları eklendi. |
| **Ortam rehberi** | `.env.example`, ENVIRONMENT_SETUP. | ✅ ENVIRONMENT_SETUP güncel; E2E ve yedekleme bölümleri eklendi. |
| **API dokümantasyonu** | Endpoint özeti. | ✅ `docs/API_OVERVIEW.md` eklendi (yanıt formatı, auth, sayfalama, ana modüller, loglama). |
| **Deploy** | Docker. | Mevcut: `docker-compose.yml`, `docker/`; production build için kullanılabilir. |

---

## 8. E-Ticaret (Ayrı Proje)

- **Hırdavat e-ticaret** `docs/HIRDAVAT_E-TICARET_DONUSUM_PLANI.md`’de anlatılıyor; mağaza **masaüstünde ayrı proje** (`hirdavat-eticaret`). İleride ERP ile sipariş/stok senkronu (webhook veya dosya) eklenebilir; bu dokümanda sadece “yapılabilecekler” listesi olarak bırakıldı.

---

## Öncelik Önerisi (İsteğe Bağlı)

1. **Güvenlik:** Parola hash + token/cookie gözden geçirme.  
2. **Kalite:** `any` ve type-check; ortak API response/hata.  
3. **UX:** Toast, loading/boş durum, form validasyonu.  
4. **Test:** E2E skip’leri azaltma, birkaç kritik akış E2E.  
5. **Özellik:** PDKS/İK veya Finans planlarından biri.  
6. **DevOps:** Yedekleme otomasyonu, env/API dokümantasyonu.

Bu liste onayınıza göre güncellenebilir veya madde bazında uygulama planına taşınabilir.
