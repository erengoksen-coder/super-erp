# HTTPS Kurulumu - iOS/Android Kamera Erişimi İçin

## Sorun
iOS ve Android mobil tarayıcılar, güvenlik nedeniyle **HTTP üzerinde kamera erişimine izin vermez**. Bu yüzden kamera çalışmıyor.

## Çözüm 1: mkcert ile Yerel HTTPS (Önerilen)

### Adım 1: mkcert Kurulumu
```powershell
# Chocolatey ile (eğer yüklüyse)
choco install mkcert

# Veya manuel olarak:
# https://github.com/FiloSottile/mkcert/releases adresinden indirin
```

### Adım 2: Sertifika Oluşturma
```powershell
cd C:\Users\furka\super-erp

# mkcert'i yükle
mkcert -install

# Yerel sertifika oluştur
mkcert localhost 127.0.0.1 192.168.0.5
```

Bu komut `localhost+2.pem` ve `localhost+2-key.pem` dosyalarını oluşturur.

### Adım 3: Next.js'i HTTPS ile Çalıştırma

`package.json`'a ekleyin:
```json
"scripts": {
  "dev:https": "next dev -H 0.0.0.0 --experimental-https --experimental-https-key ./localhost+2-key.pem --experimental-https-cert ./localhost+2.pem"
}
```

## Çözüm 2: ngrok ile HTTPS Tüneli

### Adım 1: ngrok Kurulumu
```powershell
# Chocolatey ile
choco install ngrok

# Veya https://ngrok.com/download adresinden indirin
```

### Adım 2: ngrok Başlatma
```powershell
# Terminal 1: Next.js sunucusu
cd C:\Users\furka\super-erp
npm run dev

# Terminal 2: ngrok tüneli
ngrok http 3000
```

ngrok size bir HTTPS URL verecek (örn: `https://abc123.ngrok.io`). Bu URL'yi telefonunuzda kullanın.

## Çözüm 3: Chrome Flags (Sadece Test İçin)

**Sadece Chrome'da çalışır, Safari'de çalışmaz!**

1. Chrome'da `chrome://flags` adresine gidin
2. `#unsafely-treat-insecure-origin-as-secure` flag'ini bulun
3. IP adresinizi ekleyin: `http://192.168.0.5:3000`
4. Chrome'u yeniden başlatın

## Çözüm 4: Yerel Ağda localhost Kullanma

Telefonunuzda bilgisayarınızın IP adresi yerine `localhost` kullanın (sadece aynı cihazda çalışır).

## Önerilen Çözüm

**Geliştirme için**: ngrok kullanın (en kolay)
**Production için**: Gerçek HTTPS sertifikası kullanın


