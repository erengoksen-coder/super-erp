# Docker Desktop’ta Super ERP’yi Çalıştırma

Docker Desktop yüklüyken Super ERP’yi container olarak ekleyip çalıştırmak için aşağıdaki adımları izleyin.

---

## 1. Gereksinimler

- **Docker Desktop** yüklü ve çalışır durumda olmalı (sistem tepsisinde Docker ikonu görünüyor olmalı).
- Proje klasörü bilgisayarınızda açık (örn. `c:\super-erp`).

---

## 2. Veritabanı klasörü

Proje kökünde **`data`** klasörü olmalı (veritabanı burada saklanır). Yoksa oluşturun:
```powershell
mkdir c:\super-erp\data
```
Docker ilk çalıştırmada bu klasörü kullanır; içinde `erp.db` oluşur.

## 3. .env Dosyasını Hazırlama

Proje kök dizininde (super-erp klasöründe) `.env` dosyası olmalı. Yoksa:

1. `.env.example` dosyasını kopyalayıp adını `.env` yapın.
2. `.env` içinde **JWT_SECRET** satırını mutlaka doldurun (en az 32 karakter rastgele bir anahtar):

```env
JWT_SECRET=buraya-en-az-32-karakter-uzunlukta-gizli-bir-anahtar-yazin
```

Kaydedin.

---

## 3. Docker Desktop ile ERP’yi Ayağa Kaldırma

### Yöntem A: Terminal (Önerilen)

1. **Cursor** veya **PowerShell / CMD** açın.
2. Proje klasörüne gidin:
   ```powershell
   cd c:\super-erp
   ```
3. Şu komutu çalıştırın:
   ```powershell
   docker-compose up -d --build
   ```
4. İlk seferde image derlenir (birkaç dakika sürebilir). Bittiğinde container arka planda çalışır.

### Yöntem B: Docker Desktop arayüzünden

1. **Docker Desktop**’ı açın.
2. Sol menüden **Containers**’a tıklayın.
3. Sağ üstte **“+”** veya **“Create”** benzeri bir buton varsa oradan “Compose” / “From docker-compose” seçeneğini arayın.  
   **Alternatif:** Terminali kullanmak daha net olduğu için **Yöntem A**’yı kullanın; container ayağa kalktıktan sonra zaten Docker Desktop’ta görünür.

---

## 4. Docker Desktop’ta ERP’yi Görmek

**“Your running containers show up here”** yazıyorsa liste boştur; container henüz çalışmıyor demektir.

1. Proje klasöründe (Cursor veya PowerShell) şu komutu çalıştırın:
   ```powershell
   cd c:\super-erp
   docker-compose up -d --build
   ```
2. Build bitince Docker Desktop’ta **Containers** sayfasına dönün (veya sayfayı yenileyin).
3. Listede **super-erp-app-1** veya **super-erp** adında bir container görünür.
4. Üzerine tıklayıp **Logs**, **Inspect**, **Restart**, **Stop** gibi işlemleri yapabilirsiniz.

---

## 5. ERP’ye Tarayıcıdan Erişim

- Adres: **http://localhost:3000**
- Tarayıcıda açın; giriş sayfası geliyorsa ERP çalışıyor demektir.
- Varsayılan port değiştiyse (`.env`’de `PORT=3001` gibi), **http://localhost:3001** kullanın.

---

## 6. Veritabanı Nerede?

- Veriler proje klasöründeki **`data`** dizininde tutulur (`./data` → container içinde `/app/data`).
- `docker-compose down` yapsanız bile `c:\super-erp\data` silinmez; veriler kalır.
- Container’ı silip yeniden `docker-compose up -d --build` yaptığınızda aynı verilerle devam eder.

---

## 7. Sık Kullanılan Komutlar

| Ne yapmak istiyorsunuz? | Komut (proje klasöründe) |
|-------------------------|---------------------------|
| ERP’yi başlatmak        | `docker-compose up -d --build` |
| ERP’yi durdurmak       | `docker-compose down` |
| Logları görmek         | `docker-compose logs -f app` veya Docker Desktop → Containers → ilgili container → Logs |
| Yeniden derleyip başlatmak | `docker-compose up -d --build` |

---

## 8. Sorun Giderme

- **“Cannot connect to Docker daemon”**  
  Docker Desktop’ın açık ve “Engine running” olduğundan emin olun.

- **Build sırasında “error reading from server: EOF” veya build yarıda kopuyor**  
  **WSL 2 kullanıyorsanız:** Docker Desktop → Settings → Resources’ta “Memory” kaydırıcısı yok; ekranda “resource limits are managed by Windows” ve “wslconfig file” yazıyorsa bellek **Windows’ta** ayarlanır:
  1. Kullanıcı klasörünüzde (örn. `C:\Users\PC\`) `.wslconfig` dosyası oluşturun veya düzenleyin. İçeriği örnek:
     ```ini
     [wsl2]
     memory=6GB
     processors=4
     swap=2GB
     ```
  2. Dosyayı kaydedin. PowerShell’i **yönetici olarak** açıp şunu çalıştırın:
     ```powershell
     wsl --shutdown
     ```
  3. Docker Desktop’ı tekrar açın, proje klasöründe: `docker-compose up -d --build`.  
  **Hyper-V / Windows container kullanıyorsanız:** Docker Desktop → Settings → Resources → Advanced → Memory’yi en az 4 GB (tercihen 6–8 GB) yapıp Apply & Restart.  
  **Yine koparsa** PowerShell’de eski builder ile deneyin:
  ```powershell
  $env:DOCKER_BUILDKIT=0; $env:COMPOSE_DOCKER_CLI_BUILD=0; docker-compose up -d --build
  ```

- **Port 3000 kullanımda**  
  `.env` dosyasına `PORT=3001` ekleyip tekrar `docker-compose up -d --build` deneyin; ardından **http://localhost:3001** açın.

- **“Database could not be opened at /app/data/erp.db”**  
  Proje kökünde `data` klasörü olsun: `mkdir c:\super-erp\data`. Container’ı yeniden başlatın: `docker-compose down` sonra `docker-compose up -d`. Hâlâ aynı hataysa Docker Desktop → Containers → super-erp → Logs’a bakın.

- **JWT_SECRET hatası / giriş yapılamıyor**  
  `.env` içinde `JWT_SECRET=...` değerinin en az 32 karakter olduğundan ve `.env` dosyasının proje kökünde (docker-compose.yml ile aynı yerde) olduğundan emin olun.

- **Container sürekli yeniden başlıyor**  
  Docker Desktop → Containers → ilgili container → **Logs**’a bakın; genelde eksik `.env` veya yanlış `JWT_SECRET` kaynaklıdır.

Bu adımlarla Super ERP’yi Docker Desktop’a ekleyip çalıştırabilirsiniz.
