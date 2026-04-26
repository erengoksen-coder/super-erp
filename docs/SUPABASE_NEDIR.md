# 🗄️ Supabase Nedir ve Ne İşe Yarar?

## 📋 Supabase Nedir?

Supabase, **açık kaynaklı bir Firebase alternatifi**dir. Size şunları sağlar:
- ✅ PostgreSQL veritabanı (güçlü ve güvenilir)
- ✅ Gerçek zamanlı veri senkronizasyonu
- ✅ Kullanıcı kimlik doğrulama (Auth)
- ✅ Dosya depolama (Storage)
- ✅ Otomatik API oluşturma
- ✅ Ücretsiz başlangıç planı

## 🎯 Bu ERP Projesinde Ne İşe Yarayacak?

### 1. **Veritabanı (Database) - En Önemli Kısım**

Supabase, tüm ERP verilerinizi saklar:

```
┌─────────────────────────────────┐
│     SUPABASE VERİTABANI         │
├─────────────────────────────────┤
│  📦 Products (Ürünler)          │
│  🧵 Materials (Hammaddeler)     │
│  📋 BOM (Reçeteler)             │
│  🏭 Production Orders (Emirler) │
│  📊 Stock Movements (Hareketler)│
│  👥 Accounts (Cari Hesaplar)     │
│  🧾 Invoices (Faturalar)        │
└─────────────────────────────────┘
```

**Örnek:**
- Ürün bilgileri (Chester Koltuk, fiyat, SKU)
- Stok miktarları (100m kumaş, 50 adet ayak)
- Üretim emirleri (10 adet Chester üretildi)
- Tüm işlem geçmişi

### 2. **Otomatik Stok Güncelleme**

Supabase **Trigger** sistemi sayesinde:

```
Üretim Emri Oluşturuldu
    ↓
Stok Hareketi Kaydedildi
    ↓
TRİGGER OTOMATİK ÇALIŞIR
    ↓
Stok Miktarı Güncellenir
    ↓
100m Kumaş → 20m Kumaş (80m düştü)
```

**Manuel işlem yapmanıza gerek yok!** Her üretim emrinde stoklar otomatik düşer.

### 3. **Gerçek Zamanlı Takip**

Birden fazla kullanıcı aynı anda sistemi kullanırsa:
- Biri üretim emri oluşturur
- Diğeri anında stok değişikliğini görür
- Çakışma olmaz, veriler senkronize kalır

### 4. **Güvenlik ve Yetkilendirme**

- Kullanıcı girişi yapabilirsiniz
- Her kullanıcının yetkileri farklı olabilir
- Veriler güvenli şekilde saklanır

### 5. **API Otomatik Oluşturulur**

Supabase, veritabanı tablolarınızdan otomatik API oluşturur:

```
Frontend (Next.js)
    ↓
Supabase API (Otomatik)
    ↓
PostgreSQL Veritabanı
```

**Kod yazmadan** veritabanı işlemleri yapabilirsiniz!

## 💡 Pratik Örnekler

### Örnek 1: Üretim Emri Oluşturma

**Supabase Olmadan:**
```javascript
// Manuel olarak her şeyi yapmanız gerekir
1. Üretim emrini kaydet
2. Her hammadde için stok düşüşü yap
3. Stok kontrolü yap
4. Hata varsa geri al
// Çok karmaşık ve hata yapmaya açık!
```

**Supabase ile:**
```javascript
// Tek satır kod!
await supabase.from('production_orders').insert({...})
// Trigger otomatik stok düşüşü yapar ✅
```

### Örnek 2: Stok Sorgulama

**Supabase Olmadan:**
```javascript
// Dosyadan oku, parse et, filtrele...
// Çok yavaş ve karmaşık
```

**Supabase ile:**
```javascript
// Hızlı ve kolay!
const { data } = await supabase
  .from('materials')
  .select('*')
  .gt('stock_amount', 0)
```

### Örnek 3: BOM (Reçete) Sorgulama

**Supabase Olmadan:**
```javascript
// Ürün ID'si al
// BOM tablosundan ara
// Materials tablosundan stokları al
// Birleştir, hesapla...
// 50+ satır kod!
```

**Supabase ile:**
```javascript
// View kullanarak tek sorgu!
const { data } = await supabase
  .from('product_bom_view')
  .select('*')
  .eq('product_id', productId)
// Tüm bilgiler hazır gelir! ✅
```

## 🆚 Supabase vs Alternatifler

### Supabase vs Excel/Dosya
| Özellik | Excel/Dosya | Supabase |
|---------|-------------|----------|
| Çoklu kullanıcı | ❌ Çakışma olur | ✅ Senkronize |
| Otomatik işlemler | ❌ Manuel | ✅ Trigger'lar |
| Hız | ❌ Yavaş | ✅ Hızlı |
| Güvenlik | ❌ Zayıf | ✅ Güçlü |
| API | ❌ Yok | ✅ Otomatik |

### Supabase vs Kendi Sunucunuz
| Özellik | Kendi Sunucu | Supabase |
|---------|--------------|----------|
| Kurulum | ❌ Zor | ✅ Kolay |
| Bakım | ❌ Sürekli | ✅ Otomatik |
| Ölçeklenebilirlik | ❌ Manuel | ✅ Otomatik |
| Maliyet | ❌ Yüksek | ✅ Düşük |

## 📊 Bu Projede Supabase'in Rolü

```
┌─────────────────────────────────────────┐
│         NEXT.JS (Frontend)              │
│  - Kullanıcı arayüzü                    │
│  - Formlar, listeler                    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│         SUPABASE                        │
│  ├─ API (Otomatik)                      │
│  ├─ Auth (Giriş sistemi)                │
│  └─ Realtime (Canlı güncellemeler)      │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      POSTGRESQL (Veritabanı)           │
│  ├─ Products                            │
│  ├─ Materials                           │
│  ├─ BOM                                 │
│  ├─ Production Orders                   │
│  └─ Stock Movements                     │
└─────────────────────────────────────────┘
```

## 🎯 Özet: Supabase Neden Gerekli?

### ✅ Yapabilecekleriniz:
1. **Veri Saklama**: Tüm ürün, stok, üretim verileri
2. **Otomatik İşlemler**: Trigger'lar ile stok güncelleme
3. **Hızlı Sorgular**: View'lar ile karmaşık sorgular
4. **Güvenlik**: Verileriniz güvende
5. **Ölçeklenebilirlik**: Büyüdükçe otomatik ölçeklenir

### ❌ Supabase Olmadan:
- Verileri nerede saklayacaksınız? (Dosya? Excel?)
- Çoklu kullanıcı nasıl çalışacak?
- Otomatik stok düşüşü nasıl olacak?
- Veriler kaybolursa ne olacak?

## 💰 Maliyet

- **Ücretsiz Plan**: 
  - 500 MB veritabanı
  - 2 GB bant genişliği
  - Sınırsız API isteği
  - Küçük-orta işletmeler için yeterli!

- **Pro Plan**: 
  - 8 GB veritabanı
  - 50 GB bant genişliği
  - $25/ay (büyük işletmeler için)

## 🚀 Sonuç

Supabase, bu ERP sisteminin **beyni**dir:
- Tüm verileri saklar
- Otomatik işlemler yapar
- Güvenli ve hızlıdır
- Ücretsiz başlayabilirsiniz

**Supabase olmadan sistem çalışmaz!** Çünkü:
- Verilerin saklanacağı yer yok
- Otomatik işlemler yapılamaz
- Çoklu kullanıcı desteği yok

## 📝 Örnek Senaryo

**Senaryo:** 10 adet Chester Koltuk üretimi

1. **Kullanıcı**: `/production/new` sayfasından üretim emri oluşturur
2. **Next.js**: Supabase'e istek gönderir
3. **Supabase**: 
   - Üretim emrini kaydeder
   - BOM reçetesini kontrol eder
   - Stok hareketlerini oluşturur
4. **Trigger**: Stokları otomatik düşer
5. **Kullanıcı**: Stokların güncellendiğini görür

**Tüm bu işlemler 1-2 saniyede tamamlanır!** ✅


