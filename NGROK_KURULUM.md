# ngrok Kurulumu ve Kullanımı

## Adım 1: ngrok İndirme

### Yöntem 1: Manuel İndirme (Önerilen)
1. https://ngrok.com/download adresine gidin
2. Windows için ZIP dosyasını indirin
3. ZIP'i açın ve `ngrok.exe` dosyasını bir klasöre kopyalayın (örn: `C:\ngrok\`)
4. Bu klasörü PATH'e ekleyin veya tam yol ile kullanın

### Yöntem 2: Chocolatey ile (Eğer yüklüyse)
```powershell
choco install ngrok
```

## Adım 2: ngrok Hesabı Oluşturma (Ücretsiz)

1. https://ngrok.com/ adresine gidin
2. Ücretsiz hesap oluşturun
3. Dashboard'dan "Your Authtoken" alın
4. Terminal'de şu komutu çalıştırın:
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Adım 3: Kullanım

### Terminal 1: Next.js Sunucusu
```powershell
cd C:\Users\furka\super-erp
npm run dev
```
Sunucu `http://localhost:3000` adresinde çalışacak.

### Terminal 2: ngrok Tüneli
**YENİ BİR TERMİNAL/POWERSHELL PENCERESİ AÇIN** ve:
```powershell
ngrok http 3000
```

ngrok size şöyle bir çıktı verecek:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

### Adım 4: Telefonda Kullanım

1. Bilgisayardaki `/mobile/phone-camera` sayfasından QR kodu okuyun
2. QR kod içindeki URL'yi **ngrok'un verdiği HTTPS URL ile değiştirin**
   - Örnek: `http://192.168.0.5:3000/mobile/phone-scanner?code=ABC123`
   - Yeni: `https://abc123.ngrok.io/mobile/phone-scanner?code=ABC123`
3. Bu HTTPS URL'yi telefonunuzda açın
4. Artık kamera çalışacak!

## Alternatif: Otomatik URL Değiştirme

Telefon kamerası sayfasını ngrok URL'sini otomatik algılayacak şekilde güncelleyebiliriz.


