# 🚀 Ngrok Windows Kurulum Rehberi

## 📋 Hızlı Kurulum (Otomatik)

### Yöntem 1: Otomatik Script (Önerilen)

```powershell
npm run install:ngrok
```

Veya doğrudan:

```powershell
.\scripts\install-ngrok-windows.ps1
```

**Yönetici olarak çalıştırmak için:**
1. PowerShell'i **Yönetici olarak** açın
2. Proje dizinine gidin: `cd C:\super-erp`
3. Scripti çalıştırın: `.\scripts\install-ngrok-windows.ps1`

### Yöntem 2: Chocolatey (Eğer Yüklüyse)

```powershell
choco install ngrok -y
```

## 📝 Manuel Kurulum Adımları

### Adım 1: Ngrok Hesabı Oluşturma

1. Tarayıcınızda şu adrese gidin:
   **https://dashboard.ngrok.com/get-started/setup/windows**

2. "Sign up for free" butonuna tıklayın
3. E-posta veya GitHub/Google ile hesap oluşturun
4. Giriş yapın

### Adım 2: Auth Token Alma

1. Dashboard'da **"Your Authtoken"** bölümüne gidin
   - Veya direkt: https://dashboard.ngrok.com/get-started/your-authtoken

2. Token'ı kopyalayın (örnek: `2abc123def456ghi789jkl012mno345pqr678`)

### Adım 3: Ngrok İndirme

#### Seçenek A: Otomatik İndirme (Script ile)
```powershell
.\scripts\install-ngrok-windows.ps1
```

#### Seçenek B: Manuel İndirme
1. https://ngrok.com/download adresine gidin
2. **Windows** için ZIP dosyasını indirin
3. ZIP'i açın
4. `ngrok.exe` dosyasını bir klasöre kopyalayın (örn: `C:\ngrok\`)

### Adım 4: PATH'e Ekleme (Opsiyonel)

#### Yöntem 1: Otomatik (Yönetici Gerekli)
```powershell
# Yönetici olarak PowerShell açın
[Environment]::SetEnvironmentVariable('Path', $env:Path + ';C:\ngrok', [EnvironmentVariableTarget]::Machine)
```

#### Yöntem 2: Manuel
1. Windows Ayarlar > Sistem > Hakkında
2. "Gelişmiş sistem ayarları" tıklayın
3. "Ortam Değişkenleri" tıklayın
4. "Sistem değişkenleri" altında "Path" seçin
5. "Düzenle" tıklayın
6. "Yeni" tıklayın
7. `C:\ngrok` yazın
8. "Tamam" tıklayın

### Adım 5: Token Ayarlama

PowerShell'de (yönetici olmadan da çalışır):

```powershell
ngrok config add-authtoken YOUR_TOKEN
```

**Örnek:**
```powershell
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678
```

### Adım 6: Kurulumu Test Etme

```powershell
# Versiyon kontrolü
ngrok version

# Token kontrolü
ngrok config check
```

## ✅ Kurulum Doğrulama

### Test 1: Ngrok Komutunu Çalıştırma

```powershell
ngrok version
```

Çıktı: `ngrok version 3.x.x` gibi bir versiyon numarası görmelisiniz.

### Test 2: Token Kontrolü

```powershell
ngrok config check
```

Çıktı: Token ayarlı ise hata vermemeli.

### Test 3: Basit Tünel Testi

1. Sunucunuzu başlatın:
   ```powershell
   npm run dev
   ```

2. Yeni bir terminal açın ve ngrok'u başlatın:
   ```powershell
   ngrok http 3000
   ```

3. Ngrok size bir URL verecek (örn: `https://abc123.ngrok.io`)
4. Bu URL'yi tarayıcıda açın, sunucunuza erişebilmelisiniz

## 🚀 Kullanım

### Projeyi İnternetten Erişilebilir Yapma

```powershell
npm run start:internet
```

Bu komut:
1. ✅ Sunucuyu başlatır
2. ✅ Ngrok tünelini açar
3. ✅ İnternet URL'ini gösterir

### Sadece Ngrok Başlatma

```powershell
ngrok http 3000
```

### Ngrok URL'ini Alma

```powershell
.\scripts\get-ngrok-url.ps1
```

Veya manuel:
1. http://localhost:4040 adresine gidin
2. "Forwarding" bölümündeki HTTPS URL'yi kopyalayın

## 🔧 Sorun Giderme

### "ngrok: command not found" Hatası

**Çözüm:**
- PATH'e eklenmemiş olabilir
- Tam yol ile kullanın: `C:\ngrok\ngrok.exe http 3000`
- Veya PATH'e manuel ekleyin (yukarıdaki Adım 4)

### "authtoken" Hatası

**Çözüm:**
```powershell
ngrok config add-authtoken YOUR_TOKEN
```

Token'ı buradan alın: https://dashboard.ngrok.com/get-started/your-authtoken

### "ERR_NGROK_3200: Endpoint offline" Hatası

**Çözüm:**
```powershell
npm run fix:ngrok
```

Bu script otomatik olarak:
- Sunucuyu kontrol eder ve başlatır
- Ngrok'u yeniden başlatır
- Yeni URL'yi gösterir

## 📚 Daha Fazla Bilgi

- **Ngrok Dashboard:** https://dashboard.ngrok.com
- **Ngrok Dokümantasyon:** https://ngrok.com/docs
- **Proje Dokümantasyonu:** `docs/INTERNET_ERISIM.md`
- **Sorun Giderme:** `docs/NGROK_SORUN_GIDERME.md`

## 🎯 Hızlı Başlangıç Özeti

```powershell
# 1. Ngrok'u kur
npm run install:ngrok

# 2. Token ayarla (dashboard'dan al)
ngrok config add-authtoken YOUR_TOKEN

# 3. Projeyi başlat
npm run start:internet

# 4. URL'yi kullan!
```

## ⚠️ Önemli Notlar

- ✅ Ücretsiz ngrok planında URL her başlatmada değişir
- ✅ Ücretli plan ile sabit domain alabilirsiniz
- ✅ Token'ı kimseyle paylaşmayın
- ✅ Sunucu kapandığında ngrok tüneli de kapanır
- ❌ Eski URL'leri kullanmayın (çalışmaz)
