# Parola.com Karşılaştırması ve Öneriler

[Parola.com](https://parola.com/) — "Dijital dönüşümün parolası" — Türkiye pazarındaki bir ERP / iş yönetim platformudur. Bu belge, Parola.com’un özellikleri ile **super-erp** projesini karşılaştırır ve geliştirme önerilerini listeler.

---

## 1. Modül karşılaştırması

| Parola.com modülü        | Super-ERP’de durum | Not |
|--------------------------|--------------------|-----|
| **İnsan Kaynakları**     | Var                | Devam/puantaj, giriş-çıkış (QR), izinler, bordro, performans, işe alım, vardiya sayfaları mevcut. |
| **Muhasebe**             | Var                | Finans: yevmiye, hesap planı, büyük defter, mizan, gelir tablosu, bilanço, nakit akışı, metrikler. Ayrıca /accounting. |
| **CRM**                  | Kısmen             | /crm sayfası var; müşteri ilişkileri ve fırsat yönetimi tam akış olarak güçlendirilebilir. |
| **ERP / Üretim**         | Var                | Üretim emirleri, BOM, iş emirleri, operasyonlar, iş merkezleri, MRP, takvim, usta terminali. |
| **Proje Yönetimi**       | Yok                | Ayrı bir “Proje Yönetimi” modülü yok; ileride eklenebilir. |
| **Envanter Yönetimi**    | Var                | Depo, hammadde, mamül, barkod, rezervasyon, fiyat geçmişi, stok hareketleri. |
| **Doküman Yönetimi**     | Yok                | Evrak/dosya yükleme, versiyon, kategorilere göre doküman listesi yok. |
| **Sözleşme Yönetimi**    | Yok                | Sözleşme oluşturma, süre takibi, uyarılar yok. |
| **Takvim**               | Kısmen             | Üretim takvimi var; genel şirket/ekip takvimi veya toplantı/izin takvimi ayrı sayfa olarak düşünülebilir. |
| **E-ticaret**            | Kısmen             | Bayi portalı, sipariş/sevkiyat var; Trendyol/N11/hesaburada vb. marketplace entegrasyonu yok. |

---

## 2. Parola.com’dan esinlenen öneriler

### 2.1 Rol bazlı ana sayfa / kısayollar

**Parola’da:** Pastaneci, Depo şefi, CEO gibi rollere göre farklı mesaj ve kısayollar.

**Öneri:** Super-ERP’de dashboard’a rol veya “görev” seçimi eklenebilir:

- **Üretim / Atölye:** Üretim emirleri, usta terminali, stok girişi.
- **Satış / Ofis:** Siparişler, faturalar, sevkiyat, cari.
- **Yönetim:** Özet KPI’lar, finansal metrikler, raporlar, İK özeti.

Böylece kullanıcı girişte kendi rolüne göre tek tıkla ilgili sayfaya gidebilir.

---

### 2.2 Entegrasyonlar sayfası

**Parola’da:** Trendyol, Hepsiburada, N11, kargo, ödeme sistemleri vb. entegrasyonlar vurgulanıyor.

**Öneri:**

- **Ayarlar** altında “Entegrasyonlar” sayfası: Hangi entegrasyonların (e-ticaret, kargo, ödeme) açık olduğu, API anahtar alanları (maskeli), “Bağlan” / “Kes” butonları.
- Mevcut webhook yapısı bu sayfada “Olaylar ve URL’ler” olarak listelenebilir.
- İleride: N11, Trendyol vb. için sipariş çekme/sevkiyat güncelleme API’leri eklenirse bu sayfadan yönetilebilir.

---

### 2.3 Doküman yönetimi (yeni modül)

**Parola’da:** Doküman Yönetimi modülü var.

**Öneri (kısa özet):**

- **Yeni menü:** “Doküman Yönetimi” veya “Evrak” (Raporlar / Ayarlar yakınında).
- Özellikler: Kategori (sözleşme, fatura kopyası, sertifika vb.), dosya yükleme (PDF, görsel), isteğe bağlı cari/sipariş/fatura ile ilişkilendirme, basit listeleme ve arama.
- Teknik: Dosyalar yerel disk veya S3-benzeri depoda; veritabanında sadece metadata (dosya adı, kategori, ilişkili kayıt id, oluşturan, tarih).

---

### 2.4 Sözleşme yönetimi (yeni modül)

**Parola’da:** Sözleşme Yönetimi modülü var.

**Öneri (kısa özet):**

- **Yeni menü:** “Sözleşme Yönetimi” veya “Sözleşmeler”.
- Özellikler: Sözleşme kaydı (cari hesap ile ilişkili), başlangıç/bitiş tarihi, otomatik “X gün kala bitiyor” uyarısı (bildirim veya dashboard widget), isteğe bağlı doküman modülüne dosya ekleme.
- Basit tablo: Cari adı, sözleşme adı, tarih aralığı, durum (aktif/süresi doldu); filtre ve arama.

---

### 2.5 Takvim: Genel kullanım

**Parola’da:** Takvim modülü var.

**Öneri:**

- **Üretim takvimi** zaten var; “Takvim” menü öğesi tek sayfada toplanabilir:
  - Sekmeler veya filtre: “Üretim” | “İzinler” | “Genel”.
- İzinler zaten İK’da; izin taleplerini takvim görünümünde (tarih bazlı) göstermek.
- İleride: Toplantı, hatırlatıcı veya “genel etkinlik” eklenebilir.

---

### 2.6 E-ticaret entegrasyonları

**Parola’da:** Trendyol, Hepsiburada, N11, Pazarama, Çiçek Sepeti vb. entegrasyonlar.

**Öneri:**

- **Faz 1:** “E-ticaret” veya “Pazaryeri” sayfası: Hangi pazaryerlerinin desteklendiği, “Yakında” / “Planlı” bilgisi; mevcut **Bayi portalı** ve sipariş/sevkiyat akışının bu sayfadan anlatılması.
- **Faz 2:** Bir pazaryeri (örn. N11 veya Trendyol) için resmi API ile:
  - Siparişleri çekme (otomatik veya periyodik),
  - Super-ERP’de sipariş/sevkiyat oluşturma,
  - Stok/sevkiyat durumu güncelleme.
- Ödeme entegrasyonları (İyzico, PayTR) zaten Parola’da vurgulanıyor; super-erp’de ödeme altyapısı (payments) var, ileride ödeme sağlayıcı API’leri eklenebilir.

---

### 2.7 Raporlar ve “iş zekası”

**Parola’da:** “Finans, personel ve performans raporlarına her yerden erişin” vurgusu.

**Öneri:**

- Mevcut raporlar (stok özeti, satış özeti, stok hareketleri, cari yaşlandırma, üretim verimliliği, maliyet, fire) **tek bir “Raporlar” merkezinde** kalabilir; Parola tarzı kısa açıklama ve ikonla liste (zaten kısmen var).
- Ek rapor fikirleri:
  - **Satış / Cari:** Aylık satış trendi, cari bazlı satış dağılımı.
  - **İK:** Devamsızlık özeti, izin kullanımı, bordro özeti (zaten bordro sayfası var; özet dashboard’a çekilebilir).
- Tüm raporlarda **tarih aralığı** ve mümkünse **Excel/PDF indir** tutarlı hale getirilebilir.

---

### 2.8 Sektör / kullanım senaryosu vurgusu

**Parola’da:** “20+ sektörde”, “Pastaneci / Depo şefi / CEO” gibi senaryolar.

**Öneri:**

- Landing veya “Ürün” sayfasında (varsa) kısa senaryolar: “Üretim atölyesi”, “Satış ofisi”, “Depo & sevkiyat”, “Kobi muhasebe”.
- Dashboard’da rol veya “senaryo” seçimi (2.1) ile uyumlu; yeni kullanıcıya “İşletmeniz ne yapıyor?” sorusu ile varsayılan kısayollar atanabilir.

---

### 2.9 Teklif / demo talebi

**Parola’da:** “Hemen teklif alın”, “7 gün ücretsiz deneme”, “Sektörünüze özel demo”.

**Öneri:**

- İleride: “Demo talep formu” (iletişim formu): Ad, e-posta, firma, mesaj; form gönderimi e-posta veya webhook ile ilgili kişiye iletilebilir.
- “Ücretsiz deneme” için mevcut kayıt (register) zaten var; istenirse kayıt sonrası “Deneme süresi: X gün” bilgisi ve yönlendirme metni eklenebilir.

---

## 3. Öncelik sıralaması (öneri)

| Öncelik | Öneri | Gerekçe |
|--------|--------|--------|
| 1 | Rol bazlı dashboard kısayolları (2.1) | Hızlı uygulanır, kullanıcı deneyimini belirgin iyileştirir. |
| 2 | Entegrasyonlar sayfası (2.2) | Webhook ve ileride e-ticaret/kargo için tek merkez. |
| 3 | Raporlar merkezi ve tarih/export tutarlılığı (2.7) | Mevcut yapı üzerine küçük iyileştirmeler. |
| 4 | Takvim: İzin + üretim bir arada (2.5) | Mevcut verilerle tek sayfada toplama. |
| 5 | Doküman yönetimi (2.3) | Parola ile hizalama; orta vadeli modül. |
| 6 | Sözleşme yönetimi (2.4) | Parola ile hizalama; cari ile ilişki doğal. |
| 7 | E-ticaret API entegrasyonu (2.6 Faz 2) | Kaynak gerektirir; bir pazaryeri ile pilot mantıklı. |
| 8 | Sektör/senaryo vurgusu ve demo formu (2.8, 2.9) | Pazarlama ve onboarding için; ihtiyaca göre. |

---

## 4. Mevcut dokümanlarla ilişki

- **docs/BASKA_YAPILABILECEKLER.md:** Buradaki maddeler (İK, finans, e-posta/SMS, export, webhook, raporlar, CRM vb.) Parola karşılaştırması ile çakışan yerlerde öncelik için referans alınabilir.
- **Parola.com:** Sadece özellik ve kullanıcı deneyimi için referans; teknik veya lisans anlamında bağımlılık yok.

Bu belge, Parola.com’a referans vererek super-erp için yol haritası ve öncelik listesi sunar; uygulama detayları ihtiyaca göre ayrı görevlerde ele alınabilir.
