# Read Replica ve Mobil Senkron Notları

Bu belge, ileride ölçeklendirme ve mobil/offline senkron için notları içerir. Uygulama şu an tek SQLite veritabanı kullanmaktadır.

---

## Read Replica (Okuma Ölçeklendirme)

- **Amaç:** Yoğun okuma (liste, rapor) isteklerini ayrı bir veritabanı kopyasından karşılamak; yazma tek ana DB’de kalır.
- **SQLite bağlamında:** SQLite tek yazıcı destekler; “replica” için DB dosyasının read-only kopyası periyodik veya dosya kopyalama ile güncellenebilir. Alternatif: rapor/read işlerini ayrı bir process’te bu kopyadan okuyacak şekilde yönlendirmek.
- **PostgreSQL/MySQL’e geçişte:** Replica özelliği sunan çözümler (streaming replication, read replica instance) kullanılabilir; uygulama katmanında yazma vs okuma connection ayrımı yapılır.
- **Şimdilik:** Dokümantasyon; ihtiyaç halinde `getDatabase()` benzeri bir `getReadOnlyDatabase()` veya report query’lerin replica’ya yönlendirilmesi tasarlanabilir.

---

## Mobil / Offline-First Senkron

- **Amaç:** Bayi veya usta terminali gibi mobil/sahada kullanımda, bağlantı kesildiğinde veri local’de tutulup bağlantı gelince sunucu ile senkronize edilmek.
- **Bileşenler:**
  - **Local kuyruk:** Cihazda yapılan oluşturma/güncelleme/silme işlemleri bir kuyruğa (örn. IndexedDB veya SQLite) yazılır.
  - **Senkron servisi:** Çevrim içi olunca kuyruktaki işlemler sunucuya gönderilir (batch veya tek tek).
  - **Çakışma stratejisi:** Son-yazan-kazanır, veya sunucu zaman damgası / versiyon alanı ile merge. Kritik verilerde (stok, ödeme) sunucu onayı zorunlu tutulabilir.
- **Mevcut durum:** Mobil sayfalar (bayi, usta terminali) doğrudan API’ye istek atar; offline’da hata alınır. İleride PWA + Service Worker ile cache ve background sync eklenebilir; kuyruk ve çakışma çözümü ayrı tasarlanır.
- **Referans:** `docs/INTERNET_ERISIM.md`, `docs/TELEFON_ERISIM.md` ile birlikte değerlendirilebilir.

Bu doküman ihtiyaç doğrultusunda güncellenir.
