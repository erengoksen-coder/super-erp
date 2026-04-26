# Programı Daha Üst Seviyeye Taşımak

Bu belge, LIVASOFA ERP’yi bir üst seviyeye taşımak için **öncelikli ve uygulanabilir** adımları özetler. Mevcut dokümanlarla (GELISTIRME_ONERILERI, BASKA_YAPILABILECEKLER, ILERI_SEVIYE_YAPILANLAR) uyumludur.

---

## Öncelik 1: Hızlı kazanımlar (1–2 hafta)

| # | Konu | Ne yapılır | Fayda |
|---|------|-------------|--------|
| 1 | **Audit log dışa aktarma** | Admin / audit sayfasına “Excel/CSV indir” ekleyin; `audit_logs` tablosunu tarih filtresiyle dışa aktarın. | Uyumluluk ve denetim. |
| 2 | **Kritik API’lerde tutarlı log** | Tüm `catch` bloklarında `apiLogger.error` kullanımını kontrol edin; eksik route’lara ekleyin. | Hata takibi ve operasyon. |
| 3 | **Offline / bağlantı göstergesi** | Basit bir “Çevrimdışı” banner veya status (navigator.onLine + API ping); kullanıcıya bilgi verin. | Kullanıcı deneyimi. |
| 4 | **Fatura / sipariş numarası formatı** | Numaraların tek yerden (örn. `lib/numberFormat.ts`) üretildiğinden ve tüm ekranlarda aynı formatta gösterildiğinden emin olun. | Tutarlılık ve raporlama. |
| 5 | **E2E’de tüm geçen test** | Setup’ta tedarikçi + fatura oluşturma zaten var; `SYS-PURCHASE-LINE` ürününün seed’te olduğundan emin olun ki fatura testleri skip olmasın. | CI güveni. |

---

## Öncelik 2: Orta vadeli (1–2 ay)

| # | Konu | Ne yapılır | Fayda |
|---|------|-------------|--------|
| 6 | **Rol / yetki netleştirme** | `lib/auth/permissions-check` ve menü filtrelerini tek bir “yetki matrisi” (rol × sayfa/aksiyon) ile besleyin; dokümante edin. | Bakım kolaylığı, güvenlik. |
| 7 | **Büyük listelerde sanal kaydırma** | 500+ satırlık sipariş/fatura/cari listelerinde `react-window` veya `@tanstack/react-virtual` ile sadece görünen satırları render edin. | Performans. |
| 8 | **Form validasyonu yaygınlaştırma** | Sipariş, satın alma, sevkiyat formlarında react-hook-form + Zod + alan bazlı hata (accounts/new örneği gibi). | Veri kalitesi, kullanıcı deneyimi. |
| 9 | **Merkezi “boş liste” bileşeni** | Tüm liste sayfalarında aynı EmptyState (ikon + mesaj + “Yeni ekle” butonu) kullanın. | Tutarlı UX. |
| 10 | **Yedek rotasyonu** | `backup-database.js` sonrası “son N yedek sakla, eskileri sil” script’i; cron/Plan Görevleri ile otomatik yedek. | Operasyon, disk alanı. |
| 11 | **CSRF / SameSite** | Cookie’lerde `SameSite` ve kritik POST/PUT/DELETE isteklerinde (isteğe bağlı) CSRF token dokümantasyonu veya uygulaması. | Güvenlik. |
| 12 | **Raporlar: PDF/Excel seçimi** | Önemli raporlarda “Excel indir” yanında “PDF indir” seçeneği (mevcut jsPDF/html2canvas ile). | Esneklik. |

---

## Öncelik 3: Uzun vadeli / stratejik

| # | Konu | Ne yapılır | Fayda |
|---|------|-------------|--------|
| 13 | **Çoklu dil (i18n) hazırlığı** | `lib/i18n` zaten var; tüm kullanıcıya dönük metinleri key’lere taşıyıp varsayılan Türkçe ile doldurun. İleride İngilizce eklemek kolaylaşır. | Ölçeklenebilirlik. |
| 14 | **API sürümleme (isteğe bağlı)** | `/api/v1/...` prefix veya header ile sürüm; mobil / 3. parti entegrasyonlarında kırılmadan evrim. | Entegrasyon. |
| 15 | **Read replica / okuma ölçeklendirme** | Çok yük altında (ileride) SQLite read’leri ayrı bir kopyadan okuyacak mimari (şimdilik dokümante edilebilir). | Ölçek. |
| 16 | **PDKS / İK modülü** | `docs/PDKS_*.md` ve `docs/IK_*.md` planlarına göre izin, bordro, performans ekranlarını tamamlama. | İş değeri. |
| 17 | **Mobil uygulama senkronu** | Mobil (bayi / usta terminali) ile ERP arasında offline-first veri senkronu (değişiklik kuyruğu + çakışma stratejisi). | Sahada kullanım. |

---

## Zaten güçlü olan alanlar

- Rate limiting (login, register, şifre değiştir)
- Error Boundary, toast, PWA, yedek script, health API
- Audit log, webhook, e-posta bildirimleri
- Excel export (dashboard, sipariş, cari, fatura, stok)
- E2E (Playwright), Jest birim testleri
- Docker, dokümantasyon (API, ortam, Docker)

Bu alanlarda sadece **tutarlı kullanım** ve **küçük iyileştirmeler** yeterli (ör. tüm listelerde aynı sayfalama, tüm formlarda aynı validasyon pattern’i).

---

## Önerilen sıra (teknik borç öncelikli)

1. **Hızlı:** Audit export, kritik API log, E2E fatura testi, offline göstergesi.  
2. **Orta:** Yetki matrisi dokümantasyonu, büyük listelerde virtual scroll, form validasyonu yaygınlaştırma, yedek rotasyonu.  
3. **Uzun:** i18n key’leme, PDKS/İK tamamlama, mobil senkron stratejisi.

İstediğiniz maddeyi seçerseniz, uygulama adımlarını aynı dokümana veya ilgili mevcut dokümana ekleyebiliriz.
