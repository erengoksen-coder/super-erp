# 🔥 Firewall Ayarları Rehberi

Projeyi internetten erişilebilir hale getirmek için Windows Firewall ayarlarını yapılandırmanız gerekebilir.

## 🚀 Hızlı Kurulum (Otomatik)

PowerShell'i **Yönetici olarak** çalıştırın ve şu komutu çalıştırın:

```powershell
cd C:\super-erp
.\scripts\setup-firewall.ps1
```

## 📝 Manuel Kurulum

### 1. Windows Defender Firewall Kuralları

#### Gelen Bağlantılar İçin:

**PowerShell (Yönetici):**
```powershell
# Port 3000 (HTTP)
New-NetFirewallRule -DisplayName "Super ERP HTTP" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Port 3444 (HTTPS)
New-NetFirewallRule -DisplayName "Super ERP HTTPS" -Direction Inbound -LocalPort 3444 -Protocol TCP -Action Allow

# Port 3001 (HTTP Yedek)
New-NetFirewallRule -DisplayName "Super ERP HTTP Backup" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Port 4040 (Ngrok Dashboard)
New-NetFirewallRule -DisplayName "Ngrok Dashboard" -Direction Inbound -LocalPort 4040 -Protocol TCP -Action Allow
```

#### Giden Bağlantılar İçin:

Ngrok için giden bağlantılar genelde otomatik açıktır, ama emin olmak için:

```powershell
# Ngrok için giden bağlantı
New-NetFirewallRule -DisplayName "Ngrok Outbound" -Direction Outbound -Protocol TCP -Action Allow
```

### 2. Windows Defender Firewall GUI ile

1. **Windows Güvenlik** > **Güvenlik Duvarı ve Ağ Koruması** açın
2. **Gelişmiş ayarlar** tıklayın
3. **Gelen Kurallar** > **Yeni Kural** tıklayın
4. **Bağlantı noktası** seçin > **İleri**
5. **TCP** seçin, **Belirli yerel bağlantı noktaları**: `3000, 3444, 3001, 4040` > **İleri**
6. **Bağlantıya izin ver** > **İleri**
7. Tüm profilleri seçin > **İleri**
8. Ad: `Super ERP` > **Son**

### 3. Router Ayarları (Opsiyonel - Dış Erişim İçin)

Eğer ngrok kullanmıyorsanız ve doğrudan internetten erişmek istiyorsanız:

1. Router yönetim paneline giriş yapın (genelde `192.168.1.1` veya `192.168.0.1`)
2. **Port Forwarding** veya **Virtual Server** bölümüne gidin
3. Şu kuralları ekleyin:
   - **Port 3000** → Bilgisayarınızın yerel IP'si
   - **Port 3444** → Bilgisayarınızın yerel IP'si

⚠️ **UYARI:** Doğrudan port forwarding güvenlik riski oluşturabilir. Ngrok kullanmanız önerilir.

## 🔍 Firewall Kurallarını Kontrol Etme

```powershell
# Tüm Super ERP kurallarını listele
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Super ERP*" -or $_.DisplayName -like "*Ngrok*" } | Format-Table DisplayName, Enabled, Direction, Action

# Belirli port'u kontrol et
Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq 3000 } | Get-NetFirewallRule | Format-Table DisplayName, Enabled
```

## 🗑️ Firewall Kurallarını Kaldırma

```powershell
# Super ERP kurallarını kaldır
Remove-NetFirewallRule -DisplayName "Super ERP HTTP"
Remove-NetFirewallRule -DisplayName "Super ERP HTTPS"
Remove-NetFirewallRule -DisplayName "Super ERP HTTP Backup"
Remove-NetFirewallRule -DisplayName "Ngrok Dashboard"
```

## ⚠️ Sorun Giderme

### Port Zaten Kullanılıyor

```powershell
# Port'u kullanan process'i bul
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess | ForEach-Object { Get-Process -Id $_.OwningProcess }
```

### Firewall Kuralı Çalışmıyor

1. Windows Güvenlik > Güvenlik Duvarı ve Ağ Koruması
2. **Özel ağ** ve **Genel ağ** için güvenlik duvarını açık olduğundan emin olun
3. Kuralın **Etkin** olduğunu kontrol edin

### Ngrok Bağlanamıyor

1. Ngrok'un giden bağlantı yapabildiğinden emin olun
2. Antivirus yazılımınızın ngrok'u engellemediğini kontrol edin
3. Kurumsal ağdaysanız, ağ yöneticinize danışın

## 🔐 Güvenlik Notları

- ✅ Sadece gerekli port'ları açın
- ✅ Ngrok kullanarak güvenli tünel oluşturun
- ✅ Güçlü şifreler kullanın
- ✅ Düzenli güncellemeler yapın
- ❌ Production'da doğrudan port forwarding kullanmayın
- ❌ Güvenlik duvarını tamamen kapatmayın

## 📞 Destek

Sorun yaşarsanız:
1. Firewall loglarını kontrol edin
2. Windows Event Viewer'da hataları kontrol edin
3. Ngrok dashboard'u kontrol edin: `http://localhost:4040`
