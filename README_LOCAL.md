# 🖥️ Local ERP Sistemi - Supabase Olmadan

## 📋 Nasıl Çalışır?

Bu sistem **Supabase olmadan** bilgisayarınızda çalışır:
- ✅ **SQLite** veritabanı kullanır (hafif, hızlı)
- ✅ Veriler `data/erp.db` dosyasında saklanır
- ✅ Aynı ağdaki diğer cihazlardan erişilebilir
- ✅ İnternet bağlantısı gerekmez

## 🚀 Kurulum

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Development Server'ı Başlatın
```bash
npm run dev
```

### 3. Tarayıcıda Açın
```
http://localhost:3000
```

## 📁 Veritabanı Yapısı

Veriler `data/erp.db` dosyasında saklanır:
- **Materials**: Hammaddeler (Kumaş, Sünger, Ayak)
- **Products**: Ürünler (Chester, Berjer, Kanepe)
- **BOM**: Ürün reçeteleri
- **Production Orders**: Üretim emirleri
- **Stock Movements**: Stok hareketleri

## 🌐 Aynı Ağdan Erişim

### Bilgisayarınızın IP Adresini Öğrenin

**Windows:**
```bash
ipconfig
```
"IPv4 Address" satırındaki IP'yi not edin (örn: 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```
veya
```bash
ip addr
```

### Development Server'ı Ağdan Erişilebilir Yapın

`package.json` dosyasındaki dev script'ini güncelleyin:

```json
"dev": "next dev -H 0.0.0.0"
```

Veya terminalde:
```bash
next dev -H 0.0.0.0
```

### Diğer Cihazlardan Erişin

Aynı ağdaki telefon, tablet veya başka bilgisayardan:
```
http://192.168.1.100:3000
```
(IP adresinizi kullanın)

## 🔧 Özellikler

### ✅ Çalışan Özellikler
- Ürün listesi
- Stok listesi
- Üretim emri oluşturma
- Otomatik stok düşüşü
- BOM (Reçete) sistemi

### 📊 Veritabanı İşlemleri
- Tüm veriler SQLite'da
- Otomatik trigger'lar (stok güncelleme)
- Transaction desteği (güvenli işlemler)

## 💾 Veri Yedekleme

Veritabanı dosyası:
```
data/erp.db
```

**Yedek almak için:**
1. `data/erp.db` dosyasını kopyalayın
2. Güvenli bir yere kaydedin

**Geri yüklemek için:**
1. Yedek dosyayı `data/` klasörüne kopyalayın
2. Server'ı yeniden başlatın

## 🆚 Supabase vs Local SQLite

| Özellik | Supabase | Local SQLite |
|---------|----------|--------------|
| İnternet | ✅ Gerekli | ❌ Gerekmez |
| Kurulum | ⚠️ Karmaşık | ✅ Kolay |
| Hız | ✅ Hızlı | ✅ Çok Hızlı |
| Ücretsiz | ✅ Evet | ✅ Her zaman |
| Çoklu Kullanıcı | ✅ Senkronize | ⚠️ Aynı ağda |
| Yedekleme | ✅ Otomatik | ⚠️ Manuel |

## 🎯 Kullanım Senaryoları

### Senaryo 1: Tek Bilgisayar
- Sadece kendi bilgisayarınızda kullanın
- `http://localhost:3000`

### Senaryo 2: Aynı Ağ
- Fabrika/Ofis içinde birden fazla cihaz
- `http://[BILGISAYAR-IP]:3000`
- Tüm cihazlar aynı veritabanını kullanır

### Senaryo 3: Yedekleme
- `data/erp.db` dosyasını düzenli yedekleyin
- USB veya bulut depolamaya kopyalayın

## ⚠️ Önemli Notlar

1. **Veritabanı Dosyası**: `data/erp.db` dosyasını silmeyin!
2. **Çoklu Kullanıcı**: Aynı anda birden fazla kişi kullanabilir, ama dikkatli olun
3. **Yedekleme**: Düzenli yedek alın
4. **Performans**: Küçük-orta işletmeler için yeterli

## 🔄 Supabase'e Geçiş

İleride Supabase'e geçmek isterseniz:
1. Supabase projesi oluşturun
2. `supabase/QUICK_START.sql` dosyasını çalıştırın
3. Verileri migrate edin
4. `.env.local` dosyasını güncelleyin

## 📞 Sorun Giderme

### Veritabanı Hatası
- `data/` klasörünün yazılabilir olduğundan emin olun
- Server'ı yeniden başlatın

### Ağdan Erişilemiyor
- Firewall ayarlarını kontrol edin
- `-H 0.0.0.0` parametresini kullandığınızdan emin olun

### Veriler Görünmüyor
- `data/erp.db` dosyasının var olduğunu kontrol edin
- Server'ı yeniden başlatın


