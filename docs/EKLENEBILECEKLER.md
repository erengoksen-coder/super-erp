# LIVASOFA ERP – Eklenebilecekler Listesi

Bu belge, projeye eklenebilecek özellik ve iyileştirmeleri kategorilere göre listeler. Öncelik sırasına göre yol izleyebilirsiniz.

---

## 1. Kullanıcı deneyimi (UX)

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 1.1 | Cari / Fatura / Sipariş listelerinde arama | İsim, kod veya vergi no ile filtre (client veya API `?q=`) | Orta |
| 1.2 | Klavye kısayolları | Örn. Ctrl+K arama, G+D Dashboard, G+O Siparişler | Orta |
| 1.3 | Bildirim tercihi: "Satın alma talebi" | Bildirim ayarlarında bu tipi aç/kapa | Düşük |
| 1.4 | Bildirimden talep detayına link | `reference_id` ile satın alma talebi detay sayfasına gitme | Düşük |
| 1.5 | Favori / sık kullanılan sayfalar | Sidebar’da sabitlenmiş sayfa linkleri | Düşük |
| 1.6 | Tablo sütun göster/gizle | Listelerde kullanıcının göstereceği sütunları seçme | Orta |
| 1.7 | Karanlık/Aydınlık tema seçimi | Zaten dark var; aydınlık tema alternatifi | Orta |

---

## 2. Raporlar ve raporlama

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 2.1 | Raporlarda "Bu ay" / "Bu yıl" varsayılanı | Seçenek olarak ek preset’ler | Düşük |
| 2.2 | Rapor sonuçlarını e-posta ile gönder | Seçilen tarih aralığı raporunu mail atma | Orta |
| 2.3 | Zamanlanmış rapor | Günlük/haftalık stok özeti e-postası | Orta |
| 2.4 | Dashboard’a özelleştirilebilir widget’lar | Kullanıcının ekleyebileceği/kaldırabileceği kartlar | Yüksek |
| 2.5 | PDF/Excel şablon seçimi | Farklı şablonlarla export | Orta |
| 2.6 | Cari yaşlandırma detay export | Aging raporu Excel/PDF | Düşük |

---

## 3. Sistem sürekliliği ve operasyon

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 3.1 | Kritik API’lerde yazma sonrası audit log | Satın alma talebi, sipariş, cari değişiklik vb. için denetim kaydı | Orta |
| 3.2 | Veritabanı yedekleme tetikleyicisi | Admin’den "Şimdi yedekle" veya zamanlanmış yedek | Orta |
| 3.3 | Bakım modu sayfası | Tüm kullanıcılar için "Bakımdayız" ekranı (env ile aç/kapa) | Düşük |
| 3.4 | Uzun export’larda arka planda işlem | Büyük Excel/PDF için job queue veya "hazır olunca indir" linki | Yüksek |
| 3.5 | Rate limit bilgisi | 429 dönüldüğünde kullanıcıya "Çok istek, X sn sonra deneyin" mesajı | Düşük |

---

## 4. Güvenlik ve yetkilendirme

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 4.1 | İki faktörlü doğrulama (2FA) | TOTP (Google Authenticator vb.) | Orta |
| 4.2 | Oturum yönetimi | Aktif oturumları listeleme / cihazdan çıkış | Orta |
| 4.3 | Şifre politikası | Min uzunluk, özel karakter zorunluluğu | Düşük |
| 4.4 | IP / cihaz kısıtlama | Belirli IP veya cihazlarla sınırlı erişim | Orta |
| 4.5 | Rol bazlı menü gizleme | İzin yoksa sidebar’da link göstermeme (kısmen var) | Düşük |
| 4.6 | API anahtarı yönetimi | Harici entegrasyon için API key oluşturma/iptal | Orta |

---

## 5. Mobil ve çevrimdışı

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 5.1 | PWA yükleme (Add to Home Screen) | manifest ve service worker iyileştirmesi | Düşük |
| 5.2 | Kritik sayfaların offline cache’i | Depo, üretim listesi vb. için cache-first strateji | Orta |
| 5.3 | Offline’da form taslağı | Veri girmeden çevrimdışıyken form doldurup sonra gönderme | Yüksek |
| 5.4 | Mobil barkod tarayıcı iyileştirmesi | Kamera izni, hız, format desteği | Orta |

---

## 6. Entegrasyon ve dış sistemler

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 6.1 | E-fatura / e-arşiv entegrasyonu | Mevcut kuyruk yapısının genişletilmesi | Yüksek |
| 6.2 | Webhook’lara retry ve log | Başarısız webhook’ları tekrar deneme + admin’de görme | Orta |
| 6.3 | Excel/CSV toplu içe aktarma şablonu | Cari, ürün, sipariş için örnek şablon ve dokümantasyon | Düşük |
| 6.4 | Dış stok / ERP API’si | REST API ile stok/sipariş sorgulama (read-only) | Orta |
| 6.5 | E-posta şablonları düzenlenebilir | Bildirim maillerinin admin’den düzenlenmesi | Orta |

---

## 7. Performans ve ölçek

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 7.1 | Büyük listelerde sanal liste (virtualization) | 1000+ satırda sadece görünen satırları render | Orta |
| 7.2 | Sayfa bazlı lazy loading | Ağır bileşenlerin dynamic import ile yüklenmesi | Düşük |
| 7.3 | API yanıt cache (Redis vb.) | Sık okunan rapor/özet endpoint’leri için cache | Yüksek |
| 7.4 | Görsel sıkıştırma | Ürün/cari fotoğrafları için thumb/optimize | Orta |
| 7.5 | DB indeks incelemesi | Yavaş sorgular için indeks ekleme | Orta |

---

## 8. Bakım ve kod kalitesi

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 8.1 | E2E test: satın alma talebi → bildirim | Playwright ile akış testi | Düşük |
| 8.2 | API dokümantasyonu (OpenAPI/Swagger) | Mevcut api-catalog’dan türetilen veya manuel spec | Orta |
| 8.3 | ROUTES / sabitler genişletme | Eksik sayfa yollarının constants’a eklenmesi | Düşük |
| 8.4 | Hata logları toplama | Kritik hataların merkezi log/arayüzle görüntülenmesi | Orta |
| 8.5 | Ürün/mamül için Supabase TODO | products/new sayfasındaki Supabase notunun netleştirilmesi | Düşük |

---

## 9. İş süreçleri (iş mantığı)

| # | Özellik | Açıklama | Zorluk |
|---|--------|----------|--------|
| 9.1 | Satın alma talebi onay akışı | Taslak → Onaylandı → Sipariş oluşturuldu | Orta |
| 9.2 | Sevkiyat için fatura zorunluluğu | Fatura kesilmeden sevkiyat kapatılamama (opsiyonel kural) | Orta |
| 9.3 | Stok rezervasyon süresi | Rezervasyonun X saat sonra otomatik serbest kalması | Orta |
| 9.4 | Sipariş vade uyarısı | Vadesi yaklaşan/geçen siparişler için dashboard uyarısı | Düşük |
| 9.5 | Çoklu depo / şube | Depo bazlı stok, transfer fişi | Yüksek |
| 9.6 | Seri/lot takibi | Mamül/hammadde için seri no ve lot bazlı hareket | Yüksek |

---

## 10. Kısa vadede hızlı kazanım (önerilen sıra)

Aşağıdaki sıra, az eforla hissedilir iyileştirme sağlar:

1. **1.4** – Bildirimden talep detayına link  
2. **1.3** – Bildirim tercihi: satın alma talebi  
3. **3.5** – Rate limit bilgisi (429 mesajı)  
4. **2.6** – Cari yaşlandırma export  
5. **3.3** – Bakım modu sayfası  
6. **8.1** – E2E: satın alma talebi → bildirim  
7. **1.1** – Cari/Fatura listelerinde arama  
8. **4.5** – Rol bazlı menü gizleme (tamamlama)  
9. **9.4** – Sipariş vade uyarısı  
10. **5.1** – PWA Add to Home Screen iyileştirmesi  

---

## Nasıl kullanılır?

- **Öncelik:** Önce 10. maddede önerilen kısa vadeli listeyi bitirebilirsiniz.  
- **Kategori:** Belirli bir alan (rapor, güvenlik, mobil vb.) öncelikliyse ilgili bölümden seçim yapın.  
- **Zorluk:** Düşük → hızlı, Orta/Yüksek → planlı sprint konusu yapılabilir.

İstediğiniz satırın **numarasını** (örn. 1.1, 3.3) söylemeniz yeterli; o maddeye göre adım adım yol haritası çıkarabilirim.
