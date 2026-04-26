# Changelog

## [Unreleased]

### Tamamlanan fazlar (Yol Haritası)

- **Faz 1** – Temizlik ve standartlaştırma ✅
- **Faz 2** – Veritabanı ve API mimarisi ✅
- **Faz 3** – Arayüz ve kullanıcı deneyimi (UI revamp) ✅
- **Faz 4** – Güvenlik, performans ve test ✅
  - Jest birim testleri (lib/utils, repository mock DB)
  - E2E kritik akışlar (Playwright): üretim emri, sipariş onayı, bayi iptali
  - Siparişler sayfası sayfalama (limit/offset)
  - Rapor API limitleri (stok hareketleri, cari yaşlandırma)
  - CI: lint, unit test, build, E2E (secret varsa); nightly E2E workflow

Detaylı sprint listesi: [docs/YOL_HARITASI.md](docs/YOL_HARITASI.md).
