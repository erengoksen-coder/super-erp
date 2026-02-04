import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'

type BomItemRow = {
  quantity: number
  unit: string | null
  fire_percentage: number | null
  unit_price: number
  material_unit: string | null
  material_id: string | null
}

// GET: Fatura detayı
export const GET = withAuth(
  async (
    request: NextRequest,
    user,
    context?: unknown
  ) => {
    try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const invoice = db.prepare(`
      SELECT 
        i.*, 
        a.name as customer_name, 
        a.code as customer_code, 
        a.discount_rate as customer_discount_rate,
        s.shipment_number, 
        s.id as shipment_id
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE i.id = ? AND i.deleted_at IS NULL
    `).get(resolvedParams.id) as any

    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
    }

    // Sevkiyat varsa, end customer name'i al (müşteri bilgisi için)
    let endCustomerName: string | null = null
    if (invoice.shipment_id) {
      const endCustomerRows = db.prepare(`
        SELECT DISTINCT o.customer_name
        FROM product_serial_numbers psn
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN active_orders o ON o.production_order_id = po.id
        WHERE psn.shipment_id = ?
          AND o.customer_name IS NOT NULL
          AND o.customer_name != ''
      `).all(invoice.shipment_id) as Array<{ customer_name?: string | null }>

      const endCustomerNames = endCustomerRows
        .map((row) => (row.customer_name || '').trim())
        .filter((name) => name.length > 0)

      endCustomerName = endCustomerNames.length > 0
        ? Array.from(new Set(endCustomerNames)).join(', ')
        : null
    }

    const items = db.prepare(`
      SELECT ii.*, p.name as product_name, p.sku as product_sku
      FROM invoice_items ii
      JOIN active_products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ? AND ii.deleted_at IS NULL
      ORDER BY ii.created_at
    `).all(resolvedParams.id) as any[]

    // Her zaman BOM'dan fiyat hesapla (eğer BOM yoksa mevcut fiyatı veya selling_price kullan)
    const itemsWithBomPrices = items.map((item) => {
      // BOM'dan fiyat hesapla
      const bomItems = db.prepare(`
        SELECT 
          b.quantity_required as quantity,
          b.unit as unit,
          b.fire_percentage,
          m.unit_price,
          m.unit as material_unit,
          m.id as material_id
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).all(item.product_id) as BomItemRow[]

      // Toplam maliyeti hesapla
      let bomCost = 0
      for (const bomItem of bomItems) {
        const quantityWithFire = bomItem.quantity * (1 + (bomItem.fire_percentage || 0) / 100)
        const fromUnit = (bomItem.unit || bomItem.material_unit || '').toString()
        const toUnit = (bomItem.material_unit || '').toString()
        const factor = resolveUnitFactor(db, bomItem.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const materialUnitPrice = bomItem.unit_price || 0
        bomCost += convertedQuantity * materialUnitPrice
      }

      // Önce BOM maliyetini kullan, yoksa mevcut unit_price'ı kullan, o da yoksa selling_price kullan
      let unitPrice = bomCost > 0 ? bomCost : (item.unit_price && item.unit_price > 0 ? item.unit_price : (() => {
        const product = db.prepare('SELECT selling_price FROM active_products WHERE id = ?').get(item.product_id) as { selling_price?: number } | undefined
        return product?.selling_price || 0
      })())

      const totalPrice = unitPrice * (item.quantity || 0)

      return {
        ...item,
        unit_price: unitPrice,
        total_price: totalPrice
      }
    })

    return NextResponse.json({ 
      ...invoice, 
      items: itemsWithBomPrices,
      end_customer_name: endCustomerName
    })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
)

// DELETE: Faturayı iptal et (soft delete)
export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    context?: unknown
  ) => {
    try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any
    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
    }

    db.transaction(() => {
      db.prepare(`
        UPDATE invoices
        SET status = 'cancelled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(resolvedParams.id)

      db.prepare(`
        UPDATE invoice_items
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE invoice_id = ?
      `).run(resolvedParams.id)
    })()

    return NextResponse.json({ success: true })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }
)
