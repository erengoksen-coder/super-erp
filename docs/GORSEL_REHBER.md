# 📸 Supabase SQL Kurulum - Görsel Rehber

## 🎯 Hızlı Başlangıç (3 Adım)

### 1️⃣ Supabase'e Giriş

```
1. https://app.supabase.com adresine git
2. "Sign In" butonuna tıkla
3. Google/GitHub ile giriş yap veya email kullan
```

### 2️⃣ SQL Editor Bulma

**Sol Menü Yapısı:**
```
📊 Dashboard
📋 Table Editor
📝 SQL Editor  ← BURAYA TIKLA
🔧 Database
⚙️ Settings
```

**Alternatif Yol:**
- Sol menüde "SQL Editor" yazısını ara
- İkon: Mavi kalem veya SQL sembolü

### 3️⃣ SQL Çalıştırma

**SQL Editor Ekranı:**
```
┌─────────────────────────────────────────┐
│  SQL Editor                    [×]      │
├─────────────────────────────────────────┤
│                                         │
│  [Boş sorgu alanı]                     │
│                                         │
│  -- Buraya QUICK_START.sql içeriğini   │
│  -- yapıştır                            │
│                                         │
├─────────────────────────────────────────┤
│  [Run]  [Save]  [Format]               │
└─────────────────────────────────────────┘
```

**Adımlar:**
1. Boş alana tıkla
2. `Ctrl + V` ile yapıştır (Windows) veya `Cmd + V` (Mac)
3. Sağ alttaki **"Run"** butonuna tıkla
4. ✅ "Success" mesajını bekle

## 📋 Detaylı Adımlar

### Adım 1: Dosyayı Bul

**Windows:**
```
1. Dosya Gezgini'ni aç (Windows + E)
2. Proje klasörüne git: C:\Users\furka\super-erp
3. supabase klasörüne git
4. QUICK_START.sql dosyasını bul
5. Sağ tık → "Birlikte Aç" → "Notepad" veya "VS Code"
```

**Mac:**
```
1. Finder'ı aç
2. Proje klasörüne git
3. supabase/QUICK_START.sql dosyasını bul
4. Çift tıkla (TextEdit veya VS Code'da açılır)
```

### Adım 2: Kopyala

**Tüm İçeriği Seç:**
- Windows: `Ctrl + A`
- Mac: `Cmd + A`

**Kopyala:**
- Windows: `Ctrl + C`
- Mac: `Cmd + C`

**Kontrol:**
- Kopyalama başarılı oldu mu? → `Ctrl + V` ile test et

### Adım 3: Supabase'e Yapıştır

**SQL Editor'de:**
1. Boş sorgu alanına tıkla
2. `Ctrl + V` (Windows) veya `Cmd + V` (Mac)
3. Tüm kodun göründüğünden emin ol

**Kod Başlangıcı:**
```sql
-- ============================================
-- HIZLI BAŞLANGIÇ - Supabase SQL Editor'e Yapıştır
-- ============================================
```

**Kod Sonu:**
```sql
-- ============================================
-- TAMAMLANDI! ✅
-- ============================================
```

### Adım 4: Çalıştır

**Buton Konumu:**
```
SQL Editor penceresinin sağ alt köşesi:
[Save] [Format] [Run] ← BURAYA TIKLA
```

**Klavye Kısayolu:**
- Windows: `Ctrl + Enter`
- Mac: `Cmd + Enter`

**İşlem Sırasında:**
```
┌─────────────────────────────────┐
│  Running query...               │
│  ⏳ Lütfen bekleyin...         │
└─────────────────────────────────┘
```

**Başarılı:**
```
┌─────────────────────────────────┐
│  ✅ Success                     │
│  Query executed successfully    │
└─────────────────────────────────┘
```

## 🔍 Kontrol Sorguları

### Tabloları Listele

SQL Editor'de yeni sorgu aç ve çalıştır:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Beklenen Sonuç:**
```
table_name
----------
bom
materials
production_orders
products
stock_movements
```

### Verileri Kontrol Et

```sql
-- Hammaddeler
SELECT name, unit, stock_amount FROM materials;

-- Ürünler
SELECT name, sku, price FROM active_products;

-- BOM Reçeteleri
SELECT 
    p.name as product_name,
    m.name as material_name,
    b.quantity_required
FROM bom b
JOIN active_products p ON b.product_id = p.id
JOIN materials m ON b.material_id = m.id;
```

## ⚠️ Yaygın Hatalar ve Çözümleri

### Hata 1: "relation already exists"

**Görünen Hata:**
```
ERROR: relation "materials" already exists
```

**Çözüm:**
```sql
-- Önce mevcut tabloları sil
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS production_orders CASCADE;
DROP TABLE IF EXISTS bom CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS materials CASCADE;

-- Sonra QUICK_START.sql'i tekrar çalıştır
```

### Hata 2: "syntax error"

**Görünen Hata:**
```
ERROR: syntax error at or near "..."
```

**Çözüm:**
1. SQL kodunun tamamının kopyalandığından emin ol
2. Özel karakterlerin bozulmadığını kontrol et
3. Tekrar kopyala-yapıştır yap

### Hata 3: "permission denied"

**Görünen Hata:**
```
ERROR: permission denied for schema public
```

**Çözüm:**
1. Proje sahibi olduğunuzdan emin olun
2. Supabase Dashboard → Settings → Database → Reset database password (gerekirse)

## ✅ Başarı Kontrolü

Kurulum başarılıysa:

1. **Table Editor'da Tablolar Görünmeli:**
   - Sol menü → "Table Editor"
   - 5 tablo görünmeli: materials, products, bom, production_orders, stock_movements

2. **Veriler Görünmeli:**
   - `materials` tablosunda 6 kayıt
   - `products` tablosunda 3 kayıt
   - `bom` tablosunda 6 kayıt (2 ürün × 3 hammadde)

3. **Trigger'lar Çalışmalı:**
   - Stok hareketi yapıldığında stok otomatik güncellenmeli

## 🎓 İpuçları

1. **Yedek Alın**: Önemli veriler varsa önce yedek alın
2. **Test Edin**: Küçük bir test sorgusu çalıştırın
3. **Logları Kontrol Edin**: Hata varsa "Logs" bölümüne bakın
4. **Yardım Alın**: Supabase Discord veya Forum'dan yardım alın

## 📞 Sonraki Adımlar

1. ✅ SQL başarıyla çalıştırıldı
2. ⏭️ `.env.local` dosyasını ayarla
3. ⏭️ Projeyi test et
4. ⏭️ Üretim emri oluşturmayı dene


