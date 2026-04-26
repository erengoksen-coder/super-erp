# Tüm 20 Madde — Liste + Uygulama Adımları

Bu dosya **BASKA_YAPILABILECEKLER.md** ile **UYGULAMA_ADIMLARI.md** içeriklerini tek yerde toplar. Her madde için hem fikir özeti hem adım adım uygulama rehberi vardır.

---

## Kısa vadede (teknik borç / tamamlama)

### 1. Kalan alert → toast

**Fikir:** `docs/KALAN_ALERT_MIGRASYONU.md` içindeki sayfalarda hâlâ `alert()` var. Hepsi `toast.success` / `toast.error` / `toast.warning` ile değiştirilebilir.

**Hedef:** Tüm sayfalarda `alert()` → toast dönüşümü.

**Adımlar:**
1. Listeyi aç: `docs/KALAN_ALERT_MIGRASYONU.md` veya `rg "alert\(" app --files-with-matches`.
2. Her dosya için: `import { toast } from '@/lib/notify'` ekle; `alert('...')` → başarı için `toast.success()`, hata için `toast.error()`, uyarı için `toast.warning()`, bilgi için `toast.info()`.
3. `alert('Hata: ' + error.message)` gibi ifadelerde `error instanceof Error ? error.message : '...'` kullan.
4. Lint/type kontrol; gerekirse `(e: any)` → `(e: unknown)`.

---

### 2. TypeScript type-check açmak

**Fikir:** `next.config.ts` içinde `typescript.ignoreBuildErrors: true` kapatılıp proje genelinde tip hataları düzeltilirse build tam type-check ile çalışır.

**Hedef:** Build’in tip hatası vermeden geçmesi.

**Adımlar:**
1. `next.config.ts` içinde `typescript: { ignoreBuildErrors: true }` → `false` veya kaldır.
2. `npm run build`; çıkan hataları not al.
3. Hataları dosya dosya gider: `any` → uygun tip veya `unknown` + type guard; eksik property; optional chaining.
4. `npm run build` tekrar; 0 hata hedefi.

---

### 3. lib/constants.ts kullanımı

**Fikir:** Sabitler tanımlandı ama sayfalarda hâlâ `'/orders'`, `'/barcodes'` gibi string’ler olabilir. Route ve API path’lerde `ROUTES.ORDERS`, `API_PREFIX` kullanımı yaygınlaştırılabilir.

**Hedef:** Sayfa yolları ve API path’lerinde sabit kullanımı.

**Adımlar:**
1. `lib/constants.ts` incele (ROUTES, API_PREFIX, ROLES, PAGINATION).
2. `app/` ve `components/` içinde string path ara: `'/orders'`, `'/auth/login'`, `'/api/orders'` vb.
3. `import { ROUTES, API_PREFIX } from '@/lib/constants'`; `href="/orders"` → `href={ROUTES.ORDERS}`; `router.push(ROUTES.BARCODES)`.
4. Sidebar, MainShell, AuthGuard’da route string’lerini ROUTES ile değiştir.
5. Build ve lint.

---

### 4. API’lerde logger kullanımı

**Fikir:** Kritik route’larda (kayıt, sipariş, ödeme vb.) catch bloklarında `apiLogger.error` eklenebilir.

**Hedef:** Kritik API route’larının catch bloklarında `apiLogger.error` kullanımı.

**Adımlar:**
1. `lib/api/logger.ts` yapısını incele.
2. Kritik route’lar: auth/register, orders, shipments, invoices, accounts, payments vb.
3. Her route’ta catch’te: `import { apiLogger } from '@/lib/api/logger'`; `apiLogger.error('Kısa açıklama', { message: error.message, path: request.nextUrl.pathname })`.
4. Hassas bilgi meta’ya yazma.

---

### 5. E2E skip’leri azaltma

**Fikir:** “Tüm ana sayfalar açılır” ve modül testleri bazen oturum yok diye skip oluyor. Auth state nedeni araştırılıp skip oranı düşürülebilir.

**Hedef:** Oturum kaybı kaynaklı skip’leri azaltmak.

**Adımlar:**
1. `e2e/auth.setup.ts`: Giriş sonrası cookie ve localStorage kaydını doğrula; gerekirse `waitForLoadState('networkidle')` ve bekleme artır.
2. `e2e/.auth/user.json` içeriğini kontrol et (auth-token, cookie).
3. Middleware cookie adı ile session setAuthCookies aynı mı kontrol et.
4. Playwright config: `storageState` path doğru mu; CI’da worker sayısı.
5. Değişiklik sonrası `npm run test:e2e` birkaç kez çalıştırıp skip sayısını karşılaştır.

---

## Orta vadede (deneyim ve kalite)

### 6. Form validasyonu (inline hata)

**Fikir:** Önemli formlarda (sipariş, cari, BOM, üretim emri) react-hook-form + Zod ile alan bazlı hata mesajları (input altında kırmızı metin) eklenebilir.

**Hedef:** Alan bazlı hata ile react-hook-form + Zod.

**Adımlar:**
1. `npm install react-hook-form @hookform/resolvers zod` (zod zaten var).
2. `useForm` + `zodResolver(schema)`; `formState.errors` ile alan bazlı hata.
3. Örnek sayfa (accounts/new, BOM, sipariş modalı): useState formu useForm’a çevir; şemayı lib/validation/schemas’ta tanımla; input’ları Controller/register ile bağla; hata için `<span className="text-red-500 text-sm">`.
4. Aynı pattern’i diğer kritik formlara yay.

---

### 7. Ortak boş durum bileşeni

**Fikir:** Liste/tablo sayfalarında veri yokken tek tip “Henüz kayıt yok” / “Filtreye uygun sonuç yok” + aksiyon butonu (EmptyState benzeri).

**Hedef:** Liste sayfalarında tek tip boş durum.

**Adımlar:**
1. `components/ui/EmptyState.tsx` var mı kontrol et; yoksa oluştur.
2. Props: `title`, `description` (opsiyonel), `actionLabel` + `onAction`.
3. Liste sayfasında: `items.length === 0 && !loading` ise `<EmptyState title="..." actionLabel="Yeni Ekle" onAction={...} />`.
4. Filtre boş: `title="Filtreye uygun sonuç yok"`, `description="Farklı kriter deneyin"`.
5. Tüm liste sayfalarında kullan.

---

### 8. Sayfalama tutarlılığı

**Fikir:** Sipariş dışındaki büyük listelerde (faturalar, cari, stok hareketleri) de `limit`/`offset` ve `meta.total` ile sayfalama getirilebilir.

**Hedef:** Fatura, cari, stok hareketi listelerinde limit/offset ve meta.total.

**Adımlar:**
1. `lib/constants.ts` içinde PAGINATION.DEFAULT_LIMIT, MAX_LIMIT kullan.
2. API (örn. invoices GET): query’de limit, offset; sorguda LIMIT/OFFSET; COUNT; yanıtta `ok(data, { meta: { total, limit, offset } })`.
3. Frontend: page/offset state; API’ye limit, offset; meta.total ile sayfa sayısı; “Önceki/Sonraki” veya sayfa numaraları.
4. Aynı pattern’i accounts, materials vb. için uygula.
5. docs/API_OVERVIEW.md sayfalama bölümünü güncelle.

---

### 9. Birim test artışı

**Fikir:** `lib/auth/password.ts`, `lib/validation/schemas.ts`, `lib/api/response.ts` ve kritik API handler’lar için Jest/Vitest testleri eklenebilir.

**Hedef:** Kritik lib ve API’ler için testler.

**Adımlar:**
1. Mevcut test yapısını incele (tests/, vitest/jest config, setup).
2. `lib/auth/password.ts`: hashPassword, verifyPassword, isLegacySha256Hash testleri.
3. `lib/validation/schemas.ts`: Login, register, sipariş şemaları için geçerli/geçersiz payload testleri.
4. `lib/api/response.ts`: ok() ve fail() JSON yapısı assert.
5. İsteğe bağlı: API route integration test (health, login mock DB).
6. `npm test` ile tüm testlerin geçtiğini doğrula.

---

### 10. Erişilebilirlik

**Fikir:** Sadece ikon olan butonlara `aria-label`, modal’lara `role="dialog"` ve `aria-modal`, form alanlarına `aria-invalid`/`aria-describedby` eklenebilir.

**Hedef:** aria-label, role, aria-invalid/describedby ile temel a11y.

**Adımlar:**
1. İkon butonları: `aria-label="Çıkış"`, `aria-label="Düzenle"` ekle.
2. Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; kapatma `aria-label="Kapat"`.
3. Form: Hata varken input’a `aria-invalid="true"`, `aria-describedby="hata-id"`.
4. useKeyboardShortcut: Escape ile modal kapatma varsa dokümante et; yoksa ekle.
5. İsteğe bağlı: eslint-plugin-jsx-a11y.

---

## İş / özellik (modül geliştirme)

### 11. PDKS / İK

**Fikir:** `docs/PDKS_*.md`, `docs/IK_*.md` planlarına göre giriş/çıkış (QR veya kart), izin talepleri, bordro özet ekranları genişletilebilir.

**Hedef:** Giriş/çıkış, izin, bordro ekranları.

**Adımlar:**
1. docs/PDKS_*.md ve docs/IK_*.md oku; mevcut API ve sayfaları not al.
2. Giriş/çıkış: api/hr/clock veya benzeri POST (user_id, timestamp, event: in/out); QR/kart sayfası.
3. İzin talepleri: tip, başlangıç/bitiş, onay; liste, detay, onay API’si.
4. Bordro özeti: dönem seçimi, ücret/kesinti; api/hr/payrolls genişlet veya yeni rapor.
5. DB: Gerekirse leave_requests, attendance_events vb. migration.
6. Frontend: İK menüsüne sayfalar; Sidebar ve yetki.

---

### 12. Finans

**Fikir:** `docs/FINANS_BOLUMU_DUZENLEME_PLANI.md` ile ödeme fişi, muhasebe fişi, rapor (gelir/gider, nakit akış) akışları iyileştirilebilir veya yeni raporlar eklenebilir.

**Hedef:** Ödeme fişi, muhasebe fişi, raporlar.

**Adımlar:**
1. FINANS_BOLUMU_DUZENLEME_PLANI.md ve mevcut finance route/sayfaları incele.
2. Ödeme fişi: cari + tutar + tarih + açıklama; API kayıt ve hareket güncellemesi; liste ve oluşturma sayfası.
3. Muhasebe fişi: hesap kodu, borç/alacak, tutar; çift kayıt; API + form.
4. Raporlar: gelir/gider özeti, nakit akışı; tarih aralığı; tablo/grafik.
5. api/financial/*, api/accounting/* kullan veya genişlet; finance menüsüne link.

---

### 13. E-posta / SMS

**Fikir:** `lib/notifications` altyapısı kullanılarak sipariş onayı, sevkiyat bildirimi, şifre sıfırlama linki gibi e-posta/SMS tetiklenebilir (env ile açılıp kapatılır).

**Hedef:** Sipariş, sevkiyat, şifre sıfırlama için bildirim.

**Adımlar:**
1. lib/notifications yapısını incele; sendEmail, sendSMS; env SMTP_*, SMS_*.
2. .env.example ve dokümanda SMTP/SMS değişkenleri; opsiyonel.
3. Tetikleyici: Sipariş oluşturuldu → sendEmail; Sevkiyat onaylandı → sendEmail/sendSMS; Şifre sıfırlama → token’lı link e-posta.
4. Şablon: müşteri adı, sipariş no placeholder’lar.
5. Hata: logla; kullanıcıya “Bildirim gönderilemedi” opsiyonel.

---

### 14. Excel / CSV export

**Fikir:** Sipariş listesi, cari hesap listesi, stok listesi, fatura listesi için “Excel/CSV indir” butonu eklenebilir.

**Hedef:** Sipariş, cari, stok, fatura listeleri için indirme.

**Adımlar:**
1. Mevcut dashboard export’u incele (xlsx, csv-writer vb.).
2. API: GET /api/orders/export, /api/accounts/export, /api/invoices/export, stok export; yetki.
3. Response: CSV → Content-Type: text/csv, Content-Disposition: attachment; Excel → binary + MIME.
4. Frontend: “Excel İndir” / “CSV İndir” butonu; blob indir.
5. Büyük veri: limit (örn. 10.000); aşımda uyarı.

---

### 15. Webhook event’leri

**Fikir:** Mevcut webhook yapısına `order.created`, `shipment.approved`, `invoice.issued`, `stock.low` gibi event’ler eklenip dış sistemlere bildirim verilebilir.

**Hedef:** order.created, shipment.approved, invoice.issued, stock.low.

**Adımlar:**
1. webhook_endpoints, dispatchWebhook yapısını incele.
2. Event listesi tanımla.
3. Tetikleyici: Sipariş POST başarı → dispatchWebhook('order.created', ...); Sevkiyat approve → 'shipment.approved'; Fatura → 'invoice.issued'; Stok min seviye → 'stock.low'.
4. Payload formatını dokümante et.
5. Admin/webhook sayfasında event listesi ve test tetikleme.

---

### 16. Rapor sayfaları

**Fikir:** Satış özeti (tarih aralığı), stok hareket özeti, cari hesap yaşlandırma, üretim verimliliği gibi sabit rapor sayfaları eklenebilir.

**Hedef:** Satış özeti, stok hareketi, cari yaşlandırma, üretim verimliliği.

**Adımlar:**
1. Rapor listesi ve veri kaynağı (tablolar, API’ler).
2. API: GET /api/reports/sales-summary?from=&to=, stock-movements, aging-receivables, production-efficiency.
3. Her rapor için sorgular; filtreler query’den; ok(data).
4. Frontend: app/reports/ altında sayfalar; tarih seçici, tablo/grafik.
5. Yetki: rapor sayfalarına erişim kontrolü.

---

## Altyapı ve operasyon

### 17. Log dosyasına yazma

**Fikir:** `lib/api/logger.ts` şu an console’a yazıyor. İsteğe bağlı: `logs/api-error.log` dosyasına append veya harici log servisi.

**Hedef:** API hatalarını dosyaya yazmak.

**Adımlar:**
1. lib/api/logger.ts: error (ve isteğe bağlı warn) için dosya yazımı.
2. Log dizini: logs/; .gitignore’a logs/ ekle.
3. path.join(process.cwd(), 'logs', 'api-error.log'); fs.mkdirSync(..., { recursive: true }); fs.appendFileSync.
4. Env: LOG_TO_FILE=true ile aç/kapat.
5. Dokümantasyonda logs/ ve rotasyon (madde 20) notu.

---

### 18. Health / monitoring

**Fikir:** GET /api/health?deep=true zaten var; isteğe bağlı: `/durum` sayfası veya Prometheus/DataDog metrikleri.

**Hedef:** Görünür durum sayfası veya metrikler.

**Adımlar:**
1. GET /api/health ve ?deep=true dokümante; public /durum veya /health sayfası.
2. app/durum/page.tsx: fetch('/api/health?deep=true'); “Sistem çalışıyor” / “Veritabanı bağlantısı yok”; middleware’de path public.
3. İsteğe bağlı: GET /api/metrics (Prometheus).
4. Dokümantasyonda durum sayfası URL ve kullanım.

---

### 19. Docker production

**Fikir:** docker-compose ile production build ve tek komutla ayağa kalkma (env ile DB path, JWT secret) dokümante edilip test edilebilir.

**Hedef:** Tek komutla production build ve çalıştırma.

**Adımlar:**
1. docker-compose.yml ve Dockerfile incele.
2. Dockerfile: npm run build, npm run start veya standalone server; port 3000.
3. Env: JWT_SECRET, DATABASE_URL veya data/ volume; env_file.
4. docker-compose build + up; data/ volume kalıcı.
5. docs/ENVIRONMENT_SETUP.md veya docs/DOCKER_DEPLOY.md: build, up, env örneği, yedek volume.
6. Yerel/test’te bir kez çalıştırıp doğrula.

---

### 20. Yedek rotasyonu

**Fikir:** backup-database.js ile oluşan yedekler için “son 7 gün sakla, eskileri sil” rotasyon script’i eklenebilir.

**Hedef:** Eski yedekleri silip son N günü saklamak.

**Adımlar:**
1. scripts/backup-database.js çıktı dizinini kontrol et (örn. data/backups/).
2. scripts/rotate-backups.js: data/backups/ listele; dosya adından tarih çıkar; 7 günden eski olanları sil; saklama günü parametre veya env.
3. Zamanlanmış görev: önce backup, sonra rotate; Task Scheduler / cron.
4. docs/ENVIRONMENT_SETUP.md yedekleme bölümüne rotasyon script’i ve kullanımı ekle.

---

## Özet öncelik

- **Hızlı:** 1 (alert’ler), 4 (API logger).
- **Kalite:** 2 (type-check), 6 (form validasyonu), 9 (birim test).
- **İş değeri:** 11 (PDKS/İK), 12 (Finans), 14 (Excel export).
- **Altyapı:** 17 (log dosyası), 19 (Docker production), 20 (yedek rotasyonu).

**Genel notlar:**
- Her madde sonrası: `npm test`, `npm run test:e2e`, `npm run build`.
- Dokümantasyonu güncelle; “yapıldı” işaretle.
- Önce 1, 4, 17, 20 gibi düşük riskli maddelerle başlamak mantıklıdır.
