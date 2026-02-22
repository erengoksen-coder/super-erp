import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { getAuthUserId } from '@/lib/auth/session'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'
import { apiLogger } from '@/lib/api/logger'

type StockMovementRow = {
  material_id: string
  quantity: number
  notes: string | null
}

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

/**
 * POST: Üretim emrini iptal et.
 * - BOM'dan düşülen malzemeler depoya iade edilir (önce 'out' stok hareketlerine göre, yoksa BOM hesaplaması).
 * - Bu üretim emrine bağlı siparişler bekleyene alınır (status=pending, production_order_id=null).
 * - Barkodlar silinir, üretim emri status=cancelled olur.
 */
export const POST = withAuth(async (
  request: NextRequest,
  _user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(context?.params)
    const orderId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).slice(-2)[0]
    if (!orderId) {
      return NextResponse.json({ error: 'Üretim emri ID gerekli' }, { status: 400 })
    }

    const order = db.prepare(`
      SELECT id, order_number, product_id, quantity, status FROM production_orders WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `).get(orderId) as { id: string; order_number: string; product_id: string; quantity: number; status: string } | undefined

    if (!order) {
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404 })
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Bu üretim emri zaten iptal edilmiş' }, { status: 400 })
    }

    if (order.status === 'completed') {
      return NextResponse.json({ error: 'Tamamlanmış üretim emirleri iptal edilemez' }, { status: 400 })
    }

    const ureNumber = order.order_number

    db.transaction(() => {
      // 1. Bu üretim emrine ait 'out' stok hareketlerini al (BOM'dan düşülen miktarlar)
      const outMovements = db.prepare(`
        SELECT material_id, quantity, notes
        FROM stock_movements
        WHERE reference_id = ? AND movement_type = 'out'
          AND reference_type IN ('production_order', 'production')
          AND (deleted_at IS NULL OR deleted_at = '')
      `).all(orderId) as StockMovementRow[]

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

      // 2. Stok hareketi yoksa BOM'dan iade miktarını hesapla
      if (byMaterial.size === 0 && order.product_id) {
        const bom = db.prepare(`
          SELECT material_id, quantity_required, unit, COALESCE(fire_percentage, 0) as fire_percentage,
                 (SELECT unit FROM materials WHERE id = b.material_id) as material_unit
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
          WHERE b.product_id = ? AND b.deleted_at IS NULL
        `).all(order.product_id) as { material_id: string; quantity_required: number; unit: string; fire_percentage: number; material_unit: string }[]
        for (const item of bom) {
          const firePct = item.fire_percentage || 0
          const qtyWithFire = item.quantity_required * (1 + firePct / 100)
          const fromUnit = (item.unit || '').toString()
          const toUnit = (item.material_unit || '').toString()
          const factor = resolveUnitFactor(db, item.material_id, fromUnit, toUnit)
          const totalRequired = (factor ? qtyWithFire * factor : qtyWithFire) * order.quantity
          if (totalRequired <= 0) continue
          byMaterial.set(item.material_id, { quantity: totalRequired, notes: '' })
        }
      }

      // 3. Depo stoğuna iade: stok artır + 'in' hareketi
      for (const [materialId, { quantity }] of byMaterial) {
        if (quantity <= 0) continue
        try {
          applyMaterialStockChange(db, materialId, quantity)
          const movementId = randomUUID()
          db.prepare(`
            INSERT INTO stock_movements
            (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, to_warehouse_id, created_at)
            VALUES (?, ?, 'in', ?, 'production_order_cancel', ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `).run(
            movementId,
            materialId,
            quantity,
            orderId,
            `Üretim emri iptali: ${ureNumber} - BOM malzemesi depoya iade`,
            DEFAULT_WAREHOUSE_ID,
            DEFAULT_WAREHOUSE_ID
          )
        } catch (materialErr: unknown) {
          apiLogger.warn('production-order-cancel: malzeme iadesi atlandı', { materialId, quantity, error: materialErr instanceof Error ? materialErr.message : String(materialErr) })
        }
      }

      // 4. Bu üretim emrine ait barkodları sil
      db.prepare(`
        DELETE FROM product_serial_numbers WHERE production_order_id = ?
      `).run(orderId)

      // 5. Bu üretim emrine bağlı siparişleri bekleyene al
      db.prepare(`
        UPDATE orders SET status = 'pending', production_order_id = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE production_order_id = ? AND (deleted_at IS NULL OR deleted_at = '')
      `).run(orderId)

      // 6. Üretim emrini iptal olarak işaretle
      db.prepare(`
        UPDATE production_orders
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(orderId)
    })()

    const userId = await getActorId(request)
    logAudit(db, {
      tableName: 'production_orders',
      action: 'update',
      recordId: orderId,
      userId: userId ?? undefined,
      before: { status: order.status },
      after: { status: 'cancelled', _note: 'Çalışılan üretim iptal edildi; BOM depoya iade edildi.' },
    })

    return NextResponse.json({
      success: true,
      message: 'Üretim emri iptal edildi. BOM malzemeleri depoya iade edildi.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'İptal işlemi başarısız'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
