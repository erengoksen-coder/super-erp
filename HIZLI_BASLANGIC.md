# 🚀 Hızlı Başlangıç Rehberi

## 📍 Proje Dizini

```
D:\super-erp
```

## 🏃 Sunucuyu Başlatma

### Terminal 1 - Next.js Sunucusu:
```powershell
cd D:\super-erp
npm run dev:simple
```

### Terminal 2 - Ngrok (İnternetten Erişim İçin):
```powershell
cd D:\super-erp
ngrok http 3000
```

## 🌐 Erişim Adresleri

### Yerel Erişim (Aynı Bilgisayar):
```
http://localhost:3000
```

### Ağ Erişimi (Aynı WiFi):
```
http://192.168.1.155:3000
```

### İnternet Erişimi (Ngrok):
1. Ngrok'u başlatın: `ngrok http 3000`
2. `http://localhost:4040` adresine gidin
3. "Forwarding" bölümündeki HTTPS URL'yi kopyalayın
4. Bu URL'yi kullanın (örnek: `https://abc123.ngrok.io`)

## 📱 Telefondan Erişim

### Aynı WiFi'de:
```
http://192.168.1.155:3000
```

### Farklı Ağdan (Mobil Veri):
Ngrok URL'ini kullanın (yukarıdaki adımları takip edin)

## 🛠️ Yardımcı Scriptler

### Sunucuyu Temizleyip Başlat:
```powershell
cd D:\super-erp
.\scripts\start-server.ps1
```

### Ngrok'u Başlat:
```powershell
cd D:\super-erp
.\scripts\start-ngrok-now.ps1
```

### Her İkisini Birlikte Başlat:
```powershell
cd D:\super-erp
.\scripts\start-with-ngrok-final.ps1
```

## ⚠️ Önemli Notlar

- Proje dizini: `D:\super-erp` (C:\Users\furka\super-erp değil!)
- Sunucu portu: `3000`
- Ngrok web arayüzü: `http://localhost:4040`
- Her iki terminal de açık kalmalı (sunucu + ngrok)

## 🐛 Sorun Giderme

### Port Zaten Kullanılıyor:
```powershell
Get-Process node | Stop-Process -Force
```

### Lock Dosyası Hatası:
```powershell
cd D:\super-erp
Remove-Item -Recurse -Force .next
```

### Ngrok Token Hatası:
```powershell
ngrok config add-authtoken YOUR_TOKEN
```

