# Katkıda Bulunma

Super ERP’ye katkı için aşağıdaki dokümanlara bakın.

## Kök yapı ve scriptler

- **Kök dizin yapısı, script konumları, lint/test:** [docs/GELISTIRME.md](docs/GELISTIRME.md)
- **Mevcut mimari özeti (DB, API, auth):** [docs/MEVCUT_MIMARI.md](docs/MEVCUT_MIMARI.md)
- **Yol haritası (Faz 1–4):** [docs/YOL_HARITASI.md](docs/YOL_HARITASI.md)

## Geliştirme kuralları

- Her sprint sonunda `npm run lint` ve `npm run test` hatasız geçmeli.
- Yeni API route’larda `withAuth` / `withAuthAndPermission` ve `ok()` / `fail()` kullanın; body için `parseJsonBody()` tercih edin.
