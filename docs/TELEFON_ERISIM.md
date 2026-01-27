# 📱 Telefondan Erişim Rehberi

## ⚠️ ÖNEMLİ: `localhost` Telefondan Çalışmaz!

`localhost` sadece **aynı cihazdan** erişilebilir. Telefondan erişmek için **bilgisayarın IP adresini** kullanmalısınız.

## 🔍 Bilgisayarın IP Adresini Bulma

### Windows PowerShell:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" } | Select-Object IPAddress
```

### Veya:
```powershell
ipconfig | findstr IPv4
```

**Örnek IP:** `192.168.1.155`

## 📱 Telefondan Erişim

### 1. Aynı WiFi Ağında Olduğunuzdan Emin Olun
- Telefon ve bilgisayar **aynı WiFi ağına** bağlı olmalı
- Farklı ağlardaysa erişemezsiniz

### 2. Doğru Adresi Kullanın

**❌ YANLIŞ:**
```
http://localhost:3000
```

**✅ DOĞRU:**
```
http://192.168.1.155:3000
```
*(IP adresini kendi IP'nizle değiştirin)*

### 3. Sunucunun Çalıştığından Emin Olun

Bilgisayarda şu komutu çalıştırın:
```powershell
cd D:\super-erp
npm run dev:simple
```

Şu mesajı görmelisiniz:
```
✓ Ready in X seconds
- Local:    http://localhost:3000
- Network:  http://192.168.1.155:3000
```

## 🔥 Firewall Kontrolü

Windows Firewall port 3000'i engelliyor olabilir:

### Firewall Kuralı Ekleme:
1. Windows Ayarlar > Güvenlik duvarı
2. "Gelişmiş ayarlar"
3. "Gelen kuralları" > "Yeni kural"
4. "Bağlantı noktası" seçin
5. TCP, Port: 3000
6. "Bağlantıya izin ver"
7. Tüm profilleri seçin
8. İsim: "Next.js Dev Server"

### Veya PowerShell ile:
```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## 🌐 İnternetten Erişim (Ngrok)

Telefon farklı bir ağdaysa (örneğin mobil veri), ngrok kullanın:

1. **Ngrok'u başlatın:**
```powershell
ngrok http 3000
```

2. **Ngrok URL'ini alın:**
   - `http://localhost:4040` adresine gidin
   - "Forwarding" bölümündeki HTTPS URL'yi kopyalayın
   - Örnek: `https://abc123.ngrok.io`

3. **Telefonda bu URL'yi kullanın**

## ✅ Hızlı Test

1. Bilgisayarda sunucuyu başlatın
2. Telefonda tarayıcıyı açın
3. Şu adresi girin: `http://[BILGISAYAR_IP]:3000`
   - Örnek: `http://192.168.1.155:3000`
4. Çalışmalı!

## 🐛 Sorun Giderme

### "Sunucuya bağlanamadı" Hatası

**Kontrol Listesi:**
- ✅ Sunucu çalışıyor mu? (`npm run dev:simple`)
- ✅ Telefon ve bilgisayar aynı WiFi'de mi?
- ✅ Doğru IP adresini kullanıyor musunuz? (`localhost` değil!)
- ✅ Firewall port 3000'e izin veriyor mu?
- ✅ Port 3000 başka bir uygulama tarafından kullanılıyor mu?

### Port Kontrolü:
```powershell
netstat -ano | findstr :3000
```

### IP Adresini Tekrar Bulma:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object IPAddress, InterfaceAlias
```

## 📝 Özet

- **Bilgisayardan:** `http://localhost:3000`
- **Telefondan (aynı ağ):** `http://192.168.1.155:3000`
- **Telefondan (farklı ağ):** `https://abc123.ngrok.io` (ngrok URL'i)

