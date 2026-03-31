# 🌐 İnternetten Erişim Rehberi

Projeyi internetten her yerden erişilebilir hale getirmek için birkaç yöntem var.

## 🚀 Yöntem 1: Ngrok (En Kolay - Önerilen)

### Avantajlar:
- ✅ Hızlı kurulum (5 dakika)
- ✅ Ücretsiz
- ✅ HTTPS desteği
- ✅ Anında çalışır

### Kurulum:

#### 1. Ngrok İndirme
```powershell
# Yöntem 1: Manuel indirme
# https://ngrok.com/download adresinden Windows için ZIP indirin

# Yöntem 2: Chocolatey (eğer yüklüyse)
choco install ngrok
```

#### 2. Ngrok Hesabı Oluşturma
1. https://ngrok.com/ adresine gidin
2. Ücretsiz hesap oluşturun
3. Dashboard'dan "Your Authtoken" alın
4. Token'ı ayarlayın:
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### 3. Kullanım

**Otomatik Başlatma (Önerilen):**
```powershell
cd D:\super-erp
.\scripts\start-with-ngrok.ps1
```

**Manuel Başlatma:**

**Terminal 1 - Next.js Sunucusu:**
```powershell
cd D:\super-erp
npm run dev:simple
```

**Terminal 2 - Ngrok Tüneli:**
```powershell
ngrok http 3000
```

Ngrok size şöyle bir URL verecek:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

Bu URL'yi kullanarak internetten erişebilirsiniz!

#### 4. Ngrok Dashboard
Ngrok çalışırken şu adresten tüm istekleri görebilirsiniz:
```
http://localhost:4040
```

### ⚠️ Notlar:
- Ücretsiz plan: Her başlatmada farklı URL
- Ücretli plan: Sabit URL (custom domain)
- Sunucu kapandığında ngrok da durur

### 🔧 http://localhost:3000 açılmıyor (Connection refused / sayfa gelmiyor)
- **"✓ Starting..." yeterli değil.** Next.js ilk çalışmada 1–2 dakika derleme yapabilir. Pencerede **"✓ Ready"** veya ilk route adı (örn. `○ Compiling / ...`) görünene kadar bekleyin, **sonra** tarayıcıda adresi açın.
- **Adres olarak şunu deneyin:** `http://127.0.0.1:3000` (bazı sistemlerde `localhost` çözülmüyor).
- Sunucu penceresinde **kırmızı hata** varsa (port kullanımda, adres kullanımda, vb.) o pencereyi kapatıp `scripts\sunucu-baslat.bat` ile tekrar başlatın.
- **Tarayıcı:** Farklı tarayıcı veya gizli pencere deneyin; bazen eklenti veya önbellek engel olur.

### 🔧 "Bağlanmıyor" – Sunucu ve ngrok açık ama sayfa gelmiyor
Sunucu penceresinde **"✓ Starting..."** ve ngrok **online** görünüyorsa:

1. **"Ready" bekleyin:** Next.js bazen **"Starting..."** yazdıktan sonra 30–60 saniye derleme yapar. Pencerede **"✓ Ready"** veya ilk sayfa adı görünene kadar bekleyin, sonra tarayıcıyı açın.
2. **Önce localhost deneyin:** Tarayıcıda **http://localhost:3000** açın. Giriş sayfası açılıyorsa sunucu tamam; sorun büyük ihtimalle ngrok adımında.
3. **Ngrok uyarı sayfası:** Ngrok adresini (örn. `https://....ngrok-free.dev`) açınca **"You are about to visit..."** / **"Visit Site"** / **"Ziyaret et"** çıkarsa **mutlaka bu butona tıklayın**. Tıklamadan sayfa yüklenmez.
4. **Sayfa boş kalırsa:** "Visit Site" dedikten sonra 2–3 saniye bekleyip sayfayı **yenileyin** (F5).

### 🔧 "Bu sayfaya ulaşılamıyor" (ERR_FAILED) veya bağlanamıyorsanız
1. **Doğru URL:** Ngrok penceresinde (veya http://localhost:4040) yazan **güncel** `https://....ngrok-free.dev` adresini kullanın. Her ngrok başlatışında URL değişir.
2. **"Visit Site" / "Ziyaret et":** İlk açılışta ngrok uyarı sayfası çıkarsa **"Visit Site"** butonuna tıklayın; ardından uygulama açılır.
3. **Sunucu + ngrok açık mı?** Hem "Next.js Sunucusu" hem "Ngrok" penceresinin açık olduğundan emin olun. `scripts\dev-baslat.bat` → E seçerek ikisini birlikte başlatabilirsiniz.
4. **Yerel test:** Tarayıcıda önce http://localhost:3000 açılıyor mu kontrol edin; açılıyorsa ngrok URL’i de aynı sunucuya gider.

### 📱 Başka bilgisayardan veya telefondan "Bu sayfaya ulaşılamıyor" (ERR_FAILED) çıkıyorsa
**Sunucunun çalıştığı bilgisayar (sizin PC)** ve **erişen cihaz (başka bilgisayar / telefon)** için kontrol listesi:

**Sizin bilgisayarda (sunucu + ngrok çalışan PC):**
1. **Next.js sunucusu açık mı?** Aynı PC’de tarayıcıda `http://localhost:3000` açılıyorsa sunucu çalışıyordur.
2. **Ngrok penceresi açık mı?** Ngrok’u kapattıysanız tünel kapanır; başka cihaz bağlanamaz. Yeniden `ngrok http 3000` (veya `ngrok http http://127.0.0.1:3000`) çalıştırın.
3. **Güncel URL’i kullanın.** Her ngrok yeniden başlatıldığında URL değişir. Başka cihaza verdiğiniz adres, ngrok penceresinde veya `http://localhost:4040` sayfasında yazan **şu anki** adres olmalı.

**Başka bilgisayarda / telefondan giren kişi:**
1. **Ngrok uyarı sayfası:** `https://....ngrok-free.dev` adresini ilk kez açınca ngrok **“You are about to visit…”** / **“Visit Site”** / **“Ziyaret et”** sayfası gösterir. **Bu sayfada mutlaka “Visit Site” (veya “Ziyaret et”) butonuna tıklanmalı.** Tıklanmadan doğrudan uygulama açılmaz; bazen ERR_FAILED veya boş sayfa görünür.
2. **Doğru adres:** Erişmek istediğiniz tam adres sunucuyu çalıştıran kişiden alınan **güncel** ngrok adresi olmalı (örn. `https://unexercisable-rickie-refreshful.ngrok-free.dev`). Eski veya yanlış adres kullanılıyorsa “Bu sayfaya ulaşılamıyor” hatası çıkar.
3. **İnternet bağlantısı:** Başka bilgisayar/telefon da internete bağlı olmalı (Wi‑Fi veya mobil veri).

**Özet:** Başka cihazda önce ngrok’un **“Visit Site”** sayfasında butona tıklanmalı, kullanılan adres sunucu PC’deki ngrok’un **şu anki** adresi olmalı ve sunucu + ngrok pencereleri o PC’de açık kalmalı.

### ❌ ERR_NGROK_8012 – "Sayfa açılmıyor" (Traffic reached ngrok but connection to localhost:3000 refused)
Bu hata **yerel sunucunun çalışmadığı** anlamına gelir. Ngrok tüneli açık ama bilgisayarınızda **port 3000’de dinleyen uygulama yok**.

**Yapmanız gerekenler (sırayla):**
1. **Önce sunucuyu başlatın.**  
   - `scripts\dev-baslat.bat` çalıştırın → **E** (Evet) deyin.  
   - Veya: Bir terminalde `npm run dev` yazın ve **"HTTP sunucu (port 3000) başlatıldı"** / **Ready** mesajını görünce bekleyin.
2. **Sunucu penceresini kapatmayın.** "LIVASOFA ERP - Next.js Sunucusu" penceresi açık kalmalı.
3. **Ngrok’u sunucu hazır olduktan sonra başlatın.** `dev-baslat.bat` ile E seçtiyseniz script zaten 15 saniye bekleyip ngrok’u açıyor; bazen ilk açılışta 20–30 saniye daha gerekebilir. Ngrok penceresini da açık tutun.
4. **Kontrol:** Tarayıcıda önce **http://localhost:3000** açılıyor mu bakın. Açılıyorsa aynı bilgisayarda ngrok URL’i de çalışır.

**Özet:** Önce `npm run dev` (veya dev-baslat.bat → E), sunucu "Ready" olana kadar bekleyin, sonra ngrok URL’ini kullanın.

### 🔧 "Unable to acquire lock" veya sunucu hiç açılmıyorsa
1. **Tüm CMD/PowerShell pencerelerini kapatın** (Next.js, Ngrok, Dev Baslat).
2. **Sadece sunucuyu deneyin:** `scripts\sunucu-baslat.bat` çalıştırın. Sunucu **aynı pencerede** başlar; hata olursa bu pencerede görünür.
3. **"Ready" veya "Local: http://localhost:3000"** görüyorsanız tarayıcıda http://localhost:3000 açın. Açılıyorsa sunucu tamam; ikinci bir CMD’de `ngrok http 3000` yazıp ngrok’u ayrı başlatın.
4. Hata mesajı görüyorsanız (lock, port, vb.) o mesajı not alıp proje sahibiyle paylaşın.

---

## 🔒 Yöntem 2: Cloudflare Tunnel (Ücretsiz, Kalıcı)

### Avantajlar:
- ✅ Tamamen ücretsiz
- ✅ Kalıcı URL
- ✅ Custom domain desteği
- ✅ DDoS koruması

### Kurulum:

#### 1. Cloudflare Hesabı
1. https://cloudflare.com adresine gidin
2. Ücretsiz hesap oluşturun

#### 2. Cloudflared İndirme
```powershell
# Chocolatey ile
choco install cloudflared

# Veya manuel: https://github.com/cloudflare/cloudflared/releases
```

#### 3. Tunnel Oluşturma
```powershell
# Cloudflare'e giriş yap
cloudflared tunnel login

# Tunnel oluştur
cloudflared tunnel create super-erp

# Tunnel'i başlat
cloudflared tunnel run super-erp
```

---

## 🖥️ Yöntem 3: VPS'e Deploy (Kalıcı Çözüm)

### Gereksinimler:
- VPS (DigitalOcean, AWS, Hetzner, vb.)
- Domain (opsiyonel)

### Adımlar:

#### 1. VPS'e Bağlanma
```powershell
ssh root@your-vps-ip
```

#### 2. Node.js ve NPM Kurulumu
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Projeyi kopyala
git clone YOUR_REPO_URL
cd super-erp
npm install
```

#### 3. PM2 ile Çalıştırma
```bash
# PM2 kurulumu
npm install -g pm2

# Uygulamayı başlat
npm run build
pm2 start npm --name "super-erp" -- start
pm2 save
pm2 startup
```

#### 4. Nginx Reverse Proxy (Opsiyonel)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ☁️ Yöntem 4: Cloud Platformlar (Railway, Vercel, Render)

### Railway (Önerilen - Kolay)

1. https://railway.app adresine gidin
2. GitHub ile giriş yapın
3. "New Project" > "Deploy from GitHub repo"
4. Repo'yu seçin
5. Otomatik deploy başlar!

### Vercel

```bash
npm install -g vercel
vercel
```

### Render

1. https://render.com adresine gidin
2. "New Web Service" seçin
3. GitHub repo'yu bağlayın
4. Build komutu: `npm run build`
5. Start komutu: `npm start`

---

## 🔐 Güvenlik Notları

### Önemli:
- ✅ Güçlü şifreler kullanın
- ✅ HTTPS kullanın (ngrok otomatik sağlar)
- ✅ Firewall kurallarını kontrol edin
- ✅ Düzenli yedekleme yapın
- ✅ Güncellemeleri takip edin

### Production İçin:
- Environment variables kullanın
- Rate limiting ekleyin
- Logging ve monitoring kurun
- SSL sertifikası kullanın (Let's Encrypt)

---

## 📊 Karşılaştırma

| Yöntem | Kurulum Süresi | Maliyet | Kalıcılık | Zorluk |
|--------|----------------|---------|-----------|--------|
| Ngrok | 5 dk | Ücretsiz | ❌ | ⭐ Kolay |
| Cloudflare Tunnel | 15 dk | Ücretsiz | ✅ | ⭐⭐ Orta |
| VPS | 1-2 saat | $5-20/ay | ✅ | ⭐⭐⭐ Zor |
| Railway | 10 dk | Ücretsiz* | ✅ | ⭐ Kolay |

*Railway ücretsiz planı sınırlı, production için ücretli plan gerekebilir.

---

## 🎯 Hızlı Başlangıç (Ngrok)

```powershell
# 1. Ngrok token ayarla (sadece ilk kez)
ngrok config add-authtoken YOUR_TOKEN

# 2. Otomatik başlatma scriptini çalıştır
cd D:\super-erp
.\scripts\start-with-ngrok.ps1

# 3. Ngrok URL'ini al (http://localhost:4040)
# 4. URL'yi paylaş ve kullan!
```

---

## ❓ Sorun Giderme

### Port Zaten Kullanılıyor
```powershell
# Port'u kullanan process'i bul
netstat -ano | findstr :3000

# Process'i durdur
taskkill /PID [PID_NUMARASI] /F
```

### Ngrok Bağlanamıyor
- Token'ın doğru ayarlandığından emin olun
- İnternet bağlantınızı kontrol edin
- Firewall'u kontrol edin

### Sunucu Başlamıyor
```powershell
# Bağımlılıkları kontrol et
npm install

# Cache temizle
npm run dev:clean
```

---

## 📞 Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin: `logs/api.log`
2. Ngrok dashboard'u kontrol edin: `http://localhost:4040`
3. Sunucu loglarını kontrol edin

