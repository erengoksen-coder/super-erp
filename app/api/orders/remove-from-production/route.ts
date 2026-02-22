import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { logAudit } from '@/lib/audit'
import { apiLogger } from '@/lib/api/logger'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { resolveUnitFactor } from '@/lib/units'
import { randomUUID } from 'crypto'

type StockMovementRow = {
  material_id: string
  quantity: number
  notes: string | null
}

/**
 * POST: Siparişi üretimden çıkar.
 * - Sipariş tekrar bekleyene alınır (status=pending, production_order_id=null).
 * - Üretim emri (URE-xxx) iptal edilir; BOM kaydındaki malzemeler depo stoğuna iade edilir.
 * - İptal bilgisi: "İptal olan URE: URE-xxx" response ve stok hareketi notunda döner.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  let orderIdForLog: string | undefined
  try {
    const body = await parseJsonBody<{ orderId?: string; id?: string }>(request).catch(() => ({}))
    const bodyId = body?.orderId ?? ((body as Record<string, unknown>)?.id as string | undefined)
    const orderId = bodyId?.trim?.()
    orderIdForLog = typeof orderId === 'string' ? orderId : undefined
    if (!orderId || typeof orderId !== 'string') {
      return fail('Sipariş ID gerekli (orderId veya id gönderin)', { status: 400 })
    }

    const db = getDatabase()
    const row = db.prepare(`
      SELECT id, order_number, status, production_order_id FROM orders WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `).get(orderId) as { id: string; order_number: string; status: string; production_order_id: string | null } | undefined

    if (!row) {
      return fail('Sipariş bulunamadı. Geçerli sipariş ID gönderdiğinizden emin olun.', { status: 404 })
    }

    // Üretim emrine bağlı değilse çıkarılacak bir şey yok
    const prevProductionOrderId = row.production_order_id
    if (!prevProductionOrderId || String(prevProductionOrderId).trim() === '') {
      return fail('Bu sipariş üretim emrine bağlı değil; üretimden çıkarılamaz.', { status: 400 })
    }

    if (row.status !== 'in_production' && row.status !== 'in_progress') {
      return fail(`Sipariş durumu "üretimde" değil (mevcut: ${row.status}). Üretimden çıkarılamaz.`, { status: 400 })
    }

    // Üretim emri bilgisi (URE numarası)
    const productionOrder = db.prepare(`
      SELECT id, order_number FROM production_orders WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `).get(prevProductionOrderId) as { id: string; order_number: string } | undefined

    const ureNumber = productionOrder?.order_number ?? `URE-${prevProductionOrderId.slice(0, 8)}`

    db.transaction(() => {
      // 1. Bu üretim emrine ait 'out' stok hareketlerini al (BOM’dan düşülen miktarlar)
      const outMovements = db.prepare(`
        SELECT material_id, quantity, notes
        FROM stock_movements
        WHERE reference_id = ? AND movement_type = 'out'
          AND reference_type IN ('production_order', 'production')
          AND (deleted_at IS NULL OR deleted_at = '')
      `).all(prevProductionOrderId) as StockMovementRow[]

      // material_id bazında topla (aynı malzemeden birden fazla hareket olabilir)
      const byMaterial = new Map<string, { quantity: number; notes: string }>()
      for (const m of outMovements) {
        if (!m.material_id) continue
        const prev = byMaterial.get(m.material_id) ?? { quantity: 0, notes: m.notes ?? '' }
        const absQty = Math.abs(Number(m.quantity) || 0)
        if (absQty <= 0) continue
        byMaterial.set(m.material_id, {
          quantity: prev.quantity + absQty,
          notes: prev.notes || m.notes || '',
        })
      }

      // 2. Stok hareketi yoksa BOM'dan iade miktarını hesapla (eski veri / farklı reference_id)
      if (byMaterial.size === 0) {
        const po = db.prepare(`
          SELECT product_id, quantity FROM production_orders WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
        `).get(prevProductionOrderId) as { product_id: string; quantity: number } | undefined
        if (po?.product_id) {
          const bom = db.prepare(`
            SELECT material_id, quantity_required, unit, COALESCE(fire_percentage, 0) as fire_percentage,
                   (SELECT unit FROM materials WHERE id = b.material_id) as material_unit
            FROM bom b
            JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
            WHERE b.product_id = ? AND b.deleted_at IS NULL
          `).all(po.product_id) as { material_id: string; quantity_required: number; unit: string; fire_percentage: number; material_unit: string }[]
          for (const item of bom) {
            const firePct = item.fire_percentage || 0
            const qtyWithFire = item.quantity_required * (1 + firePct / 100)
            const fromUnit = (item.unit || '').toString()
            const toUnit = (item.material_unit || '').toString()
            const factor = resolveUnitFactor(db, item.material_id, fromUnit, toUnit)
            const totalRequired = (factor ? qtyWithFire * factor : qtyWithFire) * po.quantity
            if (totalRequired <= 0) continue
            byMaterial.set(item.material_id, { quantity: totalRequired, notes: '' })
          }
        }
      }

      // 3. Depo stoğuna iade: stok artır + 'in' hareketi (malzeme hatası tek başına işlemi iptal etmesin)
      for (const [materialId, { quantity }] of byMaterial) {
        if (quantity <= 0) continue
        try {
          applyMaterialStockChange(db, materialId, quantity)
          const movementId = randomUUID()
          db.prepare(`
            INSERT INTO stock_movements
            (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, to_warehouse_id, created_at)
            VALUES (?, ?, 'in', ?, 'production_order_return', ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            movementId,
            materialId,
            quantity,
            prevProductionOrderId,
            `İptal olan URE: ${ureNumber} - BOM malzemesi depoya iade`,
            DEFAULT_WAREHOUSE_ID,
            DEFAULT_WAREHOUSE_ID
          )
        } catch (materialErr: unknown) {
          apiLogger.warn('remove-from-production: malzeme iadesi atlandı', { materialId, quantity, error: materialErr instanceof Error ? materialErr.message : String(materialErr) })
        }
      }

      // 4. Bu üretim emrine ait barkodları sil
      db.prepare(`
        DELETE FROM product_serial_numbers WHERE production_order_id = ?
      `).run(prevProductionOrderId)

      // 5. Üretim emrini iptal olarak işaretle
      db.prepare(`
        UPDATE production_orders
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(prevProductionOrderId)

      // 6. Siparişi bekleyene al (DB'de status = 'pending', production_order_id = NULL) — WHERE için DB'den okunan row.id kullan
      const orderUpdate = db.prepare(`
        UPDATE orders SET status = 'pending', production_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(row.id)
      if (orderUpdate.changes !== 1) {
        apiLogger.warn('remove-from-production: orders UPDATE etkilediği satır beklenen değil', { orderId: row.id, changes: orderUpdate.changes })
        throw new Error(`Sipariş güncellenemedi (etkilenen satır: ${orderUpdate.changes}). Lütfen sayfayı yenileyip tekrar deneyin.`)
      }

      // Doğrulama: transaction içinde güncel satırı oku
      const verify = db.prepare('SELECT id, status, production_order_id FROM orders WHERE id = ?').get(row.id) as { id: string; status: string; production_order_id: string | null } | undefined
      apiLogger.info('remove-from-production: UPDATE sonrası doğrulama', {
        orderId: row.id,
        order_number: row.order_number,
        updated_status: verify?.status ?? null,
        updated_production_order_id: verify?.production_order_id ?? null,
      })
    })

    logAudit(db, {
      tableName: 'orders',
      action: 'update',
      recordId: row.id,
      userId: user.userId,
      before: { status: row.status, production_order_id: prevProductionOrderId },
      after: { status: 'pending', production_order_id: null, _note: `Üretimden çıkarıldı. İptal olan URE: ${ureNumber}.` },
    })

    // Başarılı işlemde her zaman beklenen değerleri dön (DB tekrar okumaya güvenme; bazen read-after-write farklı instance/cache dönebiliyor)
    return ok({
      id: row.id,
      order_number: row.order_number,
      production_order_number: ureNumber,
      message: `Sipariş üretimden çıkarıldı. İptal olan URE: ${ureNumber}. BOM malzemeleri depo stoğuna iade edildi.`,
      updated_status: 'pending',
      updated_production_order_id: null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'İşlem başarısız'
    apiLogger.error('remove-from-production failed', { orderId: orderIdForLog, error: message, stack: error instanceof Error ? error.stack : undefined })
    return fail(message || 'Üretimden çıkarırken sunucu hatası oluştu.', { status: 500 })
  }
})
