# Birlikte Test Checklist – Kritik Stok & Sipariş Özellikleri

Sunucu çalışıyorsa: **http://localhost:3000** (veya kullandığınız adres). Giriş yapın.

---

## 1. Kritik Stok – Seçim ve Satın Alma Talebi

- [ ] **Sayfa:** Stok / Kritik Stok (veya **Satın Alma → Kritik Stok**)
- [ ] Tabloda en az bir kritik malzeme varsa:
  - [ ] Bir satırın **checkbox**’ını işaretleyin
  - [ ] **"Seçilenler için talep (1)"** butonunun aktif olduğunu görün
  - [ ] Butona tıklayın → "X satın alma talebi oluşturuldu" toast’ı çıksın
  - [ ] **Satın Alma Talepleri** sayfasında yeni talebin göründüğünü kontrol edin
- [ ] **Tümünü seç** kutusu ile tüm satırları seçip tekrar "Seçilenler için talep" deneyin (birden fazla talep oluşmalı)

---

## 2. Önerilen Miktar Açıklaması (Tooltip)

- [ ] **Kritik Stok** sayfasında **"Önerilen Miktar"** sütun başlığındaki **bilgi (ℹ) ikonuna** mouse ile gelin
- [ ] Tooltip’te şu anlama yakın bir metin görün: *"BOM (reçete) ve açık siparişlere (bekleyen + üretimde) göre hesaplanır."*
- [ ] Tablodaki bir **Önerilen Miktar** hücresine de gelince aynı/açıklayıcı bir tooltip çıksın

---

## 3. Malzeme Listesinde Miktar Formatı (100 / 26.5)

- [ ] **Depo → Malzemeler** (veya **Stok → Malzemeler**) sayfasına gidin
- [ ] Listede **tam sayı** stoklu bir malzeme varsa (örn. 10, 100): **10** veya **100** görünmeli, **10.00** olmamalı
- [ ] Ondalıklı stok varsa (örn. 26.5): **26.5** gibi görünmeli (gereksiz **.00** olmamalı)
- [ ] Bir malzemeye tıklayıp **hızlı işlem** (stok giriş/çıkış) penceresinde **Mevcut Stok** aynı formatta (100 veya 26.5) görünsün

---

## 4. Dashboard – "Bu Hafta Teslim"

- [ ] **Kontrol Paneli** (ana sayfa) açın
- [ ] KPI kartları arasında **"Bu Hafta Teslim"** kartı olsun
- [ ] Üzerinde bu hafta teslim tarihli sipariş sayısı görünsün (0 veya pozitif)
- [ ] Karta tıklayınca **Siparişler** sayfasına yönlensin

---

## 5. Siparişler – Özet Kartları

- [ ] **Siparişler** sayfasına gidin
- [ ] Üstte **5 özet kart** görünsün: **Beklemede**, **Üretimde**, **Bu Hafta Teslim**, **Gecikmiş**, **Sevk Edilen**
- [ ] Sayılar makul olsun (mevcut verilerinize göre)
- [ ] **Beklemede** kartına tıklayın → Liste "Beklemede" filtresine geçsin
- [ ] **Üretimde** kartına tıklayın → Liste "Üretimde" filtresine geçsin
- [ ] **Sevk Edilen** kartına tıklayın → Liste "Sevk Edilen" filtresine geçsin

---

## 6. Kritik Stok PDF – Sipariş Notu

- [ ] **Kritik Stok** sayfasında **"PDF İndir"** tıklayın
- [ ] İnen PDF’i açın
- [ ] Tarih satırının hemen altında gri, küçük puntolu bir not olsun:  
  *"Onerilen miktarlar BOM (recete) ve acik siparislere (bekleyen + uretimde) gore hesaplanmistir."*

---

## Hızlı API Kontrolü (isteğe bağlı)

Tarayıcı veya Postman’de giriş yaptıktan sonra:

- `GET /api/orders/summary` → `{ pending, in_production, completed, deliveriesThisWeek, overdue }` döner
- `GET /api/purchase/critical-stock` → Kritik malzeme listesi (suggested_quantity BOM+siparişe göre)
- `GET /api/dashboard/stats` → İçinde `deliveriesThisWeek` alanı olur

---

*Bu checklist, eklenen 6 özelliğin manuel testi içindir.*
