# 📁 Proje Taşındı

## Yeni Konum
```
C:\super-erp
```

## Eski Konum
```
D:\super-erp
```

## ⚠️ Önemli Notlar

1. **Yeni dizine geçin:**
   ```powershell
   cd C:\super-erp
   ```

2. **Bağımlılıkları yeniden yükleyin:**
   ```powershell
   npm install
   ```

3. **Sunucuyu başlatın:**
   ```powershell
   npm run dev:simple
   ```

4. **Eski klasörü silmek için:**
   ```powershell
   # Önce tüm process'leri durdurun
   Get-Process node | Stop-Process -Force
   
   # Sonra eski klasörü silin
   Remove-Item "D:\super-erp" -Recurse -Force
   ```

## 📝 Güncellenmesi Gereken Yerler

- Script'lerdeki dizin yolları
- Kısayollar
- IDE ayarları

## ✅ Taşınan Dosyalar

- ✅ Tüm kaynak kodlar
- ✅ Veritabanı (data klasörü)
- ✅ Konfigürasyon dosyaları
- ✅ Script'ler

## ❌ Taşınmayan Dosyalar (Bilerek)

- node_modules (yeniden yüklenecek)
- .next (yeniden oluşturulacak)
- .git (varsa)
- logs (yeniden oluşturulacak)

