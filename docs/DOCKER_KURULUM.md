# Docker Desktop – Super ERP Kurulumu

Bu dokümanda Super ERP’nin Docker Desktop ile kurulumu özetlenir.

## Ön koşullar

- **Docker Desktop** yüklü ve çalışır durumda (sistem tepsi simgesi yeşil).
- İnternet bağlantısı (ilk build sırasında npm paketleri indirilir).

## Adımlar

### 1. `.env` dosyası

Proje kökünde `.env` olmalı; yoksa oluşturun:

```env
JWT_SECRET=your-very-secure-random-jwt-secret-key-at-least-32-characters-long
NODE_ENV=production
```

Canlı ortamda `JWT_SECRET` değerini mutlaka güçlü ve rastgele bir anahtarla değiştirin.

### 2. Build ve çalıştırma

Proje klasöründe (PowerShell veya CMD):

```powershell
cd c:\super-erp
docker-compose up -d --build
```

İlk seferde image build edilir (birkaç dakika sürebilir). Bittiğinde uygulama **http://localhost:3000** adresinde çalışır.

### 3. Kontrol

- Tarayıcıda: http://localhost:3000
- Container durumu: `docker-compose ps`
- Loglar: `docker-compose logs -f app`

### 4. Durdurma

```powershell
docker-compose down
```

Veritabanı `./data` klasöründe kalır; container silinse bile veri korunur.

## Yapılan düzenlemeler (kurulumla ilgili)

- **Husky:** Docker build sırasında `prepare` (husky install) devre dışı bırakıldı (`HUSKY=0`, `CI=1`).
- **Build context:** `.dockerignore` ile `mobile-rts-game`, `testsprite_tests` vb. build dışı bırakıldı; build süresi kısaldı.
- **Port:** Sadece **3000** kullanılır; 54322 bu projede yok.

## Sık karşılaşılan hatalar

| Hata | Çözüm |
|------|--------|
| `husky: not found` / prepare failed | Dockerfile’da `HUSKY=0` tanımlı; güncel image ile tekrar `docker-compose up -d --build` deneyin. |
| `ECONNRESET` / network aborted | Ağ geçici kesilmiş olabilir; Docker Desktop’ın çalıştığından ve internetin olduğundan emin olup tekrar `docker-compose up -d --build` çalıştırın. |
| Port 54322 access forbidden | Bu projede 54322 kullanılmaz. Hata başka bir konteynerden geliyorsa `docs/DOCKER_PORT_54322_HATASI.md` dosyasına bakın. |
| JWT_SECRET hatası | `.env` içinde `JWT_SECRET` tanımlı ve en az 32 karakter olduğundan emin olun. |

## Özet

1. Docker Desktop’ı açın.
2. `c:\super-erp` içinde `.env` oluşturun (JWT_SECRET, NODE_ENV).
3. `docker-compose up -d --build` çalıştırın.
4. http://localhost:3000 adresinden uygulamayı kullanın.
