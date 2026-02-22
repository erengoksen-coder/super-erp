# Cari Güncelleme ve Veritabanı Kalıcılığı

Bu dokümanda cari hesap güncelleme davranışı, veritabanı (program içi) ve Docker Desktop üzerinde verinin nasıl saklandığı özetlenir.

---

## 1. Cari Güncelleme – "Kaydedildi ama siliniyor" Düzeltmesi

**Sorun:** Cari düzenleyip "Kaydet" denildiğinde "Cari hesap güncellendi" mesajı çıkıyordu ama liste yenilenmediği veya tip (Müşteri/Tedarikçi) değiştiği için güncellenen cari listede görünmüyordu; kullanıcı "kayıt siliniyor" gibi algılıyordu.

**Yapılanlar:**
- Kayıt başarılı olduktan sonra **liste her zaman yeniden çekiliyor** (`mutate()`). Böylece güncellenen cari listede kalır.
- Tip Müşteri ↔ Tedarikçi değiştirildiyse filtre otomatik **"Tümü"** yapılıyor; güncellenen cari hem müşteri hem tedarikçi listesinde görünebilir.

**Teknik:** `app/accounts/page.tsx` içinde `handleUpdate` sonrası hem tip değişiminde `setFilterType('all')` hem de her durumda `await mutate()` çağrılıyor.

---

## 2. Veritabanı – Program İçinde

- **Motor:** SQLite (better-sqlite3).
- **Dosya konumu:**
  - `DATABASE_PATH` veya `DATABASE_URL` (file:...) tanımlıysa o yol kullanılır.
  - Tanımlı değilse: proje kökünde **`data/erp.db`**.
- **Cari silme:** Fiziksel silme yok; **soft delete**. `accounts` tablosunda `deleted_at` alanı doldurulur; listeler `WHERE deleted_at IS NULL` ile çalışır.
- **Cari güncelleme:** `PUT /api/accounts/[id]` → `accountsRepo.update()` → `UPDATE accounts SET ... WHERE id = ? AND deleted_at IS NULL`. Kayıt silinmez, sadece güncellenir.

Eğer veritabanı dosyası açılamazsa (izin/disk hatası vb.) kod **in-memory** veritabanına düşer; bu durumda **veri kalıcı olmaz**, uygulama yeniden başlayınca her şey sıfırlanır. Bu yüzden `DATABASE_PATH` ve dosya/klasör izinleri doğru olmalı.

---

## 3. Docker Desktop Üzerinde Veritabanı Kalıcılığı

Docker ile çalıştırırken verinin kalıcı olması için:

1. **Volume mount (zorunlu)**  
   `docker-compose.yml` içinde:
   ```yaml
   volumes:
     - ./data:/app/data
   ```
   Böylece container içindeki `/app/data` dizini, host’taki proje klasöründeki **`./data`** ile aynıdır. Veritabanı host’ta kalır; container silinse bile veri kaybolmaz.

2. **Ortam değişkeni**  
   Container içinde varsayılan:
   ```env
   DATABASE_PATH=/app/data/erp.db
   ```
   Bu yol, mount ettiğiniz `./data` içinde olduğu için kalıcıdır. `.env` ile değiştirirseniz yine **container içinde** kalıcı bir dizine (örn. `/app/data/...`) yazdığınızdan emin olun.

3. **Docker Desktop’ta kontrol**  
   - Container’ı çalıştırdıktan sonra **Volumes** veya container **Inspect** kısmında `./data` (veya ilgili volume) mount’unun göründüğünü kontrol edin.
   - Host’ta proje klasöründe `data/erp.db` dosyasının oluştuğunu ve container yeniden başlatıldıktan sonra hâlâ orada olduğunu kontrol edin.

**Özet:** Docker’da veri kayboluyorsa genelde volume mount eksik/yanlıştır veya `DATABASE_PATH` container içinde geçici bir dizine (örn. `/tmp`) işaret ediyordur. `DATABASE_PATH=/app/data/erp.db` ve `./data:/app/data` volume’u ile cari ve tüm veri kalıcı olur.

---

## 4. Özet Tablo

| Konu | Açıklama |
|------|-----------|
| Cari güncelleme | Kayıt sonrası liste her zaman yenilenir; tip değişince filtre "Tümü" olur. |
| Cari silme | Soft delete (`deleted_at`); API’de `DELETE` sadece `deleted_at` set eder. |
| DB dosyası (yerel) | `data/erp.db` veya `DATABASE_PATH` / `DATABASE_URL`. |
| DB (Docker) | `/app/data/erp.db` + host’ta `./data` volume mount. |
| Kalıcılık | Volume doğru ve `DATABASE_PATH` kalıcı dizinde ise veri korunur. |
