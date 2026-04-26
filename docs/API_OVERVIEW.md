# API Özet Dokümantasyonu

Ana endpoint'ler ve kullanım notları. Detay için ilgili route dosyalarına bakın.

## Yanıt formatı

- **Başarı:** `{ success: true, data: T, message?: string, meta?: { total?, limit?, offset? } }`
- **Hata:** `{ success: false, error: string, details?: unknown }`
- Helper: `lib/api/response.ts` → `ok()`, `fail()`

## Kimlik doğrulama

- **Login:** `POST /api/auth/login` — body: `{ username, password }` → `{ user, accessToken }` + Set-Cookie
- **Me:** `GET /api/auth/me` — Cookie veya `Authorization: Bearer <token>`
- **Logout:** `POST /api/auth/logout` — Cookie temizlenir

## Sayfalama

- **Orders:** `GET /api/orders?limit=50&offset=0` — `meta: { total, limit, offset }` döner
- **Diğer listeler:** İhtiyaç halinde aynı `limit`/`offset` parametreleri kullanılabilir (örn. `PAGINATION` sabiti: `lib/constants.ts`)

## Ana modüller

| Path | Açıklama |
|------|----------|
| `GET/POST /api/orders` | Sipariş listesi / oluşturma |
| `GET /api/invoices` | Faturalar |
| `GET/POST /api/shipments` | Sevkiyatlar |
| `GET /api/accounts` | Cari hesaplar |
| `GET /api/barcodes` | Barkod listesi |
| `GET /api/materials` | Malzemeler |
| `GET /api/products` | Ürünler |
| `GET /api/bom` | Reçete (BOM) |
| `GET /api/dashboard/stats` | Dashboard istatistikleri |
| `GET /api/health` | Canlılık; `?deep=true` ile DB kontrolü |

## Webhook event'leri

Kayıtlı webhook URL'lerine POST ile gönderilir. Body: `{ event, payload, timestamp }`. Header: `X-Webhook-Event`, opsiyonel `X-Webhook-Signature`.

| Event | Tetikleyici | Payload örnek |
|-------|-------------|----------------|
| `order.created` | Sipariş oluşturuldu | `{ orders: [{ id, order_number, ... }] }` |
| `shipment.approved` | Sevkiyat onaylandı | `{ shipment_id, shipment_number, approved_by, approved_at }` |
| `invoice.issued` | Fatura kesildi | `{ invoice_id, invoice_number, shipment_id, customer_id, final_amount }` |
| `stock.low` | Malzeme stoğu min. seviyenin altına düştü | `{ materialId, currentStock, minLevel }` |
| `production.started` / `production.completed` | Üretim başladı / tamamlandı | İlgili üretim bilgileri |

## Hata loglama

- API hatalarında `lib/api/logger.ts` → `apiLogger.error()` kullanılır (örn. login route).
