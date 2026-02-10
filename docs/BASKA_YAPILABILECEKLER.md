# Başka Ne Yapılabilir? (Uygulama yok — sadece fikir listesi)

Bu dokümanda **henüz uygulanmamış** veya **tamamlanmamış** geliştirme fikirleri listelenir. İstediğiniz maddeyi seçerseniz uygulama adım adım yapılabilir. **Uygulanan** maddeler ✅ ile işaretlidir.

---

## Kısa vadede (teknik borç / tamamlama)

1. **Kalan alert → toast** ✅  
   `docs/KALAN_ALERT_MIGRASYONU.md` içindeki sayfalarda hâlâ `alert()` var. Hepsi `toast.success` / `toast.error` / `toast.warning` ile değiştirilebilir. *(Ana uygulama sayfalarında alert kalmadı.)*

2. **TypeScript type-check açmak** ✅  
   `next.config.ts` içinde `typescript.ignoreBuildErrors: true` kapatılıp proje genelinde tip hataları düzeltilirse build tam type-check ile çalışır. *(ignoreBuildErrors: false yapıldı; accounts/new resolver tipi, orders sayfa çift min, nodemailer @ts-expect-error düzeltildi; build geçiyor.)*

3. **`lib/constants.ts` kullanımı** ✅  
   Sabitler tanımlandı ama sayfalarda hâlâ `'/orders'`, `'/barcodes'` gibi string’ler yazılı olabilir. Route ve API path’lerde `ROUTES.ORDERS`, `API_PREFIX` kullanımı yaygınlaştırılabilir.

4. **API’lerde logger kullanımı**  
   Sadece login’de `apiLogger.error` kullanılıyor. Diğer kritik route’larda (kayıt, sipariş, ödeme vb.) catch bloklarında da `apiLogger.error` eklenebilir. *(BOM, materials, users, orders, invoices, shipments, accounts, payments, register, hr/clock ve handleApi dahil.)*

5. **E2E skip’leri** ✅ (kısmen)  
   “Tüm ana sayfalar açılır” ve bazı modül testleri bazen oturum yok diye skip oluyor. Auth state (cookie / storage state) nedeni araştırılıp skip oranı düşürülebilir.

---

## Orta vadede (deneyim ve kalite)

6. **Form validasyonu (inline hata)** ✅  
   Önemli formlarda (sipariş, cari, BOM, üretim emri) react-hook-form + Zod ile alan bazlı hata mesajları (input altında kırmızı metin) eklenebilir; sadece toast değil. *(accounts/new: inline hata + border-red-500 + aria-invalid; diğer formlara yaygınlaştırılabilir.)*

7. **Ortak boş durum bileşeni** ✅  
   Liste/tablo sayfalarında veri yokken tek tip bir “Henüz kayıt yok” / “Filtreye uygun sonuç yok” + aksiyon butonu kullanılabilir (EmptyState benzeri).

8. **Sayfalama tutarlılığı** ✅  
   Sipariş dışındaki büyük listelerde (faturalar, cari, stok hareketleri) de `limit` / `offset` ve `meta.total` ile sayfalama getirilebilir. *(api/invoices ve api/accounts GET: limit, offset, meta.total; PAGINATION sabitleri; frontend sayfa UI isteğe bağlı eklenebilir.)*

9. **Birim test artışı** ✅  
   `lib/auth/password.ts`, `lib/validation/schemas.ts`, `lib/api/response.ts` ve kritik API handler’lar için Jest/Vitest testleri eklenebilir. *(schemas: accountSchemas.create, orderSchemas.create; response + next/server mock; 55 test geçiyor.)*

10. **Erişilebilirlik** ✅  
    Sadece ikon olan butonlara `aria-label`, modal’lara `role="dialog"` ve `aria-modal`, form alanlarına `aria-invalid` / `aria-describedby` eklenebilir. *(Sidebar: menü kapat, menü aç/daralt, tema, çıkış; Modal: role=dialog, aria-modal, aria-labelledby, Kapat aria-label.)*

---

## İş / özellik (modül geliştirme)

11. **PDKS / İK** ✅ (kısmen)  
    `docs/PDKS_*.md`, `docs/IK_*.md` planlarına göre giriş/çıkış (QR veya kart), izin talepleri, bordro özet ekranları genişletilebilir. *(QR ile giriş/çıkış ve lokasyon QR’ı zaten var; hr_attendance’a workplace_id eklendi, clock API lokasyonu kaydediyor; raporlarda lokasyon filtresi genişletilebilir.)*

12. **Finans** ✅ (kısmen)  
    `docs/FINANS_BOLUMU_DUZENLEME_PLANI.md` ile ödeme fişi, muhasebe fişi, rapor (gelir/gider, nakit akış) akışları iyileştirilebilir veya yeni raporlar eklenebilir. *(Mizan, Gelir Tablosu, Bilanço, Nakit Akışı, Metrikler sayfaları mevcut; finans ana sayfaya dönem özeti + finansal metrik özeti (cari oran, net kâr marjı, özkaynak kârlılığı) eklendi.)*

13. **E-posta / SMS** ✅ (kısmen)  
    `lib/notifications` altyapısı kullanılarak sipariş onayı, sevkiyat bildirimi, şifre sıfırlama linki gibi e-posta/SMS tetiklenebilir (env ile açılıp kapatılır). *(Sipariş ve sevkiyat onayı e-postası + şifre sıfırlama zaten var; ENABLE_EMAIL_NOTIFICATIONS ile toplu kapatma eklendi; SMS altyapısı mevcut, tetikleme isteğe bağlı eklenebilir.)*

14. **Excel / CSV export** ✅ (kısmen)  
    Sipariş listesi, cari hesap listesi, stok listesi, fatura listesi için “Excel/CSV indir” butonu eklenebilir (dashboard export’a benzer). *(Sipariş, cari, fatura, dashboard, stok özeti zaten vardı; malzeme listesi için GET /api/materials/export + Hammadde Depo sayfasında “Excel İndir” butonu eklendi.)*

15. **Webhook event’leri** ✅ (kısmen)  
    Mevcut webhook yapısına `order.created`, `shipment.approved`, `invoice.issued`, `stock.low` gibi event’ler eklenip dış sistemlere bildirim verilebilir. *(order.created, shipment.approved, invoice.issued, stock.low, production.started/completed zaten tetikleniyor; shipment.created sevkiyat oluşturulunca eklendi; admin/webhooks’ta event seçenekleri mevcut.)*

16. **Rapor sayfaları** ✅ (kısmen)  
    Satış özeti (tarih aralığı), stok hareket özeti, cari hesap yaşlandırma, üretim verimliliği gibi sabit rapor sayfaları eklenebilir. *(API’ler zaten vardı; /reports/sales-summary, /reports/stock-movements, /reports/aging, /reports/production sayfaları eklendi; ana rapor sayfasına “Diğer raporlar” linkleri eklendi.)*

---

## Altyapı ve operasyon

17. **Log dosyasına yazma** ✅  
    `lib/api/logger.ts` şu an console’a yazıyor. İsteğe bağlı: `logs/api-error.log` gibi bir dosyaya append veya harici log servisi entegrasyonu.

18. **Health / monitoring** ✅  
    `GET /api/health?deep=true` zaten var; isteğe bağlı: basit bir uptime/status sayfası (`/durum` gibi) veya monitoring (Prometheus/DataDog) metrikleri. *(app/durum/page.tsx: health API ile gerçek durum gösteriliyor.)*

19. **Docker production** ✅ (kısmen)  
    `docker-compose` ile production build ve tek komutla ayağa kalkma (env ile DB path, JWT secret) dokümante edilip test edilebilir. *(DATABASE_PATH/DATABASE_URL env ile veritabanı yolu; docker-compose’ta JWT_SECRET, PORT, volume ./data; docs/DOCKER_PRODUCTION.md; Dockerfile production build + next start.)*

20. **Yedek rotasyonu** ✅  
    `backup-database.js` ile oluşan yedekler için “son 7 gün sakla, eskileri sil” gibi bir rotasyon script’i eklenebilir.

---

## Özet öncelik (isteğe bağlı sıra)

- **Hızlı:** 1 (kalan alert’ler), 4 (API logger yaygınlaştırma).  
- **Kalite:** 2 (type-check), 6 (form validasyonu), 9 (birim test).  
- **İş değeri:** 11 (PDKS/İK), 12 (Finans), 14 (Excel export).  
- **Altyapı:** 17 (log dosyası), 19 (Docker production), 20 (yedek rotasyonu).

İstediğiniz madde(ler)in numarasını söylerseniz, o maddeler için uygulama adımları yazılabilir veya doğrudan kod değişikliği yapılabilir.
