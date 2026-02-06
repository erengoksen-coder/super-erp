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
    
    // discount_rate kolonu yoksa 0 olarak kabul et
    let invoice: any
    try {
      invoice = db.prepare(`
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
    } catch (e: any) {
      // discount_rate kolonu yoksa, sadece diğer kolonları al
      if (e.message?.includes('no such column: discount_rate') || e.message?.includes('a.discount_rate')) {
        invoice = db.prepare(`
          SELECT 
            i.*, 
            a.name as customer_name, 
            a.code as customer_code, 
            0 as customer_discount_rate,
            s.shipment_number, 
            s.id as shipment_id
          FROM invoices i
          JOIN accounts a ON i.customer_id = a.id
          LEFT JOIN shipments s ON i.shipment_id = s.id
          WHERE i.id = ? AND i.deleted_at IS NULL
        `).get(resolvedParams.id) as any
        if (invoice) {
          invoice.customer_discount_rate = 0
        }
      } else {
        throw e
      }
    }

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

    // Sevkiyat varsa sevk kalemindeki birim fiyatı kullan (sevk fişi = BOM; fatura ile birebir tutsun)
    let shipmentItemPrices: Record<string, number> = {}
    if (invoice.shipment_id) {
      const shipmentItems = db.prepare(`
        SELECT product_id, unit_price FROM shipment_items
        WHERE shipment_id = ? AND deleted_at IS NULL
      `).all(invoice.shipment_id) as Array<{ product_id: string; unit_price: number }>
      for (const si of shipmentItems) {
        if (si.unit_price != null && si.unit_price > 0) {
          shipmentItemPrices[si.product_id] = si.unit_price
        }
      }
    }

    // BOM'dan fiyat hesapla; sevk varsa önce sevk kalem fiyatı (BOM ile aynı kaynak)
    const itemsWithBomPrices = items.map((item) => {
      const fromShipment = invoice.shipment_id && shipmentItemPrices[item.product_id] != null && shipmentItemPrices[item.product_id] > 0
        ? shipmentItemPrices[item.product_id]
        : null
      if (fromShipment != null) {
        const totalPrice = fromShipment * (item.quantity || 0)
        return { ...item, bom_unit_price: fromShipment, bom_total_price: totalPrice }
      }
      // BOM'dan fiyat hesapla
      let bomItems = db.prepare(`
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

      // Eğer aktif versiyonda BOM bulunamadıysa, tüm versiyonlarda ara
      if (bomItems.length === 0) {
        bomItems = db.prepare(`
          SELECT 
            b.quantity_required as quantity,
            b.unit as unit,
            b.fire_percentage,
            m.unit_price,
            m.unit as material_unit,
            m.id as material_id
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ? AND b.deleted_at IS NULL
          ORDER BY bv.version_no DESC
          LIMIT 100
        `).all(item.product_id) as BomItemRow[]
      }

      // Eğer hala BOM bulunamadıysa, ürün adına göre eşleştirme yap
      if (bomItems.length === 0) {
        const product = db.prepare('SELECT id, name, sku FROM active_products WHERE id = ?').get(item.product_id) as { id: string; name: string; sku: string } | undefined
        if (product) {
          // Ürün adından SKU kısmını çıkar (örn: "PRD-127652 - ATLAS ÜÇLÜ" -> "ATLAS ÜÇLÜ")
          const extractProductName = (fullName: string): string => {
            if (!fullName) return ''
            if (fullName.includes(' - ')) {
              const parts = fullName.split(' - ')
              return parts[parts.length - 1].trim()
            }
            const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
            if (skuMatch) {
              return skuMatch[1].trim()
            }
            return fullName.trim()
          }

          const productNameOnly = extractProductName(product.name)
          
          if (productNameOnly) {
            // Aynı isimli ürünlerde BOM ara
            const fallbackProducts = db.prepare(`
              SELECT DISTINCT p.id, p.name, p.sku
              FROM active_products p
              JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
              JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
              WHERE p.id != ? AND (
                p.name = ? OR 
                p.name LIKE ? OR
                (p.name LIKE ? AND p.name NOT LIKE ?)
              )
              GROUP BY p.id, p.name, p.sku
              ORDER BY COUNT(b.id) DESC
              LIMIT 1
            `).all(
              product.id,
              productNameOnly,
              `% - ${productNameOnly}%`,
              `%${productNameOnly}%`,
              `% - %${productNameOnly}%`
            ) as Array<{ id: string; name: string; sku: string }>

            if (fallbackProducts.length > 0) {
              const fallbackProduct = fallbackProducts[0]
              console.log(`[Fatura Detay BOM] Fallback: ${product.name} (${product.id}) → ${fallbackProduct.name} (${fallbackProduct.id})`)
              
              // Fallback ürün için BOM al
              bomItems = db.prepare(`
                SELECT 
                  b.quantity_required as quantity,
                  b.unit as unit,
                  b.fire_percentage,
                  m.unit_price,
                  m.unit as material_unit,
                  m.id as material_id
                FROM bom b
                JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
                JOIN materials m ON b.material_id = m.id
                WHERE b.product_id = ? AND b.deleted_at IS NULL
                ORDER BY bv.version_no DESC
                LIMIT 100
              `).all(fallbackProduct.id) as BomItemRow[]
            }
          }
        }
      }

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
      return { ...item, bom_unit_price: unitPrice, bom_total_price: totalPrice }
    })

    // Fatura BOM ile tutsun: Kalem fiyatlarını BOM'dan alıp fatura iskonto oranını uygula
    const discountRate = invoice.discount_rate ?? invoice.customer_discount_rate ?? 0
    const taxRate = invoice.tax_rate ?? 0
    const itemsWithBomApplied = itemsWithBomPrices.map((item) => {
      const totalPrice = item.bom_total_price ?? (item.unit_price * (item.quantity || 0))
      const itemDiscountAmount = (totalPrice * discountRate) / 100
      const itemTotalAfterDiscount = totalPrice - itemDiscountAmount
      const itemUnitAfterDiscount = (item.quantity || 0) > 0 ? itemTotalAfterDiscount / (item.quantity || 0) : 0
      return {
        ...item,
        unit_price: itemUnitAfterDiscount,
        total_price: itemTotalAfterDiscount,
        bom_unit_price: item.bom_unit_price,
        bom_total_price: item.bom_total_price
      }
    })

    // Toplamları BOM tabanlı kalemlere göre güncelle (gösterim tutarlı olsun)
    const totalAmount = itemsWithBomApplied.reduce((sum, i) => sum + (i.bom_total_price || 0), 0)
    const discountAmount = (totalAmount * discountRate) / 100
    const amountAfterDiscount = totalAmount - discountAmount
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount

    return NextResponse.json(
      { 
        ...invoice, 
        total_amount: totalAmount,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        final_amount: finalAmount,
        items: itemsWithBomApplied,
        end_customer_name: endCustomerName
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    )
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
