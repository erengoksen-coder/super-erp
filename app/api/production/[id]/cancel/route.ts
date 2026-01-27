import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Üretim emrini iptal et ve malzemeleri stoka geri ekle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const orderId = resolvedParams.id

    // Üretim emri bilgilerini al
    const order = db.prepare(`
      SELECT * FROM production_orders WHERE id = ?
    `).get(orderId) as any

    if (!order) {
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404 })
    }

    // Zaten iptal edilmiş mi kontrol et
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Bu üretim emri zaten iptal edilmiş' }, { status: 400 })
    }

    // Üretim emri tamamlanmışsa iptal edilemez
    if (order.status === 'completed') {
      return NextResponse.json({ error: 'Tamamlanmış üretim emirleri iptal edilemez' }, { status: 400 })
    }

    // BOM malzemelerini al
    const bom = db.prepare(`
      SELECT 
        b.material_id,
        b.quantity_required,
        COALESCE(b.fire_percentage, 0) as fire_percentage,
        m.name as material_name,
        m.unit
      FROM bom b
      JOIN materials m ON b.material_id = m.id
      WHERE b.product_id = ?
    `).all(order.product_id) as any[]

    // Stok hareketlerini al (bu üretim emri için)
    const stockMovements = db.prepare(`
      SELECT * FROM stock_movements 
      WHERE reference_type = 'production_order' AND reference_id = ?
    `).all(orderId) as any[]

    db.transaction(() => {
      // Her BOM malzemesi için stoku geri ekle
      for (const bomItem of bom) {
        const firePercentage = bomItem.fire_percentage || 0
        const quantityWithFire = bomItem.quantity_required * (1 + firePercentage / 100)
        const totalRequired = quantityWithFire * order.quantity

        // Stoku geri ekle
        db.prepare(`
          UPDATE materials
          SET stock_amount = stock_amount + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(totalRequired, bomItem.material_id)

        // Geri alma stok hareketi oluştur
        const movementId = randomUUID()
        db.prepare(`
          INSERT INTO stock_movements 
          (id, material_id, movement_type, quantity, reference_type, reference_id, notes)
          VALUES (?, ?, 'in', ?, 'production_order_cancel', ?, ?)
        `).run(
          movementId,
          bomItem.material_id,
          totalRequired,
          orderId,
          `Üretim emri iptali: ${order.order_number} - ${bomItem.material_name} (Fire: ${firePercentage}%) - Geri eklenen: ${totalRequired} ${bomItem.unit}`
        )
      }

      // Üretilen ürün barkodlarını sil (eğer varsa)
      const barcodes = db.prepare(`
        SELECT id FROM product_serial_numbers WHERE production_order_id = ?
      `).all(orderId) as any[]

      if (barcodes.length > 0) {
        // Ürün stok miktarını düş (üretilen ürünler stoktan çıkarılsın)
        db.prepare(`
          UPDATE products
          SET stock_amount = stock_amount - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(order.quantity, order.product_id)

        // Barkodları sil
        db.prepare(`
          DELETE FROM product_serial_numbers WHERE production_order_id = ?
        `).run(orderId)
      }

      // Üretim emri durumunu iptal olarak işaretle
      db.prepare(`
        UPDATE production_orders
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(orderId)
    })()

    return NextResponse.json({
      success: true,
      message: 'Üretim emri başarıyla iptal edildi ve malzemeler stoka geri eklendi'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
