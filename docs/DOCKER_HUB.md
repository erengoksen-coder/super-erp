# Docker Hub – Projeyi erengoksen Hesabına Bağlama

Proje Docker Hub hesabı **erengoksen** ile kullanılmak üzere yapılandırıldı.

- **Hesap:** https://hub.docker.com/u/erengoksen  
- **Image:** `erengoksen/super-erp:latest`

## 1. Docker Hub’a giriş

Terminalde:

```bash
docker login
```

Kullanıcı adı: **erengoksen**, şifre: Docker Hub şifreniz (veya Access Token).

## 2. Image’i derleyip gönderme

Proje kök dizininde:

```bash
# Derleme
npm run docker:build

# Docker Hub’a push
npm run docker:push
```

İsterseniz tek satırda:

```bash
npm run docker:build && npm run docker:push
```

## 3. Başka bir makinede çalıştırma

Docker Hub’daki image ile:

```bash
docker run -d -p 3000:3000 -e JWT_SECRET=your-secret -v $(pwd)/data:/app/data --name super-erp erengoksen/super-erp:latest
```

Windows PowerShell’de volume için:

```powershell
docker run -d -p 3000:3000 -e JWT_SECRET=your-secret -v ${PWD}/data:/app/data --name super-erp erengoksen/super-erp:latest
```

## 4. docker-compose ile

`docker-compose.yml` zaten `erengoksen/super-erp:latest` kullanıyor. Önce push ettiyseniz:

```bash
docker-compose pull
docker-compose up -d
```

Yerelde yeniden derleyip çalıştırmak için:

```bash
docker-compose up -d --build
```

## 5. Cursor / IDE ile bağlantı

- Repo’yu Cursor’da açık tutun; `npm run docker:build` ve `npm run docker:push` komutlarını proje kökünden çalıştırın.
- Otomatik push için GitHub Actions veya başka bir CI’da `docker login` + `docker build` + `docker push` adımlarını ekleyebilirsiniz; gerekirse ayrı bir dokümanda anlatılabilir.
