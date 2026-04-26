# 🚀 LIVASOFA ERP - Giriş Komutları

## 📋 İlk Kurulum (Sadece İlk Kez)

### 1. Bağımlılıkları Yükle
```powershell
npm install
```

## 🏃 Uygulamayı Başlatma

### Geliştirme Modu (Önerilen)
```powershell
npm run dev
```
- **URL:** https://localhost:3000
- **Not:** HTTPS ile çalışır, tarayıcıda güvenlik uyarısı çıkabilir (Normal)

### Alternatif Başlatma Yöntemleri

#### Basit HTTP (HTTPS olmadan)
```powershell
npm run dev:simple
```
- **URL:** http://localhost:3000

#### Temiz Başlatma (Cache temizleyerek)
```powershell
npm run dev:clean
```
- **URL:** http://localhost:3000
- **Not:** `.next` ve `.turbo` klasörlerini temizler

#### Yerel Başlatma
```powershell
npm run dev:local
```
- **URL:** http://localhost:3000

## 🔐 Giriş Bilgileri

### Varsayılan Admin Kullanıcısı
- **Kullanıcı Adı:** `admin`
- **Şifre:** `admin123`

### Giriş Sayfası
- **URL:** https://localhost:3000/auth/login
- Veya uygulama açıldığında otomatik yönlendirme

## 📦 Production Build

### Build Oluştur
```powershell
npm run build
```

### Production Modunda Çalıştır
```powershell
npm run build
npm start
```
- **URL:** http://localhost:3000

## 🛠️ Yardımcı Komutlar

### Lint Kontrolü
```powershell
npm run lint
```

## ⚠️ Sorun Giderme

### Port Zaten Kullanılıyorsa
```powershell
# Node.js process'lerini durdur
Get-Process node | Stop-Process -Force
```

### Cache Temizleme
```powershell
# .next klasörünü sil
Remove-Item -Recurse -Force .next

# .turbo klasörünü sil
Remove-Item -Recurse -Force .turbo

# Tekrar başlat
npm run dev
```

### Veritabanı Sıfırlama
```powershell
# Veritabanı dosyasını sil (DİKKAT: Tüm veriler silinir!)
Remove-Item -Force data\erp.db

# Uygulamayı yeniden başlat (yeni veritabanı otomatik oluşur)
npm run dev
```

## 📝 Notlar

1. **İlk Çalıştırmada:** Veritabanı otomatik oluşturulur (`data/erp.db`)
2. **HTTPS Uyarısı:** `npm run dev` kullanıldığında tarayıcıda güvenlik uyarısı çıkabilir, "Gelişmiş" > "Devam Et" seçeneğini kullanın
3. **Admin Kullanıcısı:** İlk kurulumda otomatik oluşturulur
4. **Port:** Varsayılan port 3000, değiştirmek için `next.config.ts` dosyasını düzenleyin

## 🔗 Hızlı Başlangıç

```powershell
# 1. Proje klasörüne git
cd C:\Users\furka\super-erp

# 2. Bağımlılıkları yükle (sadece ilk kez)
npm install

# 3. Uygulamayı başlat
npm run dev

# 4. Tarayıcıda aç
# https://localhost:3000/auth/login
# Kullanıcı: admin
# Şifre: admin123
```




