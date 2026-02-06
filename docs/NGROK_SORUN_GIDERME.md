# 🔧 Ngrok Sorun Giderme Rehberi

## ❌ ERR_NGROK_3004: Invalid/Incomplete HTTP Response

Bu hata, ngrok tüneli açık olsa bile tarayıcıda "The server returned an invalid or incomplete HTTP response" göründüğünde oluşur.

### Çözüm

1. **Ngrok'u tam upstream URL ile başlatın** (script'ler bunu otomatik yapar):
   ```powershell
   ngrok http http://127.0.0.1:3000
   ```
   Sadece `ngrok http 3000` yerine `http://127.0.0.1:3000` kullanın.

2. **Mevcut ngrok'u kapatıp yeniden başlatın:**
   ```powershell
   npm run fix:ngrok
   ```

3. **Yerel sunucunun düzgün yanıt verdiğini kontrol edin:** Tarayıcıda http://localhost:3000 açılıyorsa sunucu çalışıyordur.

4. **Doğrudan giriş sayfasını deneyin:** Ana adres açılmıyorsa tarayıcıda doğrudan giriş sayfasını açın:
   ```
   https://SIZIN-NGROK-URL/auth/login
   ```

5. **Durum sayfası ile test edin:** Sunucunun yanıt verip vermediğini görmek için:
   ```
   https://SIZIN-NGROK-URL/durum
   ```
   "Sistem çalışıyor" görürseniz tünel ve sunucu çalışıyordur.

6. **Hata devam ederse (önerilen):** Next.js dev modu bazen ngrok ile uyumsuz yanıt verir. **Production modu** ile deneyin:
   ```powershell
   npm run build
   npm run start
   ```
   Başka bir terminalde:
   ```powershell
   ngrok http http://127.0.0.1:3000
   ```
   Veya tek komut: `npm run start:internet:prod`  
   Yeni ngrok URL'ini tarayıcıda açın.

---

## ❌ ERR_NGROK_3200: Endpoint Offline Hatası

Bu hata, ngrok tünelinin çalışmadığı veya sunucunun kapalı olduğu anlamına gelir.

## 🚀 Hızlı Çözüm

```powershell
npm run fix:ngrok
```

Veya:

```powershell
.\scripts\fix-ngrok-error.ps1
```

Bu script otomatik olarak:
1. ✅ Sunucuyu kontrol eder ve başlatır
2. ✅ Eski ngrok process'lerini temizler
3. ✅ Ngrok'u yeniden başlatır
4. ✅ Yeni URL'yi gösterir

## 📋 Adım Adım Çözüm

### 1. Sunucu Kontrolü

```powershell
# Sunucunun çalışıp çalışmadığını kontrol et
Test-NetConnection -ComputerName localhost -Port 3000

# Eğer çalışmıyorsa, başlat
npm run dev
```

### 2. Ngrok Process Temizleme

```powershell
# Tüm ngrok process'lerini durdur
Get-Process -Name "ngrok" | Stop-Process -Force

# 3 saniye bekle
Start-Sleep -Seconds 3
```

### 3. Ngrok'u Yeniden Başlatma

```powershell
# Ngrok'u başlat (tam URL ile - 3004 hatasını önler)
ngrok http http://127.0.0.1:3000
```

### 4. URL Kontrolü

1. http://localhost:4040 adresine gidin
2. "Forwarding" bölümündeki HTTPS URL'yi kopyalayın
3. Bu URL'yi kullanın

## 🔍 Yaygın Sorunlar ve Çözümleri

### Sorun 1: Sunucu Çalışmıyor

**Belirtiler:**
- `ERR_NGROK_3200` hatası
- http://localhost:3000 açılmıyor

**Çözüm:**
```powershell
# Sunucuyu başlat
npm run dev

# Veya
npm run dev:simple
```

### Sorun 2: Ngrok Token Hatası

**Belirtiler:**
- `authtoken` hatası
- Ngrok başlamıyor

**Çözüm:**
```powershell
# Token'ı ayarla
ngrok config add-authtoken YOUR_TOKEN

# Token'ı kontrol et
ngrok config check
```

### Sorun 3: Port Zaten Kullanılıyor

**Belirtiler:**
- `address already in use` hatası
- Port 3000 veya 4040 kullanılıyor

**Çözüm:**
```powershell
# Port'u kullanan process'i bul
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess

# Process'i durdur
Stop-Process -Id [PID_NUMARASI] -Force
```

### Sorun 4: Ngrok Bağlanamıyor

**Belirtiler:**
- Ngrok başlıyor ama URL oluşmuyor
- `ERR_NGROK_3200` hatası devam ediyor

**Çözüm:**
1. İnternet bağlantınızı kontrol edin
2. Firewall ayarlarını kontrol edin:
   ```powershell
   .\scripts\setup-firewall.ps1
   ```
3. Ngrok token'ınızı kontrol edin:
   ```powershell
   ngrok config check
   ```

### Sorun 5: Eski URL Hala Çalışmıyor

**Belirtiler:**
- Eski ngrok URL'i çalışmıyor
- Yeni URL almak istiyorsunuz

**Çözüm:**
```powershell
# Tüm ngrok process'lerini durdur
Get-Process -Name "ngrok" | Stop-Process -Force

# Yeniden başlat
ngrok http http://127.0.0.1:3000

# Yeni URL'yi al
.\scripts\get-ngrok-url.ps1
```

## 🔄 Otomatik Yeniden Başlatma

Eğer sık sık bu hatayı alıyorsanız, otomatik yeniden başlatma scripti kullanın:

```powershell
# Otomatik düzeltme
npm run fix:ngrok
```

## 📊 Durum Kontrolü

### Sunucu Durumu
```powershell
# Sunucu çalışıyor mu?
Test-NetConnection -ComputerName localhost -Port 3000

# Tarayıcıda test
Start-Process "http://localhost:3000"
```

### Ngrok Durumu
```powershell
# Ngrok çalışıyor mu?
Get-Process -Name "ngrok"

# Ngrok URL'ini al
.\scripts\get-ngrok-url.ps1

# Ngrok dashboard
Start-Process "http://localhost:4040"
```

### Port Durumu
```powershell
# Port 3000 kullanılıyor mu?
Get-NetTCPConnection -LocalPort 3000

# Port 4040 kullanılıyor mu?
Get-NetTCPConnection -LocalPort 4040
```

## 🛠️ Manuel Düzeltme Adımları

1. **Sunucuyu Durdur:**
   ```powershell
   Get-Process -Name "node" | Stop-Process -Force
   ```

2. **Ngrok'u Durdur:**
   ```powershell
   Get-Process -Name "ngrok" | Stop-Process -Force
   ```

3. **Sunucuyu Başlat:**
   ```powershell
   npm run dev
   ```

4. **Ngrok'u Başlat:**
   ```powershell
   ngrok http http://127.0.0.1:3000
   ```

5. **URL'yi Al:**
   - http://localhost:4040 adresine gidin
   - HTTPS URL'yi kopyalayın

## ⚠️ Önemli Notlar

- ✅ Her zaman önce sunucuyu başlatın, sonra ngrok'u
- ✅ Ngrok token'ınızın geçerli olduğundan emin olun
- ✅ Ücretsiz ngrok planında URL her başlatmada değişir
- ✅ Sunucu kapandığında ngrok tüneli de kapanır
- ❌ Eski URL'leri kullanmayın (çalışmaz)

## 📞 Daha Fazla Yardım

- **Ngrok Dashboard:** http://localhost:4040
- **Ngrok Dokümantasyon:** https://ngrok.com/docs
- **Proje Dokümantasyonu:** `docs/INTERNET_ERISIM.md`

## 🔐 Güvenlik

- Ngrok URL'lerini paylaşırken dikkatli olun
- Production için sabit domain kullanın (ücretli plan)
- Güçlü şifreler kullanın
- Düzenli olarak token'ı yenileyin
