# 🌐 İnternet Erişimi - Hızlı Başlangıç

Projeyi internetten her yerden erişilebilir hale getirmek için bu rehberi takip edin.

## 🚀 Hızlı Başlatma (Tek Komut)

```powershell
npm run start:internet
```

Veya:

```powershell
.\scripts\start-internet.ps1
```

Bu komut:
1. ✅ Sunucuyu başlatır (port 3000)
2. ✅ Ngrok tünelini oluşturur
3. ✅ Internet URL'ini gösterir
4. ✅ URL'yi panoya kopyalar

## 📋 Adım Adım Kurulum

### 1. Ngrok Kurulumu

#### Yöntem 1: Chocolatey (Önerilen)
```powershell
choco install ngrok
```

#### Yöntem 2: Manuel İndirme
1. https://ngrok.com/download adresine gidin
2. Windows için ZIP indirin
3. ZIP'i açın ve `ngrok.exe`'yi PATH'e ekleyin

### 2. Ngrok Token Ayarlama

1. https://ngrok.com/ adresine gidin ve ücretsiz hesap oluşturun
2. Dashboard'dan "Your Authtoken" alın
3. Token'ı ayarlayın:

```powershell
ngrok config add-authtoken YOUR_TOKEN
```

### 3. Firewall Ayarları (İlk Kez)

PowerShell'i **Yönetici olarak** çalıştırın:

```powershell
.\scripts\setup-firewall.ps1
```

Bu script gerekli port'ları (3000, 3444, 3001, 4040) açar.

### 4. Programı Başlatma

```powershell
npm run start:internet
```

## 🌍 Erişim Yöntemleri

### 1. Yerel Erişim (Aynı Bilgisayar)
```
http://localhost:3000
https://localhost:3444
```

### 2. Yerel Ağ Erişimi (Aynı WiFi)
```
http://192.168.x.x:3000
```
IP adresinizi öğrenmek için:
```powershell
ipconfig
```

### 3. İnternet Erişimi (Ngrok)
Script çalıştıktan sonra gösterilen HTTPS URL'yi kullanın:
```
https://abc123.ngrok.io
```

## 📱 Telefondan Erişim

### Aynı WiFi'de:
1. Bilgisayarınızın yerel IP'sini öğrenin: `ipconfig`
2. Telefonda tarayıcıda açın: `http://192.168.x.x:3000`

### Farklı Ağdan (Mobil Veri):
1. `npm run start:internet` komutunu çalıştırın
2. Gösterilen ngrok URL'ini kopyalayın
3. Telefonda bu URL'yi açın

## 🔧 Yardımcı Komutlar

### Ngrok URL'ini Alma
```powershell
.\scripts\get-ngrok-url.ps1
```

### Firewall Kurulumu
```powershell
# Yönetici olarak çalıştırın
.\scripts\setup-firewall.ps1
```

### Sadece Sunucu (Ngrok Olmadan)
```powershell
npm run dev
```

### Ngrok Olmadan Başlatma
```powershell
.\scripts\start-internet.ps1 -SkipNgrok
```

### Soru Sormadan Başlatma (Otomatik)
Port veya Ngrok zaten kullanımdaysa mevcut sunucu/tünel kullanılır, onay istenmez:
```powershell
.\scripts\start-internet.ps1 -NoPrompt
```

## 📊 Port Bilgileri

| Port | Açıklama |
|------|----------|
| 3000 | HTTP Sunucu (Ana) |
| 3001 | HTTP Sunucu (Yedek) |
| 3444 | HTTPS Sunucu (Kamera için) |
| 4040 | Ngrok Dashboard |

## 🔗 Sayfa Açılmıyorsa (Ngrok ERR_NGROK_3004)

Ana adres açılmıyorsa sırayla deneyin:

1. **Doğrudan giriş sayfası:**  
   `https://SIZIN-NGROK-URL/auth/login`

2. **Durum sayfası (test):**  
   `https://SIZIN-NGROK-URL/durum`  
   "Sistem çalışıyor" görürseniz sunucu ayakta demektir.

3. **Production modu (önerilen):**  
   ```powershell
   npm run start:internet:prod
   ```  
   Build bittikten sonra çıkan yeni Ngrok URL'sini kullanın.

4. **Detaylı sorun giderme:**  
   Bkz. [docs/NGROK_SORUN_GIDERME.md](docs/NGROK_SORUN_GIDERME.md)

## ⚠️ Sorun Giderme

### Port Zaten Kullanılıyor
```powershell
# Port'u kullanan process'i bul
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess

# Process'i durdur
Stop-Process -Id [PID_NUMARASI] -Force
```

### Ngrok Bağlanamıyor
1. Token'ın doğru ayarlandığından emin olun: `ngrok config check`
2. İnternet bağlantınızı kontrol edin
3. Firewall'u kontrol edin: `.\scripts\setup-firewall.ps1`

### Sunucu Başlamıyor
```powershell
# Bağımlılıkları kontrol et
npm install

# Cache temizle
npm run dev:clean
```

### Firewall Sorunu
```powershell
# Yönetici olarak çalıştırın
.\scripts\setup-firewall.ps1
```

## 🔐 Güvenlik Notları

- ✅ Ngrok kullanarak güvenli HTTPS tüneli oluşturun
- ✅ Güçlü şifreler kullanın
- ✅ Production'da JWT_SECRET kullanın
- ❌ Doğrudan port forwarding kullanmayın (güvenlik riski)
- ❌ Güvenlik duvarını tamamen kapatmayın

## 📞 Destek

Sorun yaşarsanız:
1. **Ngrok Dashboard**: http://localhost:4040
2. **Firewall Logları**: Windows Güvenlik > Güvenlik Duvarı
3. **Sunucu Logları**: Terminal çıktısını kontrol edin

## 📚 Detaylı Dokümantasyon

- [Ngrok Sorun Giderme (3004, 3200)](docs/NGROK_SORUN_GIDERME.md)
- [Firewall Ayarları](docs/FIREWALL_SETUP.md)
- [İnternet Erişimi Detayları](docs/INTERNET_ERISIM.md)
- [Environment Variables](docs/ENVIRONMENT_SETUP.md)
