# Docker ile Production Çalıştırma

Bu dokümanda Super-ERP uygulamasının Docker ile production ortamında tek komutla nasıl ayağa kaldırılacağı anlatılır.

## Gereksinimler

- Docker ve Docker Compose kurulu olmalı.
- Proje kökünde `.env` dosyası (en azından `JWT_SECRET` tanımlı olmalı).

## Hızlı Başlangıç

```bash
# 1. .env dosyasını oluşturun (veya .env.example'dan kopyalayıp düzenleyin)
cp .env.example .env
# JWT_SECRET değerini mutlaka güçlü bir rastgele anahtarla değiştirin.

# 2. Build ve çalıştırma (tek komut)
docker-compose up -d --build

# Uygulama http://localhost:3000 adresinde çalışır.
```

## Ortam Değişkenleri

| Değişken | Zorunlu | Açıklama | Varsayılan |
|----------|---------|----------|-------------|
| `JWT_SECRET` | Evet | JWT imzalama anahtarı (en az 32 karakter önerilir). | — |
| `DATABASE_PATH` | Hayır | SQLite veritabanı dosya yolu. | `/app/data/erp.db` (container içinde) |
| `PORT` | Hayır | Host’ta açılacak port. | `3000` |
| `NODE_ENV` | Hayır | Otomatik `production` ayarlanır. | `production` |

`.env` örneği (Docker için):

```env
JWT_SECRET=your-very-secure-random-jwt-secret-key-at-least-32-characters-long
# İsteğe bağlı (container içi varsayılan zaten /app/data/erp.db):
# DATABASE_PATH=/app/data/erp.db
# Host portu (docker-compose'ta PORT:3000 kullanılıyorsa 3000):
# PORT=3000
```

## Veritabanı Kalıcılığı

- Veritabanı dosyası container içinde `/app/data/erp.db` konumunda tutulur.
- `docker-compose.yml` içinde `./data:/app/data` volume mount’u ile bu dizin host’taki `./data` klasörüne bağlanır.
- Container silinse veya yeniden oluşturulsa bile `./data` dizini host’ta kalır; veritabanı korunur.

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `docker-compose up -d --build` | Arka planda build edip container’ı başlatır. |
| `docker-compose up --build` | Build edip logları önde çalıştırır (Ctrl+C ile durur). |
| `docker-compose down` | Container’ı durdurur ve kaldırır (volume’lar silinmez). |
| `docker-compose logs -f app` | Uygulama loglarını canlı izler. |
| `docker-compose exec app sh` | Container içine shell ile girer. |

## Port Değiştirme

Host’ta farklı bir port kullanmak için:

```bash
PORT=8080 docker-compose up -d --build
```

veya `.env` dosyasına `PORT=8080` ekleyin.

## Sorun Giderme

- **Build hatası:** `docker-compose build --no-cache` ile önbelleksiz tekrar deneyin.
- **JWT_SECRET hatası:** `.env` içinde `JWT_SECRET` tanımlı ve yeterince uzun olduğundan emin olun.
- **Veritabanı yazma hatası:** Host’ta `./data` dizininin yazılabilir olduğunu kontrol edin; gerekirse `chmod 755 data` veya sahibini düzeltin.
- **Sağlık kontrolü:** `curl http://localhost:3000/api/health` ile API’nin yanıt verdiğini doğrulayabilirsiniz.

## Özet

1. `.env` oluşturup `JWT_SECRET` ayarlayın.
2. `docker-compose up -d --build` çalıştırın.
3. Uygulama `http://localhost:3000` (veya belirlediğiniz `PORT`) üzerinden erişilebilir olur; veritabanı `./data` içinde kalıcıdır.
