# Cloudflare Tunnel (cloudflared) ile İnternet Erişimi

Ngrok’a alternatif: **Ücretsiz**, bant limiti çok yüksek, hesap zorunlu değil (Quick Tunnel).

## 1. cloudflared kurulumu (Windows)

**Yöntem A – winget (önerilen):**
```powershell
winget install Cloudflare.cloudflared
```

**Yöntem B – Manuel:**
1. https://github.com/cloudflare/cloudflared/releases adresinden Windows (amd64) ZIP indirin.
2. ZIP’i açıp `cloudflared.exe` dosyasını bir klasöre koyun (örn. `C:\cloudflared`).
3. Bu klasörü sistem PATH’e ekleyin.

Kontrol:
```powershell
cloudflared --version
```

## 2. Sunucuyu başlatın

Bir terminalde:
```bash
npm run dev
```
“Ready” veya “Local: http://localhost:3000” görünene kadar bekleyin.

## 3. Cloudflare Tunnel’ı başlatın

**İkinci bir terminalde:**
```bash
npm run tunnel:cloudflare
```

Veya doğrudan:
```bash
cloudflared tunnel --url http://localhost:3000
```

Birkaç saniye içinde terminalde şöyle bir adres görünür:
```
https://rastgele-kelime-rastgele.trycloudflare.com
```
Bu adresi tarayıcıda (veya telefonda) açın; uygulama açılır.

## 4. Özet

| Adım | Komut |
|------|--------|
| 1 | `winget install Cloudflare.cloudflared` (bir kez) |
| 2 | Terminal 1: `npm run dev` |
| 3 | Terminal 2: `npm run tunnel:cloudflare` |
| 4 | Terminalde çıkan `https://....trycloudflare.com` adresini kullanın |

## Notlar

- **Hesap gerekmez** – Quick Tunnel için Cloudflare hesabı açmanız gerekmez.
- **Bant limiti** – Ngrok’taki gibi aylık bant limiti (ERR_NGROK_725) yok; günlük kullanım için yeterlidir.
- **URL** – Her `npm run tunnel:cloudflare` çalıştırmasında yeni bir rastgele URL üretilir. Sabit adres isterseniz Cloudflare hesabı ile named tunnel kullanabilirsiniz.
- **İki pencere** – Sunucu (npm run dev) ve tünel (tunnel:cloudflare) ayrı terminallerde açık kalmalı; tünel penceresini kapatırsanız dış erişim kesilir.

## Ngrok ile karşılaştırma

| Özellik | Ngrok | Cloudflare Tunnel |
|---------|--------|-------------------|
| Hesap | Token gerekir (ücretsiz) | Quick Tunnel için gerekmez |
| Bant limiti | Aylık limit (ücretsiz planda) | Pratikte yok |
| URL | Her seferinde değişir | Her seferinde değişir (Quick Tunnel) |
| “Visit Site” sayfası | Var | Yok |

Uygulama hem ngrok hem de `*.trycloudflare.com` adreslerinde aynı şekilde çalışır (giriş, API, cookie davranışı).

---

## Telefonla Cloudflare üzerinden barkod okutma

Uygulamaya Cloudflare Tunnel (veya ngrok) ile **telefondan** girip **kamera ile barkod/QR okutmak** için:

1. **Telefonda tarayıcıyı açın** (Chrome, Safari vb.).
2. **Cloudflare adresini yazın** – Tünel çalışırken terminalde görünen `https://....trycloudflare.com` adresini adres çubuğuna girin.
3. **Giriş yapın** – Kullanıcı adı ve şifrenizle ERP’ye girin.
4. **Barkod okuma sayfasına gidin:**
   - Ana sayfada **“Barkod Okut”** benzeri bir buton varsa ona tıklayın, **veya**
   - Sol menüden **Stok → Barkod Yönetimi** açıp **“Barkod Okut” / “Tarama”** linkine tıklayın, **veya**
   - Doğrudan adrese ekleyin: `https://SIZIN-TUNNEL-ADRESINIZ.trycloudflare.com/barcodes/scan`
5. **Kamera iznini verin** – Tarayıcı “Kameraya erişim” isterse **İzin Ver** / **Allow** deyin. (Cloudflare HTTPS sağladığı için kamera çalışır.)
6. **Barkodu okutun** – Telefonu barkod/QR’a tutun; kare içine alındığında otomatik okunur.

**Notlar:**

- **HTTPS gerekir** – Kamera API’si sadece güvenli bağlantıda (HTTPS) veya localhost’ta çalışır. Cloudflare Tunnel adresi zaten HTTPS olduğu için telefonda da çalışır.
- **İlk açılışta izin** – Bazı tarayıcılar kamera iznini sadece bir kez sorar; reddettiyseniz tarayıcı ayarlarından site için kamera iznini açmanız gerekebilir.
- **USB okuyucu** – Bilgisayarda USB barkod okuyucu kullanıyorsanız aynı sayfada “USB Barkod Okuyucu” modu da vardır; telefonda ise kamera ile okutma kullanılır.

---

## Sabit adres (Named Tunnel) – Her seferinde aynı URL

Quick Tunnel’da adres her açılışta değişir. **Sabit adres** için Cloudflare hesabı ve **named tunnel** kurmanız gerekir.

### Gereksinimler

1. **Ücretsiz Cloudflare hesabı** – https://dash.cloudflare.com/sign-up  
2. **Bir domain Cloudflare’da** – Kendi domain’iniz (örn. `sirketim.com`) Cloudflare’a eklenmeli ve nameserver’lar Cloudflare’a yönlendirilmiş olmalı.  
   - Domain yoksa: Cloudflare’da ücretsiz “Add a site” ile domain ekleyip nameserver’ları değiştirirsiniz; ardından DNS’te bir CNAME kaydı oluşturacağız.

### Adımlar (tek seferlik kurulum)

#### 1. cloudflared ile Cloudflare’a giriş

```powershell
cloudflared tunnel login
```

- Tarayıcı açılır; Cloudflare hesabıyla giriş yapın.
- Açılır pencerede **domain’inizi seçin** (tüneli bu domain’e bağlayacaksınız).
- Giriş sonrası `cert.pem` dosyası `%USERPROFILE%\.cloudflared\` içine yazılır.

#### 2. Tünel oluştur

```powershell
cloudflared tunnel create super-erp
```

- `super-erp` istediğiniz isim olabilir.
- Çıktıda **Tunnel UUID** ve **credentials dosya yolu** görünür (örn. `C:\Users\Kullanici\.cloudflared\<uuid>.json`). Bu yolu not alın.

#### 3. Config dosyası oluştur

`%USERPROFILE%\.cloudflared\config.yml` dosyasını oluşturun (yoksa):

**Windows (PowerShell ile klasör):** `notepad $env:USERPROFILE\.cloudflared\config.yml`

İçeriği (port ve dosya yollarını kendinize göre düzenleyin):

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: C:\Users\KULLANICI\.cloudflared\<TUNNEL-UUID>.json

ingress:
  - hostname: erp.sirketim.com
    service: http://localhost:3000
  - service: http_status:404
```

- `<TUNNEL-UUID>` → `cloudflared tunnel create` çıktısındaki UUID.
- `credentials-file` → Aynı çıktıdaki `.json` dosyasının tam yolu.
- `hostname: erp.sirketim.com` → Sabit adres olarak kullanmak istediğiniz adres (kendi domain’inizden bir alt alan adı).

#### 4. DNS kaydı (sabit adresin çalışması için)

Domain’iniz Cloudflare’da olduğu için DNS’i Cloudflare Dashboard’dan veya CLI’dan ekleyebilirsiniz:

```powershell
cloudflared tunnel route dns super-erp erp.sirketim.com
```

- `super-erp` → Tünel adı (veya UUID).
- `erp.sirketim.com` → config’te yazdığınız `hostname` ile aynı olmalı.

Bu komut Cloudflare DNS’te gerekli CNAME kaydını oluşturur. Artık **sabit adres** `https://erp.sirketim.com` olur.

#### 5. Tüneli çalıştırma

Sunucu çalışırken (örn. `npm run dev`):

```powershell
cloudflared tunnel run super-erp
```

Veya config dosyası farklı bir yerdeyse:

```powershell
cloudflared tunnel --config %USERPROFILE%\.cloudflared\config.yml run super-erp
```

- Tünel açık kaldığı sürece **https://erp.sirketim.com** her zaman aynı adres olur; tekrar başlatsanız da değişmez.

### Özet (sabit adres)

| Adım | Ne yapılır |
|------|------------|
| 1 | Cloudflare hesabı + domain Cloudflare’da |
| 2 | `cloudflared tunnel login` → tarayıcıda domain seç |
| 3 | `cloudflared tunnel create super-erp` → UUID ve credentials yolunu not al |
| 4 | `%USERPROFILE%\.cloudflared\config.yml` oluştur (tunnel, credentials-file, hostname, service: localhost:3000) |
| 5 | `cloudflared tunnel route dns super-erp erp.sirketim.com` → sabit hostname |
| 6 | `npm run dev` + `cloudflared tunnel run super-erp` → sabit URL hep aynı kalır |

Domain’iniz yoksa önce Cloudflare’da “Add a site” ile bir domain ekleyip nameserver’ları güncellemeniz gerekir; ardından yukarıdaki adımlar aynen uygulanır.

**Bat dosyasında sabit tünel:** `baslat-dev-ve-cloudflare.bat` içinde şu an `npm run tunnel:cloudflare` (Quick Tunnel) çağrılıyor. Sabit adres kullanacaksanız named tunnel kurulumunu yaptıktan sonra, Cloudflare penceresini açan satırı şu komutla değiştirebilirsiniz:  
`cloudflared tunnel run super-erp`  
(bat’ta `start "Cloudflare Tunnel" cmd /k "cd /d ""%~dp0."" && cloudflared tunnel run super-erp || pause"`).  
Böylece tek tıkla dev + sabit URL’li tünel birlikte açılır.
