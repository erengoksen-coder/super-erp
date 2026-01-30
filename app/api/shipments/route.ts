import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateShipmentNumber } from '@/lib/utils/codeGenerator.server'
import { resolveUnitFactor } from '@/lib/units'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_LIST } from '@/lib/api/cache'

type ShipmentRow = {
  id: string
  customer_id: string
  status: string
  shipment_number: string
  shipment_date: string
  total_amount?: number | null
  tax_rate?: number | null
  tax_amount?: number | null
  final_amount?: number | null
  invoice_id?: string | null
  invoice_number?: string | null
  created_at?: string | null
  customer_name?: string | null
  customer_code?: string | null
  item_count?: number | null
  total_quantity?: number | null
  [key: string]: unknown
}

type ShipmentItemRow = {
  id: string
  shipment_id: string
  product_id: string
  quantity: number
  unit_price: number | null
  total_price: number | null
  serial_numbers: string | null
  notes: string | null
  product_name?: string
  product_sku?: string
}

type ShipmentInputItem = {
  product_id: string
  quantity: number
  product_name?: string
  barcodes?: string[]
  serial_numbers?: string[]
  notes?: string
}

type ShipmentCreateInput = {
  customer_id?: string
  shipment_date?: string
  items?: ShipmentInputItem[]
  notes?: string
  total_amount?: number
  tax_rate?: number
}

type CustomerRow = {
  id: string
}

type BomItemRow = {
  quantity: number
  fire_percentage: number | null
  unit_price: number | null
  unit?: string | null
  material_unit?: string | null
  material_id?: string | null
}

type ProductPriceRow = {
  selling_price: number | null
}

type BarcodeRow = {
  barcode: string
}

type ProductNameSkuRow = {
  name: string
  sku: string
}

// GET: Tüm sevkiyatları getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status')
    const completed = searchParams.get('completed')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const db = getDatabase()
    
    let query = `
      SELECT 
        s.*,
        a.name as customer_name,
        a.code as customer_code,
        COUNT(si.id) as item_count,
        SUM(si.quantity) as total_quantity
      FROM shipments s
      JOIN accounts a ON s.customer_id = a.id
      LEFT JOIN shipment_items si ON s.id = si.shipment_id
      WHERE s.deleted_at IS NULL
    `
    const params: string[] = []

    if (customerId) {
      query += ' AND s.customer_id = ?'
      params.push(customerId)
    }

    if (status) {
      query += ' AND s.status = ?'
      params.push(status)
    }

    // Yapılan işlem filtresi (tamamlanan: delivered + in_transit)
    if (completed === 'true') {
      query += ' AND (s.status = ? OR s.status = ?)'
      params.push('delivered', 'in_transit')
    }

    if (startDate) {
      query += ' AND s.shipment_date >= ?'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND s.shipment_date <= ?'
      params.push(endDate)
    }

    query += ' GROUP BY s.id ORDER BY s.shipment_date DESC, s.created_at DESC'

    const shipments = db.prepare(query).all(...params) as ShipmentRow[]

    // Her sevkiyat için kalemleri getir
    const shipmentsWithItems = shipments.map((shipment) => {
      const items = db.prepare(`
        SELECT 
          si.*,
          p.name as product_name,
          p.sku as product_sku
        FROM shipment_items si
        JOIN active_products p ON si.product_id = p.id
        WHERE si.shipment_id = ? AND si.deleted_at IS NULL
        ORDER BY si.created_at
      `).all(shipment.id) as ShipmentItemRow[]

      return {
        ...shipment,
        items,
      }
    })

    return ok(shipmentsWithItems, { headers: CACHE_HEADERS_LIST })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Yeni sevkiyat oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as ShipmentCreateInput
    const { customer_id, shipment_date, items, notes, total_amount, tax_rate } = body

    if (!customer_id || !shipment_date || !items || items.length === 0) {
      return fail('customer_id, shipment_date ve items (en az 1 kalem) gerekli', { status: 400 })
    }

    const db = getDatabase()

    // Müşteri kontrolü
    const customer = db.prepare('SELECT id, balance, risk_limit FROM accounts WHERE id = ? AND type = ? AND deleted_at IS NULL')
      .get(customer_id, 'customer') as (CustomerRow & { balance?: number | null; risk_limit?: number | null }) | undefined
    if (!customer) {
      return fail('Müşteri bulunamadı', { status: 404 })
    }

    const shipmentId = randomUUID()
    const shipmentNumber = await generateShipmentNumber()

    // Ürün fiyatlarını BOM'dan hesapla
    let calculatedTotalAmount = 0
    const itemPrices: { [key: string]: number } = {}
    
    if (items && items.length > 0) {
      for (const item of items) {
        // BOM maliyetini hesapla
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
          const unitPrice = bomItem.unit_price || 0
          bomCost += convertedQuantity * unitPrice
        }

        // Eğer BOM maliyeti yoksa, selling_price kullan
        const unitPrice = bomCost > 0 ? bomCost : (() => {
          const product = db.prepare('SELECT selling_price FROM active_products WHERE id = ?').get(item.product_id) as ProductPriceRow | undefined
          return product?.selling_price || 0
        })()

        const itemTotal = unitPrice * (item.quantity || 0)
        calculatedTotalAmount += itemTotal
        itemPrices[item.product_id] = unitPrice
      }
    }
    
    // Eğer total_amount gönderilmişse onu kullan, yoksa hesaplananı kullan
    const finalTotalAmount = total_amount || calculatedTotalAmount
    const finalTaxRate = tax_rate || 0
    const taxAmount = (finalTotalAmount * finalTaxRate) / 100
    const finalAmount = finalTotalAmount + taxAmount

    const currentBalance = customer.balance || 0
    const riskLimit = customer.risk_limit || 0
    if (riskLimit > 0 && currentBalance + finalAmount > riskLimit) {
      return fail(`Risk limiti aşılıyor. Limit: ${riskLimit}, Mevcut: ${currentBalance}, Yeni: ${currentBalance + finalAmount}`, { status: 400 })
    }

    db.transaction(() => {
      // Sevkiyat kaydı oluştur
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)

      db.prepare(`
        INSERT INTO shipments 
        (id, shipment_number, customer_id, shipment_date, total_quantity, total_amount, tax_rate, tax_amount, final_amount, notes, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'delivered')
      `).run(
        shipmentId, 
        shipmentNumber, 
        customer_id, 
        shipment_date, 
        totalQuantity, 
        finalTotalAmount,
        finalTaxRate,
        taxAmount,
        finalAmount,
        notes || ''
      )
      
      // Müşteri cari hesabına toplam borç yaz
      db.prepare(`
        UPDATE accounts
        SET balance = balance + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(finalAmount, customer_id)

      // Sevkiyat kalemlerini ekle ve ürünleri sevkiyata bağla
      for (const item of items) {
        const itemId = randomUUID()
        const barcodes = item.barcodes || item.serial_numbers || []
        
        // Barkod sayısı kontrolü - ZORUNLU
        if (barcodes.length !== item.quantity) {
          throw new Error(`${item.product_name || 'Ürün'} için ${item.quantity} adet gerekli, ${barcodes.length} adet barkod girildi. Lütfen tüm barkodları girin.`)
        }

        // Barkodların geçerliliğini kontrol et
        if (barcodes.length > 0) {
          const placeholders = barcodes.map(() => '?').join(',')
          const existingBarcodes = db.prepare(`
            SELECT barcode FROM product_serial_numbers
            WHERE barcode IN (${placeholders})
              AND product_id = ?
              AND ready_for_shipment = 1
              AND (shipment_id IS NULL OR shipment_id = '')
          `).all(...barcodes, item.product_id) as BarcodeRow[]

          if (existingBarcodes.length !== barcodes.length) {
            const foundBarcodes = existingBarcodes.map(b => b.barcode)
            const missingBarcodes = barcodes.filter(b => !foundBarcodes.includes(b))
            throw new Error(`${item.product_name || 'Ürün'} için geçersiz veya sevk edilebilir olmayan barkodlar: ${missingBarcodes.join(', ')}`)
          }
        }

        const serialNumbersJson = barcodes.length > 0 ? JSON.stringify(barcodes) : null

        // Kalem fiyatını hesapla (BOM fiyatı × adet)
        const unitPrice = itemPrices[item.product_id] || 0
        const itemTotal = unitPrice * (item.quantity || 0)

        db.prepare(`
          INSERT INTO shipment_items 
          (id, shipment_id, product_id, quantity, unit_price, total_price, serial_numbers, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          shipmentId,
          item.product_id,
          item.quantity,
          unitPrice,
          itemTotal,
          serialNumbersJson,
          item.notes || ''
        )

        // Ürün bilgilerini al
        const product = db.prepare('SELECT name, sku FROM active_products WHERE id = ?').get(item.product_id) as ProductNameSkuRow | undefined
        const productName = product?.name || item.product_name || 'Ürün'
        const productSku = product?.sku || ''

        // Her kalem için cari hesaba ayrı kayıt ekle (BOM fiyatı üzerinden)
        const transactionId = randomUUID()
        const description = `Sevkiyat: ${shipmentNumber} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${unitPrice.toFixed(2)} ₺ | Toplam: ${itemTotal.toFixed(2)} ₺`
        
        db.prepare(`
          INSERT INTO account_transactions 
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'debit', ?, 'shipment_item', ?, ?, CURRENT_TIMESTAMP)
        `).run(
          transactionId,
          customer_id,
          itemTotal,
          itemId,
          description
        )

        // Barkodları sevkiyata bağla ve durumunu güncelle
        if (barcodes.length > 0) {
          const placeholders = barcodes.map(() => '?').join(',')
          try {
            db.prepare(`
              UPDATE product_serial_numbers
              SET shipment_id = ?,
                  status = 'shipped',
                  ready_for_shipment = 0,
                  updated_at = CURRENT_TIMESTAMP
              WHERE barcode IN (${placeholders})
                AND product_id = ?
                AND ready_for_shipment = 1
            `).run(shipmentId, ...barcodes, item.product_id)
            
            // Ürün stok miktarını düş (mamül depodan düşsün)
            db.prepare(`
              UPDATE products
              SET stock_amount = stock_amount - ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(item.quantity, item.product_id)
          } catch (e: any) {
            // updated_at kolonu yoksa, sadece diğer alanları güncelle
            if (e.message?.includes('no such column: updated_at')) {
              db.prepare(`
                UPDATE product_serial_numbers
                SET shipment_id = ?,
                    status = 'shipped',
                    ready_for_shipment = 0
                WHERE barcode IN (${placeholders})
                  AND product_id = ?
                  AND ready_for_shipment = 1
              `).run(shipmentId, ...barcodes, item.product_id)
              
              // Ürün stok miktarını düş (mamül depodan düşsün)
              db.prepare(`
                UPDATE products
                SET stock_amount = stock_amount - ?
                WHERE id = ?
              `).run(item.quantity, item.product_id)
            } else {
              throw e
            }
          }
        }
      }
    })()

    // Oluşturulan sevkiyatı getir
    const shipment = db.prepare(`
      SELECT 
        s.*,
        a.name as customer_name,
        a.code as customer_code,
        a.address as customer_address,
        a.phone as customer_phone,
        a.email as customer_email
      FROM shipments s
      JOIN accounts a ON s.customer_id = a.id
      WHERE s.id = ?
    `).get(shipmentId) as ShipmentRow | undefined

    const shipmentItems = db.prepare(`
      SELECT 
        si.*,
        p.name as product_name,
        p.sku as product_sku
      FROM shipment_items si
      JOIN active_products p ON si.product_id = p.id
      WHERE si.shipment_id = ?
    `).all(shipmentId) as ShipmentItemRow[]

    return ok({
      ...shipment,
      items: shipmentItems,
    }, { status: 201 })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

