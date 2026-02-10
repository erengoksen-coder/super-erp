# Tüm Geliştirmeler İçin Uygulama Adımları

Bu dokümanda **BASKA_YAPILABILECEKLER.md** içindeki her madde için adım adım uygulama rehberi yer alır. Sırayla veya seçerek uygulayabilirsiniz.

---

## 1. Kalan alert → toast

**Hedef:** `docs/KALAN_ALERT_MIGRASYONU.md` listesindeki tüm sayfalarda `alert()` → `toast` dönüşümü.

**Adımlar:**
1. Listeyi aç: `docs/KALAN_ALERT_MIGRASYONU.md` veya terminalde `rg "alert\(" app --files-with-matches`.
2. Her dosya için:
   - Dosyanın başında `import { toast } from '@/lib/notify'` yoksa ekle.
   - `alert('...')` ifadelerini bul:
     - Başarı mesajları (✅, "başarıyla", "oluşturuldu", "güncellendi", "silindi") → `toast.success(...)`.
     - Hata mesajları ("Hata:", "hatası", "başarısız", "yüklenemedi") → `toast.error(...)`.
     - Uyarı ("Lütfen", "zorunlu", "gerekli") → `toast.warning(...)`.
     - Bilgi / nötr → `toast.info(...)`.
   - `alert('Hata: ' + error.message)` gibi ifadelerde `error` tipini `unknown` yapıp `error instanceof Error ? error.message : '...'` kullan.
3. `app/users/page.tsx` şifre sıfırlama: Kullanıcı şifreyi kopyalasın diye `alert` bırakılabilir; istenirse `toast.success` + "Panoya kopyalandı" butonu ile değiştirilebilir.
4. Değişen her dosyada lint/type kontrol et; gerekirse `(e: any)` → `(e: unknown)` düzelt.
5. Sayfayı manuel test et (başarı/hata senaryoları).

---

## 2. TypeScript type-check açmak

**Hedef:** `next.config.ts` içinde `typescript.ignoreBuildErrors` kapatıp build’in tip hatası vermeden geçmesi.

**Adımlar:**
1. `next.config.ts` dosyasında `typescript: { ignoreBuildErrors: true }` (veya benzeri) satırını bul; `false` yap veya bloğu kaldır.
2. `npm run build` çalıştır; çıkan tüm TypeScript hatalarını not al.
3. Hataları dosya dosya gider:
   - `any` kullanımları: Uygun tip veya `unknown` + type guard.
   - Eksik property: Interface’e ekle veya `optional (?)` yap.
   - `undefined` / `null` kullanımı: Optional chaining (`?.`) veya null check.
4. Kritik olmayan yerlerde geçici olarak `// @ts-expect-error` veya `as Type` kullanılabilir; sonra düzelt.
5. Tüm projede `npm run build` tekrar çalıştır; 0 hata hedeflenir.

---

## 3. lib/constants.ts kullanımı

**Hedef:** Sayfa yolları ve API path’lerinde sabit kullanımı.

**Adımlar:**
1. `lib/constants.ts` içeriğini incele (ROUTES, API_PREFIX, ROLES, PAGINATION).
2. `app/` ve `components/` içinde string path araması yap: `'/orders'`, `'/auth/login'`, `'/api/orders'` vb.
3. Her dosyada:
   - `import { ROUTES, API_PREFIX } from '@/lib/constants'` ekle.
   - `href="/orders"` → `href={ROUTES.ORDERS}`, `router.push('/barcodes')` → `router.push(ROUTES.BARCODES)`.
   - API çağrılarında `fetchApi(API_PREFIX + '/orders')` veya `fetchApi(\`${API_PREFIX}/orders\`)` (zaten `/api/orders` kullanılıyorsa ROUTES’a API path ekleyebilir veya sadece sayfa route’larını değiştirebilirsin).
4. Sidebar, MainShell, AuthGuard gibi ortak bileşenlerde route string’lerini ROUTES ile değiştir.
5. Build ve lint çalıştır; eksik import varsa düzelt.

---

## 4. API’lerde logger kullanımı

**Hedef:** Kritik API route’larının catch bloklarında `apiLogger.error` kullanımı.

**Adımlar:**
1. `lib/api/logger.ts` yapısını incele (`apiLogger.error(message, meta)`).
2. Kritik route’ları belirle: `app/api/auth/register`, `app/api/orders/route.ts`, `app/api/shipments`, `app/api/invoices`, `app/api/accounts`, `app/api/payments` vb.
3. Her route’ta `catch` bloğunda:
   - `const { apiLogger } = await import('@/lib/api/logger')` veya dosya başında `import { apiLogger } from '@/lib/api/logger'`.
   - `apiLogger.error('Kısa açıklama', { message: error.message, path: request.nextUrl.pathname })` ekle.
   - Mevcut `return fail(...)` veya `NextResponse.json` aynen kalsın.
4. Hassas bilgi (şifre, token) meta’ya yazma; sadece hata mesajı ve path yeterli.
5. Birkaç route’ta test et: Hatalı istek atıp console veya (ileride) log dosyasında kaydı kontrol et.

---

## 5. E2E skip’leri azaltma

**Hedef:** “Tüm ana sayfalar açılır” ve modül testlerinde oturum kaybı kaynaklı skip’leri azaltmak.

**Adımlar:**
1. `e2e/auth.setup.ts`: Giriş sonrası cookie ve localStorage’ın gerçekten kaydedildiğini doğrula; gerekirse `waitForLoadState('networkidle')` ve kısa bekleme artır.
2. `e2e/.auth/user.json` kaydedildikten sonra içeriğini kontrol et: `origins` içinde `auth-token` veya cookie dolu mu?
3. Middleware’de cookie adı: `auth-token` / `access_token` ile session’daki setAuthCookies aynı isimde mi kontrol et.
4. Playwright config: `storageState` path’inin doğru olduğundan emin ol; CI’da worker sayısı 1 ise state paylaşımı doğru çalışıyor mu?
5. “Tüm ana sayfalar” testinde: İlk sayfa `/` yerine doğrudan bir korumalı sayfaya (örn. `/orders`) gidip cookie’nin gittiğini görmek için bir deneme yap; gerekirse testi en başta çalıştır (zaten öne alındı).
6. Gerekirse login API’den dönen Set-Cookie header’ının Playwright tarafından alındığını test et (trace veya network log).
7. Değişiklik sonrası `npm run test:e2e` birkaç kez çalıştırıp skip sayısını karşılaştır.

---

## 6. Form validasyonu (inline hata)

**Hedef:** Önemli formlarda alan bazlı hata (input altında kırmızı metin) ile react-hook-form + Zod.

**Adımlar:**
1. Bağımlılık: `npm install react-hook-form @hookform/resolvers zod` (zod zaten var).
2. Ortak form wrapper veya hook: `useForm` + `zodResolver(schema)` ile şema kullanımı; `formState.errors` ile alan bazlı hata gösterimi.
3. Örnek sayfa seç (örn. cari hesap ekleme `accounts/new`, BOM formu veya sipariş modalı):
   - Mevcut `useState` ile yönetilen formu `useForm` ile değiştir.
   - `lib/validation/schemas.ts` içinde ilgili şemayı tanımla veya genişlet.
   - Her input’u `<Controller>` veya `register()` ile bağla; hata için `{formState.errors.alanAdi && <span className="text-red-500 text-sm">...</span>}`.
   - Submit’te `handleSubmit(onValid)` kullan; toast’u sadece API cevabında göster.
4. Aynı pattern’i diğer kritik formlara (sipariş, üretim emri, fatura vb.) yay.
5. Mevcut “Lütfen X girin” toast’ları isteğe bağlı kaldırılıp sadece inline bırakılabilir.

---

## 7. Ortak boş durum bileşeni

**Hedef:** Liste/tablo sayfalarında veri yokken tek tip boş durum.

**Adımlar:**
1. `components/ui/EmptyState.tsx` var mı kontrol et; yoksa oluştur.
2. Bileşen props: `title` (örn. "Henüz kayıt yok"), `description` (opsiyonel), `actionLabel` + `onAction` (örn. "Yeni Ekle" butonu).
3. Bir liste sayfasında (örn. siparişler, cari, faturalar) kullan: `items.length === 0 && !loading` ise `<EmptyState title="..." actionLabel="Yeni Sipariş" onAction={() => setModalOpen(true)} />`.
4. Arama/filtre sonucu boşsa: `title="Filtreye uygun sonuç yok"`, `description="Farklı kriter deneyin"` gibi varyant.
5. Bu bileşeni tüm liste sayfalarında kullanacak şekilde yay; tutarlı metin ve aksiyonlar seç.

---

## 8. Sayfalama tutarlılığı

**Hedef:** Fatura, cari, stok hareketi vb. listelerde `limit`/`offset` ve `meta.total`.

**Adımlar:**
1. `lib/constants.ts` içindeki `PAGINATION.DEFAULT_LIMIT`, `PAGINATION.MAX_LIMIT` kullan.
2. Örnek API: `app/api/invoices/route.ts` (GET):
   - Query: `limit`, `offset` oku; varsayılan 50, max 500.
   - Sorguda `LIMIT ? OFFSET ?` kullan; toplam sayı için ayrı `COUNT(*)` veya aynı sorguda window fonksiyonu.
   - Yanıtta `ok(data, { meta: { total, limit, offset } })` dön.
3. Frontend: İlgili sayfada state `page` veya `offset` tut; API’ye `limit` ve `offset` gönder; `meta.total` ile sayfa sayısı hesapla; “Önceki / Sonraki” veya sayfa numaraları göster.
4. Aynı pattern’i `api/accounts`, `api/materials` (veya stok hareketi endpoint’i) vb. için uygula.
5. `docs/API_OVERVIEW.md` sayfalama bölümünü güncelle.

---

## 9. Birim test artışı

**Hedef:** Kritik lib ve API’ler için Jest testleri.

**Adımlar:**
1. Mevcut test yapısını incele: `tests/`, `jest.config.json`, `tests/setup.ts`.
2. `lib/auth/password.ts`: `hashPassword`, `verifyPassword`, `isLegacySha256Hash` için testler (bcrypt hash’in doğrulanması, legacy SHA-256 ile uyum).
3. `lib/validation/schemas.ts`: Login, register, sipariş vb. şemalar için geçerli/geçersiz payload testleri.
4. `lib/api/response.ts`: `ok()` ve `fail()` ile dönen JSON’un doğru yapıda olduğunu assert et.
5. İsteğe bağlı: Bir API route için integration test (örn. `GET /api/health` veya `POST /api/auth/login` mock DB ile); Next.js route test dokümantasyonuna göre yapılır.
6. `npm test` ile tüm testlerin geçtiğini doğrula.

---

## 10. Erişilebilirlik

**Hedef:** aria-label, role, aria-invalid/describedby ile temel a11y.

**Adımlar:**
1. Sadece ikon içeren butonları tara (örn. Sidebar’daki ikonlar, tablo aksiyonları): `aria-label="Çıkış"`, `aria-label="Düzenle"` ekle.
2. Modal/dialog bileşenleri: Ana wrapper’a `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (başlık id’si) ekle; kapatma butonuna `aria-label="Kapat"`.
3. Form alanları: Hata gösterildiğinde input’a `aria-invalid="true"` ve `aria-describedby="hata-id"`; hata metninin `id`’si ile eşleştir.
4. `lib/hooks/useKeyboardShortcut.ts`: Modal açıkken Escape ile kapatma zaten varsa dokümante et; yoksa modal’lara ekle.
5. Gerekirse `eslint-plugin-jsx-a11y` kurup kuralları aç; eksik alt metin ve label’ları tespit et.

---

## 11. PDKS / İK genişletme

**Hedef:** Giriş/çıkış, izin, bordro ekranları.

**Adımlar:**
1. `docs/PDKS_*.md` ve `docs/IK_*.md` dosyalarını oku; mevcut API ve sayfaları not al.
2. Giriş/çıkış: QR veya kart okutma endpoint’i ve sayfası varsa iyileştir; yoksa `api/hr/clock` veya benzeri bir POST (user_id, timestamp, event: in/out) tasarla ve kaydet.
3. İzin talepleri: İzin tipi, başlangıç/bitiş, onay durumu; liste ve detay sayfaları + onay API’si.
4. Bordro özeti: Dönem seçimi, ücret/kesinti alanları; mevcut `api/hr/payrolls` ve sayfaları genişlet veya yeni rapor ekle.
5. Veritabanı: Gerekirse migration ile yeni tablolar (leave_requests, attendance_events vb.); mevcut şemayı kontrol et.
6. Frontend: İK menüsüne yeni sayfalar ekle; Sidebar ve yetki kontrolü güncelle.

---

## 12. Finans geliştirme

**Hedef:** Ödeme fişi, muhasebe fişi, raporlar.

**Adımlar:**
1. `docs/FINANS_BOLUMU_DUZENLEME_PLANI.md` içeriğini oku; mevcut finance route ve sayfaları incele.
2. Ödeme fişi: Cari hesap + tutar + tarih + açıklama; API’de kayıt ve hareket güncellemesi; liste ve oluşturma sayfası.
3. Muhasebe fişi: Hesap kodu, borç/alacak, tutar; çift kayıt mantığı; API + form.
4. Raporlar: Gelir/gider özeti, nakit akışı (varsa API’yi kullan); tarih aralığı filtresi; tablo veya grafik.
5. Mevcut `api/financial/*`, `api/accounting/*` endpoint’lerini kullan veya genişlet; frontend’de finance menüsüne link ekle.

---

## 13. E-posta / SMS

**Hedef:** Sipariş, sevkiyat, şifre sıfırlama için bildirim.

**Adımlar:**
1. `lib/notifications/send.ts` (veya benzeri) yapısını incele; `sendEmail`, `sendSMS` imzaları ve env (SMTP_*, SMS_*) kontrol et.
2. Env: `.env.example` ve dokümanda SMTP ve SMS değişkenlerini listele; opsiyonel (yoksa bildirim atlanır).
3. Tetikleyici noktalar:
   - Sipariş oluşturuldu: İlgili API’de başarı sonrası `sendEmail(müşteri, 'Sipariş onayı', ...)`.
   - Sevkiyat onaylandı: `shipments/[id]/approve` route’unda `sendEmail` veya `sendSMS`.
   - Şifre sıfırlama: Token’lı link oluştur; e-posta ile link gönder; token doğrulama sayfası ve API.
4. Şablon: Basit metin veya HTML şablonları (dosya veya string); müşteri adı, sipariş no vb. placeholder’lar.
5. Hata: Gönderim başarısızsa logla; kullanıcıya “Bildirim gönderilemedi” gibi opsiyonel uyarı.

---

## 14. Excel / CSV export

**Hedef:** Sipariş, cari, stok, fatura listeleri için indirme.

**Adımlar:**
1. Mevcut dashboard export’u incele: `api/dashboard/export` veya benzeri; hangi kütüphane kullanılıyorsa (xlsx, csv-writer vb.) aynısını kullan.
2. Her liste için:
   - API: `GET /api/orders/export?limit=...`, `GET /api/accounts/export`, `GET /api/invoices/export`, stok listesi export’u; yetki kontrolü ekle.
   - Response: CSV ise `Content-Type: text/csv` ve `Content-Disposition: attachment; filename="..."`; Excel ise binary + uygun MIME.
3. Frontend: List sayfasına “Excel İndir” veya “CSV İndir” butonu; tıklanınca ilgili export URL’ine istek atıp blob indir veya yeni sekmede aç.
4. Büyük veri: Limit (örn. 10.000) koy; aşımda uyarı veya sayfalı export seçeneği.

---

## 15. Webhook event’leri

**Hedef:** order.created, shipment.approved, invoice.issued, stock.low vb.

**Adımlar:**
1. Mevcut webhook altyapısını incele: `webhook_endpoints` tablosu, `dispatchWebhook(event, payload)` veya benzeri fonksiyon.
2. Event listesi tanımla: `order.created`, `shipment.approved`, `invoice.issued`, `stock.low` (kritik stok altına düşünce).
3. Tetikleyici noktalar:
   - Sipariş oluşturuldu: Orders POST route’unda başarı sonrası `dispatchWebhook('order.created', { orderId, ... })`.
   - Sevkiyat onaylandı: Approve route’unda `dispatchWebhook('shipment.approved', ...)`.
   - Fatura kesildi: İlgili API’de `dispatchWebhook('invoice.issued', ...)`.
   - Stok güncellemesi sonrası min seviye kontrolü: `dispatchWebhook('stock.low', { materialId, currentStock, minLevel })`.
4. Payload formatını dokümante et; webhook endpoint’lerine POST ile aynı format gönder.
5. Admin/webhook sayfasında yeni event’leri listele ve test tetikleme eklenebilir.

---

## 16. Rapor sayfaları

**Hedef:** Satış özeti, stok hareketi, cari yaşlandırma, üretim verimliliği.

**Adımlar:**
1. Hangi raporların olacağını listele; her biri için veri kaynağı (hangi tablolar, hangi API’ler).
2. API: Örn. `GET /api/reports/sales-summary?from=...&to=...`, `GET /api/reports/stock-movements`, `GET /api/reports/aging-receivables`, `GET /api/reports/production-efficiency`.
3. Her rapor için route’ta sorguları yaz; tarih aralığı, birim, depo vb. filtreleri query’den al; `ok(data)` dön.
4. Frontend: `app/reports/` altında sayfalar (örn. `sales-summary`, `stock-movements`, `aging`, `production`); tarih seçici, tablo/grafik; mevcut `app/reports/page.tsx` ile birleştirilebilir veya alt route’lar açılır.
5. Yetki: Rapor sayfalarına erişim rol/izin kontrolü ekle.

---

## 17. Log dosyasına yazma

**Hedef:** API hatalarını dosyaya yazmak.

**Adımlar:**
1. `lib/api/logger.ts` dosyasını aç; `error` ve isteğe bağlı `warn` için dosya yazımı ekle.
2. Log dizini: `logs/` (proje kökünde); `.gitignore`’a `logs/` ekle.
3. Node’da `fs.appendFileSync('logs/api-error.log', line + '\n')`; path için `path.join(process.cwd(), 'logs', 'api-error.log')` kullan; önce `logs` klasörü yoksa `fs.mkdirSync(..., { recursive: true })`.
4. Yazım senkron olabilir (hata log’u seyrek); çok sık yazım olursa buffer + periyodik flush düşünülebilir.
5. Env: `LOG_TO_FILE=true` gibi bir değişken ile dosyaya yazımı aç/kapat; yoksa sadece console.
6. Dokümantasyonda `logs/` ve rotasyon ihtiyacı (madde 20) not edilsin.

---

## 18. Health / monitoring

**Hedef:** Görünür durum sayfası veya metrikler.

**Adımlar:**
1. Mevcut `GET /api/health` ve `?deep=true` (DB kontrolü) dokümante edilmiş; public bir `/durum` veya `/health` sayfası düşün.
2. Basit status sayfası: `app/durum/page.tsx` (veya `app/health/page.tsx`) oluştur; sayfa açılınca `fetch('/api/health?deep=true')` yap; sonuca göre “Sistem çalışıyor” / “Veritabanı bağlantısı yok” göster; middleware’de bu path public ise giriş istemeden açılsın.
3. İsteğe bağlı: Prometheus metrikleri için `GET /api/metrics` (request sayısı, hata sayısı vb.); veya sadece health yeterli.
4. Dokümantasyonda durum sayfası URL’i ve kullanım amacı yazılsın.

---

## 19. Docker production

**Hedef:** Tek komutla production build ve çalıştırma.

**Adımlar:**
1. `docker-compose.yml` ve `docker/app/Dockerfile` (veya ilgili Dockerfile) incele.
2. Dockerfile’da: `npm run build`, `npm run start` veya `node .next/standalone/server.js` (Next.js standalone ise); port 3000 expose.
3. Env: `JWT_SECRET`, `DATABASE_URL` veya `data/` volume ile DB path; `.env` veya `env_file` ile production değişkenleri.
4. `docker-compose` ile `build` + `up`; volume ile `data/` kalıcı olsun.
5. `docs/ENVIRONMENT_SETUP.md` veya ayrı `docs/DOCKER_DEPLOY.md`: Adımları yaz (build, up, env örneği, yedek volume).
6. Yerel veya test sunucusunda bir kez çalıştırıp doğrula.

---

## 20. Yedek rotasyonu

**Hedef:** Eski yedekleri silip son N günü saklamak.

**Adımlar:**
1. `scripts/backup-database.js` çıktısının nereye gittiğini kontrol et (örn. `data/backups/`).
2. Yeni script: `scripts/rotate-backups.js` (veya backup script’in sonuna ekle):
   - `data/backups/` içindeki dosyaları listele (örn. `fs.readdirSync`).
   - Dosya adından tarih çıkar (örn. `erp_2026-02-06_*.db`); 7 günden eski olanları sil (`fs.unlinkSync`).
   - Saklama günü sayısı (7) parametre veya env ile verilebilir.
3. Zamanlanmış görev: Önce backup, ardından rotate çalışsın; Windows Task Scheduler veya cron’da iki komut veya tek script’te önce backup sonra rotate.
4. `docs/ENVIRONMENT_SETUP.md` yedekleme bölümüne rotasyon script’i ve kullanımını ekle.

---

## Genel notlar

- Her maddeyi bitirdikten sonra ilgili testleri çalıştırın (`npm test`, `npm run test:e2e`, `npm run build`).
- Dokümantasyonu güncelleyin: `docs/API_OVERVIEW.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/GELISTIRME_ONERILERI.md` veya `docs/BASKA_YAPILABILECEKLER.md` içinde “yapıldı” işaretleyin.
- Önce 1, 4, 17, 20 gibi düşük riskli maddelerle başlamak, sonra 2 (type-check) ve 6 (form) gibi daha kapsamlı olanlara geçmek mantıklı olur.

Bu adımlar tamamlandıkça proje kalitesi ve iş değeri adım adım artacaktır.
