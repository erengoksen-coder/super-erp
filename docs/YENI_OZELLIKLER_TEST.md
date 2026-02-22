# Yeni Özellikler – Test Rehberi

Bu dokümanda son eklenen özelliklerin nasıl test edileceği özetlenir.

## 1. Otomatik E2E testi

Giriş yapmış kullanıcı ile yeni özelliklerin testi:

```bash
# Ortam değişkenleri (isteğe bağlı; yoksa admin / admin1234 kullanılır)
set PLAYWRIGHT_TEST_USER=admin
set PLAYWRIGHT_TEST_PASSWORD=admin1234

# Sadece yeni özellikler testi
npx playwright test e2e/yeni-ozellikler.spec.ts --headed --project=chromium

# Tüm proje testleri
npm run test:e2e
```

## 2. Manuel kontrol listesi

### Liste sıralama
- **Siparişler** (`/orders`): Üstte "Sırala: Tarih | Sipariş No | Tutar | Cari" butonları; tıklayınca sıra değişmeli.
- **Faturalar** (`/invoices`): Tablo başlıklarına (Fatura No, Müşteri, Tarih, Tutar) tıklayınca sıralama değişmeli.
- **Cari** (`/accounts`): Kod, Ad/Ünvan, Tip, Bakiye, Tarih başlıklarına tıklanınca sıralama değişmeli.
- **Sevkiyat** (`/shipments`): Sevk No, Müşteri, Tarih, Adet, Durum başlıklarına tıklanınca sıralama değişmeli.

### Klavye kısayolları
- **Faturalar**: Bir satıra tıkla (mavi vurgu), **Enter** → fatura detay sayfası açılmalı. **Esc** → vurgu kalkmalı.
- **Cari**: Bir satıra tıkla, **Enter** → cari detay. **Esc** → vurgu kalkar veya açık modal kapanır.
- **Sevkiyat**: Bir satıra tıkla, **Enter** → sevkiyat detay. **Esc** → vurgu kalkmalı.
- **Siparişler**: Bir karta tıkla, **Enter** → üretim varsa üretim detayı, yoksa düzenleme modalı. **Esc** → modal kapanır veya seçim kalkar.

### Detay sayfasında Yazdır
- **Fatura detay** (`/invoices/[id]`): Sağ üstte "Yazdır" butonu → tıklanınca yazdırma önizlemesi açılmalı.
- **Cari detay** (`/accounts/[id]`): "← Geri" yanında "Yazdır" butonu → tıklanınca yazdırma önizlemesi.
- **Sevkiyat detay**: Zaten mevcut "Yazdır" butonu çalışıyor olmalı.

### Dashboard
- **Stok uyarıları**: Kritik stok veya açık stok uyarısı varsa turuncu/sarı kutular görünmeli; tıklanınca ilgili sayfaya gidilmeli.
- **Bekleyen onaylar**: Onay bekleyen sevkiyat varsa mavi kutu ("X sevkiyat onay bekliyor") görünmeli; tıklanınca `/shipments?status=pending_approval` açılmalı.

### Şifre gücü göstergesi
- **Ayarlar → Şifre değiştir** (`/settings/change-password`): "Yeni şifre" alanına yazarken altında çubuk ve "Şifre gücü: Zayıf/Orta/İyi/Güçlü" metni görünmeli.
- **Kayıt** (`/auth/register`): Şifre alanına yazarken aynı göstergenin çıkması gerekir.

### Cari bakiye filtresi
- **Cari** (`/accounts`): "Bakiye Filtresi" açılır listesi: Tümü | Borçlu (bakiye > 0) | Alacaklı (bakiye < 0) | Bakiye sıfır. Seçince liste ve sayfa URL’i (`?balance=debt` vb.) güncellenmeli.

## 3. Build kontrolü

Projenin hatasız derlendiğinden emin olmak için:

```bash
npm run build
```

TypeScript kontrolü:

```bash
npx tsc --noEmit
```
