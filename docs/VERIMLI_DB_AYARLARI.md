# Verimli DB Ayarları

Bu dokümanda Super ERP’de kullanılan SQLite verimlilik ayarları özetlenir. Referans: [ChatGPT – Verimli DB Ayarları](https://chatgpt.com/share/6995ecb4-cf44-8010-9163-df55a3f935ed).

## Uygulanan ayarlar (`lib/database/db.ts`)

| Pragma | Değer | Açıklama |
|--------|--------|----------|
| `journal_mode` | WAL | Eşzamanlı okuma/yazma, daha iyi performans. |
| `busy_timeout` | 10000 | Kilitlenmede 10 sn bekleme (ms). |
| `cache_size` | -64000 | ~64 MB önbellek (negatif = KB). |
| `synchronous` | NORMAL | WAL ile güvenli ve FULL’dan hızlı. |
| `temp_store` | MEMORY | Geçici tablolar bellekte. |
| `mmap_size` | 268435456 | 256 MB memory-mapped I/O (okuma). |
| `wal_autocheckpoint` | 1000 | WAL sayfa sayısı checkpoint için. |
| `foreign_keys` | OFF | Proje gereği kapalı (mevcut davranış). |

## Notlar

- **WAL**: Docker ve yerel ortamda kalıcı `data/erp.db` ile kullanılır.
- **Dosya yolu**: `DATABASE_PATH` veya `data/erp.db` (varsayılan).
- Değişiklikler uygulama yeniden başlatıldığında devreye girer.
