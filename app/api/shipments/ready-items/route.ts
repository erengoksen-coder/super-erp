import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type ReadyItemRow = {
  id: string
  product_id: string
  barcode: string
  serial_number: string
  status: string | null
  ready_for_shipment: number
  shipment_id: string | null
  customer_id: string | null
  created_at: string
  product_name?: string
  product_sku?: string
  production_order_number?: string | null
  customer_name?: string | null
  customer_code?: string | null
}

type ReadyItemsGrouped = {
  product_id: string
  product_name?: string
  product_sku?: string
  total_count: number
  items: Array<{
    id: string
    barcode: string
    serial_number: string
    production_order_number?: string | null
  }>
}

type ReadyItemUpdateInput = {
  barcode?: string
  customer_id?: string
  ready?: boolean
}

// GET: Müşteriye ait sevk edilebilir ürünleri getir (customer_id yoksa tümünü getir)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const barcode = searchParams.get('barcode')

    const db = getDatabase()

    if (barcode) {
      const item = db.prepare(`
        SELECT 
          psn.*,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE (psn.barcode = ? OR psn.serial_number = ?)
          AND psn.ready_for_shipment = 1
          AND (psn.status = 'in_stock' OR psn.status = 'available' OR psn.status IS NULL OR psn.status = '')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        LIMIT 1
      `).get(barcode, barcode) as ReadyItemRow | undefined

      if (!item) {
        return fail('Sevke hazır ürün bulunamadı', { status: 404 })
      }

      return ok({ item })
    }

    let readyItems: ReadyItemRow[]
    
    if (customerId) {
      // Belirli bir müşteri için
      readyItems = db.prepare(`
        SELECT 
          psn.*,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE psn.ready_for_shipment = 1
          AND (psn.status = 'in_stock' OR psn.status = 'available' OR psn.status IS NULL OR psn.status = '')
          AND (psn.customer_id = ? OR psn.customer_id IS NULL)
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        ORDER BY psn.customer_id = ? DESC, p.sku ASC, psn.created_at ASC
      `).all(customerId, customerId) as ReadyItemRow[]
    } else {
      // Tüm müşteriler için (müşteriye göre grupla)
      readyItems = db.prepare(`
        SELECT 
          psn.*,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN active_products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE psn.ready_for_shipment = 1
          AND (psn.status = 'in_stock' OR psn.status = 'available' OR psn.status IS NULL OR psn.status = '')
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        ORDER BY COALESCE(psn.customer_id, 'no-customer'), p.sku ASC, psn.created_at ASC
      `).all() as ReadyItemRow[]
    }

    if (customerId) {
      // Belirli müşteri için - ürün bazlı grupla
      const groupedByProduct = readyItems.reduce<Record<string, ReadyItemsGrouped>>((acc, item) => {
        const key = item.product_id
        if (!acc[key]) {
          acc[key] = {
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            total_count: 0,
            items: [],
          }
        }
        acc[key].total_count++
        acc[key].items.push({
          id: item.id,
          barcode: item.barcode,
          serial_number: item.serial_number,
          production_order_number: item.production_order_number,
        })
        return acc
      }, {})

      return ok({
        items: Object.values(groupedByProduct),
        total_items: readyItems.length,
      })
    } else {
      // Tüm müşteriler için - ham veriyi döndür (frontend'de grupla)
      return ok({
        items: readyItems,
        total_items: readyItems.length,
      })
    }
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Ürünü sevk edilebilir olarak işaretle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as ReadyItemUpdateInput
    const { barcode, customer_id, ready } = body

    if (!barcode) {
      return fail('barcode gerekli', { status: 400 })
    }

    const db = getDatabase()

    // Barkod ile ürünü bul
    const product = db.prepare(`
      SELECT * FROM product_serial_numbers 
      WHERE barcode = ? OR serial_number = ?
    `).get(barcode, barcode) as ReadyItemRow | undefined

    if (!product) {
      return fail('Barkod bulunamadı', { status: 404 })
    }

    // Sevk edilebilir durumunu güncelle
    const readyValue = ready ? 1 : 0
    const customerIdValue = ready && customer_id ? customer_id : null

    // updated_at kolonu varsa güncelle, yoksa sadece diğer alanları güncelle
    try {
      db.prepare(`
        UPDATE product_serial_numbers
        SET ready_for_shipment = ?,
            customer_id = COALESCE(?, customer_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(readyValue, customerIdValue, product.id)
    } catch (e: any) {
      // updated_at kolonu yoksa, sadece diğer alanları güncelle
      if (e.message?.includes('no such column: updated_at')) {
        db.prepare(`
          UPDATE product_serial_numbers
          SET ready_for_shipment = ?,
              customer_id = COALESCE(?, customer_id)
          WHERE id = ?
        `).run(readyValue, customerIdValue, product.id)
      } else {
        throw e
      }
    }

    return ok(null, {
      message: ready ? 'Ürün sevk edilebilir olarak işaretlendi' : 'İşaret kaldırıldı',
    })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

