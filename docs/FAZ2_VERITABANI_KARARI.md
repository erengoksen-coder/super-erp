# Faz 2.1 – Tek Veritabanı Kararı

**Tarih:** Faz 2 Sprint 2.1  
**Karar:** Tek veritabanı olarak **SQLite (better-sqlite3)** kullanılacak.

## Gerekçe

- Proje halihazırda `lib/database/db.ts` ile SQLite kullanıyor; tüm tablolar ve `active_orders` view burada tanımlı.
- Çift sürücü (SQLite + Supabase/PostgreSQL) bakım yükü ve tutarsızlık riski oluşturuyor.
- Faz 2 kapsamında sorgular repository katmanına taşınacak; `db.ts` sadece connection/instance export edecek.

## Yapılacaklar (Sprint 2.2+)

- Supabase/PostgreSQL kullanımı varsa kademeli kaldırılacak veya sadece opsiyonel entegrasyon (ör. raporlama) kalacak.
- Tüm okuma/yazma işlemleri `lib/repositories/` üzerinden SQLite ile yapılacak.

## Referans

- `lib/database/db.ts` – connection: `getDatabase()`
- `lib/repositories/` – OrderRepository, AccountRepository, vb.
