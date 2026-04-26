# 🚀 Supabase SQL Kurulum Rehberi

## 📋 Adım Adım Kurulum

### 1️⃣ Supabase Projesine Giriş

1. Tarayıcınızda [Supabase Dashboard](https://app.supabase.com) adresine gidin
2. Giriş yapın (Google, GitHub veya email ile)
3. Eğer projeniz yoksa:
   - Sağ üstteki **"New Project"** butonuna tıklayın
   - Proje adı girin (örn: "LIVASOFA-ERP")
   - Database Password belirleyin
   - Region seçin (Türkiye için en yakın: "West Europe")
   - **"Create new project"** butonuna tıklayın
   - Projenin oluşturulmasını bekleyin (1-2 dakika)

### 2️⃣ SQL Editor'e Erişim

1. Sol menüden **"SQL Editor"** seçeneğine tıklayın
   - İkon: 📝 veya "SQL Editor" yazısı
   - Sol menüde "Table Editor" altında bulunur

2. Yeni bir sorgu oluşturun:
   - **"New query"** butonuna tıklayın
   - Veya mevcut bir sorgu sekmesini kullanın

### 3️⃣ SQL Dosyasını Açma ve Kopyalama

#### Yöntem 1: Dosyadan Kopyalama (Önerilen)

1. Proje klasörünüzde `supabase/QUICK_START.sql` dosyasını açın
   - Windows: Dosya Gezgini'nde bulun ve çift tıklayın
   - Veya VS Code/Cursor'da açın

2. Tüm içeriği seçin:
   - **Windows/Linux**: `Ctrl + A` (Tümünü seç)
   - **Mac**: `Cmd + A`

3. Kopyalayın:
   - **Windows/Linux**: `Ctrl + C`
   - **Mac**: `Cmd + C`

#### Yöntem 2: Doğrudan İçeriği Görüntüleme

Eğer dosyayı bulamıyorsanız, aşağıdaki SQL kodunu kullanabilirsiniz:

```sql
-- QUICK_START.sql içeriği buraya gelecek
-- (Dosyanın tam içeriği aşağıda)
```

### 4️⃣ SQL Editor'e Yapıştırma

1. Supabase SQL Editor'deki boş sorgu alanına gidin
2. Yapıştırın:
   - **Windows/Linux**: `Ctrl + V`
   - **Mac**: `Cmd + V`
3. SQL kodunun tamamının yapıştırıldığından emin olun
   - Dosyanın başından sonuna kadar tüm kod görünmeli

### 5️⃣ SQL'i Çalıştırma

1. SQL Editor'ün sağ alt köşesindeki **"Run"** butonuna tıklayın
   - Veya klavye kısayolu: `Ctrl + Enter` (Windows) / `Cmd + Enter` (Mac)

2. İşlem başladığında:
   - Sağ altta "Running query..." mesajı görünür
   - İşlem tamamlanana kadar bekleyin (10-30 saniye)

3. Sonuç kontrolü:
   - Başarılı olursa: ✅ "Success" mesajı görünür
   - Hata varsa: ❌ Kırmızı hata mesajı görünür

### 6️⃣ Sonuçları Kontrol Etme

#### Tabloları Kontrol Etme

SQL Editor'de yeni bir sorgu açın ve şunu çalıştırın:

```sql
-- Tüm tabloları listele
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Beklenen tablolar:
- ✅ `materials`
- ✅ `products`
- ✅ `bom`
- ✅ `production_orders`
- ✅ `stock_movements`

#### Verileri Kontrol Etme

```sql
-- Hammaddeleri görüntüle
SELECT * FROM materials;

-- Ürünleri görüntüle
SELECT * FROM active_products;

-- BOM reçetelerini görüntüle
SELECT * FROM bom;
```

## ⚠️ Hata Durumunda

### Hata: "relation already exists"
**Çözüm**: Tablolar zaten var. Önce silin veya `DROP TABLE` kullanın:

```sql
-- DİKKAT: Tüm veriler silinir!
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS bom CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
```

Sonra `QUICK_START.sql` dosyasını tekrar çalıştırın.

### Hata: "permission denied"
**Çözüm**: 
1. Supabase projenizin sahibi olduğunuzdan emin olun
2. Proje ayarlarından yetkilerinizi kontrol edin

### Hata: "extension uuid-ossp does not exist"
**Çözüm**: Bu hata genelde görünmez, ama görürseniz:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

komutunu ayrı çalıştırın.

## ✅ Başarı Kontrol Listesi

Kurulum başarılıysa şunları görebilmelisiniz:

- [ ] 5 tablo oluşturuldu (materials, products, bom, production_orders, stock_movements)
- [ ] 6 hammadde eklendi (Kumaş, Sünger, Ayak türleri)
- [ ] 3 ürün eklendi (Chester, Berjer, Kanepe)
- [ ] 2 BOM reçetesi eklendi
- [ ] Trigger'lar çalışıyor (stok otomatik güncelleniyor)
- [ ] View'lar oluşturuldu (product_bom_view)

## 🎯 Sonraki Adımlar

1. **Environment Variables Ayarlayın**:
   - `.env.local` dosyasına Supabase URL ve Key ekleyin

2. **Test Edin**:
   - `/production/new` sayfasından üretim emri oluşturmayı deneyin
   - Stokların otomatik düştüğünü kontrol edin

3. **Verileri Görüntüleyin**:
   - `/inventory` sayfasında hammaddeleri görün
   - `/products` sayfasında ürünleri görün

## 📞 Yardım

Sorun yaşıyorsanız:
1. SQL Editor'deki hata mesajını kontrol edin
2. Supabase Dashboard'da "Logs" bölümüne bakın
3. Proje ayarlarından database bağlantısını kontrol edin


