# Kalan alert() → toast Migrasyonu

Aşağıdaki sayfalarda hâlâ `alert()` kullanılıyor. Aynı pattern ile toast'a geçilebilir:

1. Dosyada: `import { toast } from '@/lib/notify'`
2. `alert('...')` → başarı için `toast.success()`, hata için `toast.error()`, uyarı için `toast.warning()`, bilgi için `toast.info()`

**Dosya listesi (güncel değilse `rg "alert\(" app --files-with-matches` ile güncelleyin):**

- `app/users/page.tsx` (şifre sıfırlama — kopyala için bilinçli alert bırakılabilir)
- `app/accounts/new/page.tsx`
- `app/inventory/page.tsx`
- `app/shipments/new/page.tsx`
- `app/production/mrp/page.tsx`
- `app/purchase-requests/page.tsx`
- `app/purchase/critical-stock/page.tsx`
- `app/sales-orders/page.tsx`
- `app/purchase-orders/page.tsx`
- `app/payments/page.tsx`
- `app/inventory/materials/reservations/page.tsx`
- `app/reports/page.tsx`
- `app/production/[id]/page.tsx`
- `app/mobile/workstation/station/page.tsx`
- `app/invoices/[id]/page.tsx`
- `app/mobile/material-stock/page.tsx`
- `app/production/new/page.tsx`
- `app/production/work-centers/page.tsx`
- `app/production/operations/page.tsx`
- `app/production/order-operations/page.tsx`
- `app/units/conversions/page.tsx`
- `app/production/work-orders/page.tsx`
- `app/materials/qr/[id]/page.tsx`
- `app/inventory/materials/new/page.tsx`
- `app/bom/page.tsx` (birkaç tekil kalmış olabilir)

**Örnek:** `alert('Hata: ' + error.message)` → `toast.error('Hata: ' + error.message)`
