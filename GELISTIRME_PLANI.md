# GELISTIRME PLANI

Bu plan, Super ERP projesini kademeli olarak guvenli, bakimi kolay ve
olceklenebilir hale getirmek icin 8 fazlik bir yol haritasidir.

## Faz 1: Klasor Yapisi ve Temizlik
- Hedef: Tekrar eden dizinleri kaldirip tek kaynak noktasi olusturmak.
- Isler:
  - `app/app/`, `components/components/`, `lib/lib/` tekrarlarini kaldir.
  - Import yollarini tekille (sadece `app/`, `components/`, `lib/`).
  - Yedek/duble dosyalari raporla ve kaldir.
- Cikti:
  - Tek kaynakli dizin yapisi
  - Duzgun import grafi

## Faz 2: TypeScript Tip Guvenligi
- Hedef: `any` sayisini ciddi oranda azaltmak.
- Isler:
  - API route'lari icin tipler olustur (request/response DTO).
  - DB katmani icin tipler olustur (row types).
  - `any` kullanimlarini kademeli `unknown` + daraltma ile degistir.
  - `typescript.ignoreBuildErrors` ayarini kaldirabilir hale getir.
- Cikti:
  - Daha guvenilir build
  - IDE destekli refaktor

## Faz 3: Mimari Iyilestirmeler
- Hedef: Veri erisim ve state katmanini standartlastirmak.
- Isler:
  - Repository pattern (DB access tek noktadan).
  - API response formati standardi (success/error wrapper).
  - Client caching (React Query/SWR) ile ortak fetch katmani.
- Cikti:
  - Tek tip veri akis modeli
  - Daha temiz servis sinirlari

## Faz 4: Guvenlik Sertlestirme
- Hedef: Auth ve parola guvenligi.
- Isler:
  - Bcrypt/Argon2 ile parola hash.
  - HttpOnly cookie + JWT/Session.
  - Rate limiting ve temel CSRF korumasi.
  - Input validation (Zod).
- Cikti:
  - Temel guvenlik standardi saglanmis auth

## Faz 5: Performans ve Cache
- Hedef: Performans ve veri caching.
- Isler:
  - Server-side caching stratejisi.
  - DB index iyilestirmeleri.
  - Client cache politikasi (staleTime, refetch).
- Cikti:
  - Daha hizli API ve UI

## Faz 6: PWA ve Offline
- Hedef: Offline destekli UI ve PWA temelleri.
- Isler:
  - Service Worker, manifest.
  - Offline fallback ekranlari.
- Cikti:
  - PWA-ready uygulama

## Faz 7: Gelismis Raporlama
- Hedef: Finans/uretim raporlari ve export.
- Isler:
  - Rapor sablonlari
  - Export (PDF/Excel)
- Cikti:
  - Kullanici odakli rapor ekosistemi

## Faz 8: Test ve CI/CD
- Hedef: Otomatik test ve deploy.
- Isler:
  - Unit/Integration/E2E test seti
  - CI pipeline (lint, test, build)
  - Otomatik deployment (opsiyonel)
- Cikti:
  - Uretime hazir kaliteli cikti

