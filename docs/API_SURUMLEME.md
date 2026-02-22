# API Sürümleme

Bu belge, LIVASOFA ERP API’lerinin ileride sürümlenmesi için seçenekleri özetler. Şu an tüm endpoint’ler sürüm prefix’i olmadan (`/api/...`) sunulmaktadır.

---

## Seçenekler

### 1. URL prefix (örn. /api/v1/...)
- Tüm route’lar `app/api/v1/` altına taşınır veya bir rewrite/proxy ile `/api/v1/*` → `/api/*` eşlenir.
- Avantaj: Sürüm açık ve önbelleklenebilir.
- Dezavantaj: Taşıma veya çift route gerekebilir.

### 2. Header (Accept veya X-API-Version)
- İstekte `Accept: application/vnd.erp.v1+json` veya `X-API-Version: 1` gönderilir; sunucu davranışı buna göre seçer.
- Avantaj: URL değişmez.
- Dezavantaj: Önbellek ve testte header yönetimi gerekir.

### 3. Sürüm olmadan evrim
- Geriye uyumlu değişiklikler (yeni alan, yeni endpoint) yapılır; kırıcı değişikliklerden kaçınılır. İhtiyaç olunca v2 eklenir.
- Mevcut projede bu model kullanılabilir; mobil veya 3. parti entegrasyonu artarsa v1 prefix veya header ile sürüm eklenebilir.

---

## Öneri

- Şimdilik mevcut `/api/...` yapısı korunabilir; yeni endpoint’lerde response’a `meta.apiVersion: 1` gibi alan eklenebilir.
- Kırıcı değişiklik gerektiğinde `/api/v2/...` veya header tabanlı sürüm uygulanabilir. Bu doküman o zaman güncellenir.
