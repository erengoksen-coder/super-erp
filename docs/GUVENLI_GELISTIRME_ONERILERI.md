# Programı Nasıl Geliştirebiliriz? (Çalışan Hiçbir Şeyi Bozmadan)

Bu belge, **sadece ekleme / iyileştirme** yapılabilecek, mevcut akışları **bozmayan** geliştirme fikirlerini listeler. Öncelik: önce düşük risk, sonra orta.

---

## 1. Tamamen güvenli (sadece ekleme)

| # | Öneri | Ne yapılır | Neden güvenli |
|---|--------|------------|----------------|
| 1.1 | **Raporlarda "Bu ay" / "Bu yıl" preset** | Tarih filtresine hazır seçenek ekle (EKLENEBILECEKLER 2.1) | Sadece yeni seçenek; mevcut filtreler aynı kalır |
| 1.2 | **ROUTES / sabitler genişletme** | Eksik sayfa yollarını `lib/constants.ts` içine ekle (8.3) | Sadece sabit; mevcut linkler değişmez |
| 1.3 | **Excel/CSV içe aktarma şablonu** | Cari, ürün, sipariş için örnek şablon + docs (6.3) | Sadece yeni dosya ve doküman; API/sayfa dokunulmaz |
| 1.4 | **Klavye kısayolu yardımı** | Var olan kısayolları listeleyen bir "?" veya Ctrl+/ paneli | Sadece yeni UI; mevcut kısayollar aynı |
| 1.5 | **Sayfa bazlı lazy loading** | Ağır sayfaları `dynamic(..., { ssr: false })` ile yükle (7.2) | Sadece yükleme şekli; iş mantığı aynı |
| 1.6 | **Vergi (KDV) özet raporu** | Raporlar menüsüne KDV özeti sayfası + export (ERPDEN F4) | Yeni sayfa/endpoint; mevcut raporlar değişmez |
| 1.7 | **API dokümantasyonu** | Mevcut API’leri OpenAPI/Swagger veya basit markdown listesi (8.2) | Sadece doküman veya yeni statik sayfa |

---

## 2. Düşük risk (küçük, izole değişiklikler)

| # | Öneri | Ne yapılır | Dikkat |
|---|--------|------------|--------|
| 2.1 | **Favori / sık kullanılan sayfalar** | Sidebar’da “sabitle” butonu, localStorage’da saklama (1.5) | Sadece sidebar + storage; routing aynı |
| 2.2 | **Şifre politikası** | Kayıt/şifre değiştirirken min uzunluk, özel karakter uyarısı (4.3) | Sadece validasyon; giriş akışı aynı |
| 2.3 | **Rol bazlı menü tamamlama** | Zaten kısmen var; eksik sayfada `canAccessPath` kontrolü (4.5) | Sadece gizleme; yetkisi olan aynı şekilde görür |
| 2.4 | **Raporlarda tarih preset’leri** | “Bu ay”, “Bu yıl” butonları; mevcut date picker’a ek (2.1) | Sadece varsayılan değer; API aynı |
| 2.5 | **Denetim izi (audit) genişletme** | Yeni tablolara/aksiyonlara audit log yazma; admin’de zaten listeleniyor (3.1, R4) | Sadece yeni log satırları; mevcut akışlar aynı |
| 2.6 | **Yedekleme “Şimdi yedekle”** | Admin’de buton; mevcut script’i tetikler veya log’a “yedek alındı” yazar (3.2, G4) | Yeni buton/endpoint; mevcut veri silinmez |

---

## 3. Orta risk (planlı, test ederek)

| # | Öneri | Ne yapılır | Önlem |
|---|--------|------------|--------|
| 3.1 | **Klavye kısayolları (Ctrl+K, G+D vb.)** | Command palette veya global listener (1.2) | Varsayılan tarayıcı kısayollarıyla çakışmamasına dikkat |
| 3.2 | **Tablo sütun göster/gizle** | Listelerde sütun seçici; tercih localStorage (1.6) | Mevcut sütunlar varsayılan kalsın; sadece gizleme |
| 3.3 | **Satın alma talebi onay akışı** | Taslak → Onaylandı → Sipariş (9.1) | Sadece yeni durumlar; mevcut “onaylandı” davranışı korunsun |
| 3.4 | **İki faktörlü doğrulama (2FA)** | TOTP; girişte opsiyonel (4.1, G1) | Opsiyonel; 2FA kapalıyken mevcut giriş aynı |
| 3.5 | **E-posta ile rapor gönder** | Seçilen raporu mail atma (2.2) | Yeni buton/endpoint; mevcut export aynı kalır |
| 3.6 | **Webhook retry + log** | Başarısız webhook’ları tekrar dene; admin’de listele (6.2) | Mevcut webhook tetiklemesi aynı; sadece retry + log |

---

## 4. Yüksek değer ama daha büyük iş (sprint konusu)

- **Çoklu depo** (S1), **Lot/seri takibi** (S3): Yeni tablolar ve akışlar; mevcut stok akışı ayrı korunabilir.
- **Müşteri portalı** (C2), **Teklif / proforma** (C3): Yeni modül/sayfalar; mevcut sipariş/fatura akışı değişmez.
- **Büyük listelerde sanal liste** (7.1): Sadece uzun listelerde; kısa listeler mevcut tabloyla kalabilir.

---

## 5. Hiç dokunulmaması gerekenler (kırılma riski)

- Mevcut giriş / oturum açma akışının mantığı
- Cari bakiye hesaplama ve yevmiye entegrasyonu
- Stok giriş/çıkış ve rezervasyon sayısal tutarlılığı
- Fatura ve sipariş numaralandırma
- Mevcut yetki kontrolü (sadece yeni sayfalara aynı model uygulanır)

---

## Önerilen sıra (çalışan hiçbir şeyi bozmadan)

1. **Hemen:** 1.2 (ROUTES), 1.3 (şablon + doc), 1.7 (API listesi) – sadece doküman/sabit.
2. **Kısa:** 1.1 (rapor preset), 1.4 (kısayol yardımı), 2.1 (favori sayfalar), 2.5 (audit genişletme).
3. **Sonra:** 1.6 (KDV raporu), 2.2 (şifre politikası), 2.6 (yedekleme butonu), 3.1 (klavye kısayolları).

İstediğiniz satırın **numarasını** (örn. 1.1, 2.3) yazarsanız, o madde için adım adım uygulama planı çıkarabilirim; her adımda “mevcut davranışı değiştirmiyoruz” kuralına uyarız.
