# Odoo / ERP’lerden LIVASOFA’ya Katılabilecekler

**Not:** "Opsen" adında bir ERP ürünü kaynaklarda net bulunamadı. Bu belge **Odoo** (envanter, üretim, satış modülleri) ve yaygın **ERP modül listeleri** referans alınarak hazırlandı. LIVASOFA’da neler var, neler eklenebilir özetleniyor; onayladıklarınız uygulanacak.

---

## Mevcut durum (LIVASOFA’da olanlar)

| Alan | Durum |
|------|--------|
| **Stok** | Malzeme/mamül stok, min seviye, kritik stok uyarısı, stok giriş/çıkış, barkod, rezervasyon, fiyat geçmişi |
| **Üretim** | Üretim emri, BOM, iş emirleri, istasyonlar, MRP, takvim, usta terminali |
| **Satış** | Sipariş, satış siparişi, sevkiyat, fatura, cari hesap, risk limiti, onay akışı |
| **Satın alma** | Satın alma talebi, satın alma siparişi, kritik stoktan talep |
| **Finans** | Cari, çek/senet, yevmiye, hesap planı, mizan, raporlar, kurlar |
| **Raporlar** | Stok özeti, sipariş/üretim özeti, satış özeti, stok hareketleri, cari yaşlandırma, aging |
| **Sistem** | Rol/izin, bildirimler, health/ready, bakım modu, PWA, offline banner |

---

## 1. Stok / Envanter (Odoo tarzı)

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| S1 | **Çoklu depo** | Birden fazla depo tanımı, depo bazlı stok, depolar arası transfer fişi | Yüksek | ★★★ |
| S2 | **FIFO / stok çıkış stratejisi** | İlk giren ilk çıkar veya ortalama maliyet; stok çıkışında otomatik parti/lot seçimi | Orta | ★★ |
| S3 | **Lot / seri takibi** | Hammadde veya mamülde seri no / lot no ile hareket takibi, rapor | Yüksek | ★★★ |
| S4 | **Stok sayım (envanter)** | Periyodik sayım planı, sayım fişi, fark listesi, muhasebe entegrasyonu | Orta | ★★ |
| S5 | **Ürün türleri** | Depolanabilir / tüketilebilir / hizmet; stoklanmayan ürünler için ayrı akış | Düşük | ★ |
| S6 | **İkmal uyarıları (gelişmiş)** | Tedarik süresi, tahmini tükenme tarihi, otomatik satın alma önerisi | Orta | ★★ |
| S7 | **Stok yaşlandırma raporu** | Ürünlerin depoda kalma süresi, son kullanma / üretim tarihine göre listeleme | Orta | ★★ |
| S8 | **İade yönetimi** | Müşteri iade süreci (iade fişi, stok girişi, kredi notu / iade faturası) | Orta | ★★ |

---

## 2. Üretim (Odoo tarzı)

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| U1 | **Kapasite planlama** | İş merkezi kapasitesi, Gantt / zaman çizelgesi, çakışma uyarısı | Yüksek | ★★ |
| U2 | **Kalite kontrol noktaları** | Üretim rotasında kontrol adımları, onay/red, kayıt | Orta | ★★ |
| U3 | **Bakım modülü** | Makine/ekipman kartı, önleyici bakım planı, arıza kaydı | Orta | ★ |
| U4 | **Taşeron / dış işlem** | BOM’da taşeron işi, dışarı gönderim, mal kabul ile stok girişi | Yüksek | ★ |
| U5 | **Üretim maliyet raporu** | Emir bazında malzeme + işçilik (opsiyonel) maliyeti, karşılaştırma | Orta | ★★ |

---

## 3. Satış / CRM

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| C1 | **Fırsat (pipeline)** | Teklif aşaması, satış fırsatları kanban, tahmini tutar/tarih | Orta | ★★ |
| C2 | **Müşteri portalı** | Müşteri girişi, sipariş/sevkiyat/fatura görüntüleme, iade talebi başlatma | Yüksek | ★★ |
| C3 | **Teklif / proforma** | Müşteriye teklif oluşturma, onay sonrası siparişe dönüşüm | Orta | ★★ |
| C4 | **Abonelik / tekrarlayan sipariş** | Periyodik sipariş tanımı, otomatik sipariş oluşturma | Orta | ★ |

---

## 4. Satın alma / Tedarik

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| T1 | **Tedarikçi fiyat listesi** | Tedarikçi–ürün bazlı fiyat ve teslimat süresi, otomatik satın alma fiyatı | Orta | ★★ |
| T2 | **Teklif toplama (RFQ)** | Satın alma talebi için tedarikçilere teklif isteme, karşılaştırma, seçim | Orta | ★★ |
| T3 | **Mal kabul** | Satın alma siparişine göre gelen mal girişi, kısmi kabul, red | Orta | ★★ |
| T4 | **Otomatik satın alma kuralı** | Min/max stok veya tüketim tahmini ile otomatik satın alma talebi veya sipariş önerisi | Orta | ★★ |

---

## 5. Finans / Muhasebe

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| F1 | **Stok değerleme (FIFO/ortalama)** | Stok çıkışında maliyet yöntemi, dönem sonu değerleme raporu | Orta | ★★ |
| F2 | **Bütçe modülü** | Hesap/dönem bazlı bütçe, bütçe–gerçekleşen karşılaştırma | Orta | ★ |
| F3 | **Çoklu para birimi (gelişmiş)** | Fatura/ödeme tutarının döviz cinsinden saklanması, kur farkı kaydı | Orta | ★★ |
| F4 | **Vergi raporu** | KDV özeti, beyan dönemine göre filtre, export | Düşük | ★★ |

---

## 6. Lojistik / Sevkiyat

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| L1 | **Kargo entegrasyonu** | Kargo firması API (etiket, takip no), müşteriye otomatik bilgi | Yüksek | ★ |
| L2 | **Toplama listesi / picking** | Sevkiyat için depo toplama listesi, barkod ile toplama onayı | Orta | ★★ |
| L3 | **Paket / palet** | Sevkiyat kalemlerinin paketlere bölünmesi, paket barkodu | Orta | ★ |

---

## 7. Raporlama ve analitik

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| R1 | **Özelleştirilebilir dashboard** | Kullanıcının ekleyip kaldırabileceği widget’lar, basit layout | Yüksek | ★ |
| R2 | **Zamanlanmış rapor** | Günlük/haftalık stok veya satış özeti e-postası | Orta | ★★ |
| R3 | **Karşılaştırmalı dönem** | Önceki dönem / önceki yıl ile otomatik karşılaştırma (satış, stok) | Orta | ★★ |
| R4 | **Denetim izi (audit)** | Kritik tablolarda kim, ne zaman, ne değiştirdi; admin’de listeleme | Orta | ★★ |

---

## 8. Sistem ve güvenlik

| # | Özellik | Açıklama | Zorluk | Öncelik |
|---|--------|----------|--------|---------|
| G1 | **İki faktörlü doğrulama (2FA)** | TOTP (Google Authenticator vb.) | Orta | ★★ |
| G2 | **Oturum yönetimi** | Aktif oturumlar listesi, cihazdan çıkış | Orta | ★ |
| G3 | **API anahtarı** | Harici entegrasyon için API key oluşturma/iptal | Orta | ★ |
| G4 | **Veritabanı yedekleme** | Admin’den “Şimdi yedekle”, isteğe bağlı zamanlanmış yedek | Orta | ★★ |

---

## Önerilen uygulama sırası (onay sonrası)

**Hızlı kazanım (düşük/orta zorluk):**
1. **S5** – Ürün türleri (depolanabilir / hizmet)
2. **R4** – Denetim izi (audit log)
3. **F4** – Vergi (KDV) raporu
4. **G4** – Yedekleme tetikleyicisi
5. **R2** – Zamanlanmış rapor (e-posta)

**Orta vadede:**
6. **T1** – Tedarikçi fiyat listesi  
7. **S4** – Stok sayım  
8. **S7** – Stok yaşlandırma raporu  
9. **C3** – Teklif / proforma  
10. **U5** – Üretim maliyet raporu  

**Büyük işler (yüksek zorluk):**
11. **S1** – Çoklu depo  
12. **S3** – Lot/seri takibi  
13. **C2** – Müşteri portalı  

---

## Onay için nasıl kullanılır?

Aşağıya **onayladığınız özellik numaralarını** (örn. S5, R4, F4, G4, R2) yazın; önce onlar uygulanacak. İsterseniz “Önerilen uygulama sırasındaki 1–5’i uygula” da diyebilirsiniz.

| Onayladıklarınız (numara veya isim) | Not |
|-------------------------------------|-----|
| … | … |
