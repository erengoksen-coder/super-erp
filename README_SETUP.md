# 🚀 LIVASOFA ERP - Kurulum Rehberi

## 📋 Adım 0: Supabase Kurulumu

### 1. Supabase Projesi Oluşturun
1. [Supabase](https://supabase.com) sitesine gidin
2. Yeni proje oluşturun
3. Proje URL ve Anon Key'i kopyalayın

### 2. Environment Variables
`.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Veritabanı Şemasını Oluşturun
Supabase SQL Editor'de sırayla çalıştırın:

1. **`supabase/migrations/002_production_schema.sql`** - Ana şema
   - Products, Stocks, BOM, Production Orders tabloları
   - Trigger'lar ve View'lar

2. **`supabase/seed.sql`** - Test Verileri (Opsiyonel)
   - 5 koltuk modeli
   - 11 hammadde
   - Her ürün için BOM reçeteleri

### 4. Projeyi Çalıştırın
```bash
npm install
npm run dev
```

## 🎯 Sistem Mimarisi

### Veritabanı Yapısı

```
Products (Koltuk Modelleri)
    ↓
BOM (Bill of Materials - Reçete)
    ↓
Stocks (Hammaddeler)
    ↓
Production Orders (Üretim Emirleri)
    ↓
Stock Movements (Stok Hareketleri - Otomatik)
```

### BOM Mantığı

1. **Ürün Seçimi** → BOM otomatik yüklenir
2. **Miktar Girme** → Toplam gereken hesaplanır
3. **Stok Kontrolü** → Yeterli/yetersiz kontrol edilir
4. **Üretim Başlatma** → 
   - Üretim emri oluşturulur
   - Stoklar otomatik düşer (trigger ile)
   - Stok hareketleri kaydedilir

## 📊 Test Verileri

Seed dosyası çalıştırıldığında:

- **5 Koltuk Modeli**: Chester, Berjer, Kanepe 2+1, Köşe, Tekli
- **11 Hammadde**: 3 kumaş, 3 sünger, 3 ayak, 2 diğer
- **Her ürün için BOM**: Detaylı reçeteler

## 🔧 Özellikler

### ✅ Tamamlanan
- [x] Dark mode arayüz
- [x] Sol sidebar menü
- [x] Dashboard sayfası
- [x] Ürün yönetimi
- [x] Stok yönetimi
- [x] Üretim emri oluşturma
- [x] BOM (Reçete) sistemi
- [x] Otomatik stok düşüşü
- [x] Stok kontrolü ve uyarılar

### 🚧 Yapılacaklar
- [ ] Üretim emri listesi
- [ ] Stok giriş/çıkış işlemleri
- [ ] Cari hesap yönetimi
- [ ] Fatura sistemi
- [ ] Raporlar

## 💡 Kullanım Örnekleri

### Üretim Emri Oluşturma
1. `/production/new` sayfasına gidin
2. Ürün seçin (örn: Chester Koltuk)
3. Miktar girin (örn: 10 adet)
4. BOM otomatik yüklenir
5. Stok kontrolü yapılır
6. "Üretimi Başlat" → Stoklar otomatik düşer

### Stok Kontrolü
- Yetersiz stok varsa kırmızı uyarı gösterilir
- Yeterli stok varsa yeşil onay gösterilir
- Üretim başlatılamaz (buton devre dışı)

## 🐛 Sorun Giderme

### Supabase Bağlantı Hatası
- `.env.local` dosyasını kontrol edin
- Supabase projesinin aktif olduğundan emin olun

### Stok Düşmüyor
- Trigger'ların çalıştığından emin olun
- `stock_movements` tablosunu kontrol edin

### BOM Görünmüyor
- `product_bom_view` view'ının oluşturulduğundan emin olun
- Ürün için BOM kaydı olduğunu kontrol edin


