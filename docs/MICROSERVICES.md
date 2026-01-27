# Mikroservis Bilesenleri (Hedef Mimari)

Bu repo su anda tek bir Next.js uygulamasidir. Asagidaki bilesenler,
projeyi mikroservis mimarisine tasirken hedeflenen ayrimi ve sinirlari
tanimlar. Amac, containerization ve uzak ortam yonetimi icin temel
cerceveyi hazirlamaktir.

## 1) web-app (UI + SSR)
- Sorumluluk: Kullanici arayuzu, SSR/CSR render, statik dosyalar.
- Runtime: Next.js.
- Port: 3000.
- Bagimliliklar: api-service, auth-service.
- Kod konumu: `app/`, `components/`, `public/`.

## 2) api-service (BFF / ERP API)
- Sorumluluk: Domain API (urunler, stoklar, BOM, uretim emirleri),
  auth entegrasyonu, raporlama endpoint'leri.
- Runtime: Node.js (Next.js route handler veya ayri servis).
- Port: 3000 (su an web ile ayni process), hedefte 4000.
- Kod konumu: `app/api/`, `lib/database/`, `lib/utils/`.

## 3) db-service (PostgreSQL / Supabase)
- Sorumluluk: Kalici veri katmani.
- Su an iki mod:
  - Local SQLite: `data/` altinda tek dosya.
  - Supabase/Postgres: `supabase/` altindaki SQL ile kurulum.
- Port: 5432 (Postgres).

## 4) jobs-service (Arka plan islemleri)
- Sorumluluk: Veri temizlik, seed, toplu isler, periyodik gorevler.
- Runtime: Node.js scripts.
- Kod konumu: `scripts/`.

## 5) auth-service (Dis servis)
- Sorumluluk: Kimlik dogrulama ve yetkilendirme.
- Uygulama: Supabase Auth (dis servis).
- Bagimliliklar: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 6) storage-service (Dis servis)
- Sorumluluk: Dosya/rapor saklama (PDF, export).
- Uygulama: Supabase Storage veya baska obje depolama.

## Iletisim ve Veri Akisi (Ozet)
- web-app -> api-service: HTTP/JSON
- api-service -> db-service: SQL
- api-service -> auth-service: JWT/Session dogrulama
- jobs-service -> db-service: SQL

## Container Hedefi
Her bilesen icin ayri image uretilecek sekilde Dockerfile hazirlandi.
Uzak ortama tasindiginda servisler SSH/VNC ile yonetilecek ve
docker-compose veya orkestrasyon araclari ile calistirilacak.
