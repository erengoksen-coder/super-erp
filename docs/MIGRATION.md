# Migration Stratejisi

Mevcut veritabanı: **SQLite** (better-sqlite3), tek dosya `data/erp.db`. Geçiş ihtiyacı olursa (ör. PostgreSQL) aşağıdaki strateji kullanılabilir.

## Mevcut Durum (SQLite)

- **Sürücü:** `better-sqlite3`
- **Dosya:** `process.env.DATABASE_PATH` veya `data/erp.db`
- **Şema:** `lib/database/db.ts` içinde `initializeDatabase()` ile `CREATE TABLE IF NOT EXISTS` çalıştırılıyor
- **Repository’ler:** Tüm sorgular `getDatabase()` ile alınan aynı instance üzerinden; SQLite sözdizimi kullanılıyor

## SQLite → PostgreSQL Geçişi (Adım Adım)

Geçiş yapılacaksa önerilen sıra:

### 1. Şemayı PostgreSQL uyumlu hale getir

- SQLite tip eşlemesi: `TEXT` → `TEXT`, `INTEGER` → `BIGINT`/`INTEGER`, `REAL` → `NUMERIC`/`DOUBLE PRECISION`
- `AUTOINCREMENT` → `SERIAL` / `GENERATED ... AS IDENTITY`
- Tarih alanları: SQLite `CURRENT_TIMESTAMP` → PostgreSQL `timestamp with time zone` tercih edilebilir
- **Çıktı:** Tek bir `schema.sql` (veya sürümlenmiş migration dosyaları) ile tüm `CREATE TABLE` ve gerekli `INDEX`/`CONSTRAINT` tanımları

### 2. Veri dışa aktarımı (SQLite)

- `better-sqlite3` ile tabloları okuyup CSV veya PostgreSQL uyumlu `INSERT` script’leri üret
- Veya `sqlite3` CLI: `.mode insert` ile dump
- Binary/BLOB alanları ve encoding’e dikkat et

### 3. Veri içe aktarımı (PostgreSQL)

- Sıra önemli: foreign key’ler nedeniyle önce bağımsız tablolar, sonra bağımlı tablolar
- `COPY` veya `INSERT ... ON CONFLICT` ile toplu yükleme
- Sequence’leri (SERIAL/IDENTITY) son veri ID’lerine göre güncelle

### 4. Uygulama tarafı

- **Seçenek A:** `pg` (node-postgres) kullan; `lib/database/db.ts` içinde ortak bir `query()`/`getClient()` API’si sun; repository’ler bu API’yi kullansın (SQL parametreleri `$1,$2` formatına geçer).
- **Seçenek B:** Drizzle/Knex gibi bir ORM/query builder ile hem SQLite hem PostgreSQL’i destekleyen tek soyutlama katmanı kur; repository’ler bu katmanı kullansın.
- **Çevre:** `DATABASE_URL` (PostgreSQL connection string) ile canlı DB’yi seç; test/yerel için hâlâ SQLite kullanılabilir.

### 5. Migration script’leri (opsiyonel)

- `scripts/migrate-sqlite-to-pg.js`: SQLite’dan okuyup PostgreSQL’e yazan tek seferlik script
- Sürümlenmiş migration’lar: `migrations/001_initial.sql`, `002_add_foo.sql` şeklinde; uygulama başlarken veya ayrı komutla çalıştırılır

### 6. Test ve geri dönüş

- Geçiş sonrası kritik akışları (sipariş, stok, cari, kullanıcı) test et
- Geri dönüş planı: SQLite yedeği sakla; gerekirse eski sürüm + SQLite ile rollback

## Şu An İçin Karar

Proje **tek DB** stratejisiyle SQLite kullanmaya devam ediyor. PostgreSQL’e geçiş planlandığında bu adımlar ve `docs/BACKEND.md` güncellenerek ilerlenebilir.
