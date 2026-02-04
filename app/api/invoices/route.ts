import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateNextCode } from '@/lib/utils/codeGenerator'
import { resolveUnitFactor } from '@/lib/units'

type InvoiceRow = {
  id: string
  invoice_number: string
  shipment_id: string | null
  customer_id: string
  invoice_date: string
  type: string
  status: string
  total_amount: number
  tax_rate: number
  tax_amount: number
  final_amount: number
  notes?: string | null
  customer_name?: string | null
  customer_code?: string | null
  shipment_number?: string | null
}

type InvoiceCreateInput = {
  shipment_id?: string
  invoice_date?: string
  type?: 'sale' | 'purchase'
  notes?: string
}

// GET: Faturaları listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const db = getDatabase()
    let query = `
      SELECT 
        i.*,
        a.name as customer_name,
        a.code as customer_code,
        s.shipment_number
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE i.deleted_at IS NULL
    `
    const params: string[] = []

    if (customerId) {
      query += ' AND i.customer_id = ?'
      params.push(customerId)
    }
    if (status) {
      query += ' AND i.status = ?'
      params.push(status)
    }
    if (type) {
      query += ' AND i.type = ?'
      params.push(type)
    }
    if (startDate) {
      query += ' AND i.invoice_date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      query += ' AND i.invoice_date <= ?'
      params.push(endDate)
    }

    query += ' ORDER BY i.invoice_date DESC, i.created_at DESC'
    const invoices = db.prepare(query).all(...params) as InvoiceRow[]
    return NextResponse.json(invoices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Sevkiyattan fatura oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as InvoiceCreateInput
    const { shipment_id, invoice_date, type = 'sale', notes } = body

    if (!shipment_id) {
      return NextResponse.json({ error: 'shipment_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()

    const shipment = db.prepare(`
      SELECT * FROM shipments
      WHERE id = ? AND deleted_at IS NULL
    `).get(shipment_id) as any
    if (!shipment) {
      return NextResponse.json({ error: 'Sevkiyat bulunamadı' }, { status: 404 })
    }
    if (shipment.invoice_id) {
      return NextResponse.json({ error: 'Bu sevkiyat zaten faturalanmış' }, { status: 400 })
    }

    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku as product_sku
      FROM shipment_items si
      JOIN active_products p ON si.product_id = p.id
      WHERE si.shipment_id = ? AND si.deleted_at IS NULL
      ORDER BY si.created_at
    `).all(shipment_id) as any[]

    if (items.length === 0) {
      return NextResponse.json({ error: 'Sevkiyat kalemi bulunamadı' }, { status: 400 })
    }

    const invoiceDate = invoice_date || shipment.shipment_date || new Date().toISOString().slice(0, 10)

    // Cari bilgilerini al (iskonto oranı için)
    const customer = db.prepare(`
      SELECT id, discount_rate, balance, risk_limit
      FROM accounts
      WHERE id = ?
    `).get(shipment.customer_id) as { id: string; discount_rate?: number; balance?: number; risk_limit?: number } | undefined

    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 })
    }

    // Önce BOM fiyatlarını hesapla ve toplam tutarı bul (HER ZAMAN BOM'dan hesapla)
    let baseTotalAmount = 0
    const itemsWithBomPrices: Array<{
      product_id: string
      quantity: number
      unit_price: number
      total_price: number
      notes?: string | null
    }> = []

    for (const item of items) {
      // Her zaman BOM'dan fiyat hesapla
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
      `).all(item.product_id) as Array<{
        quantity: number
        unit: string | null
        fire_percentage: number | null
        unit_price: number
        material_unit: string | null
        material_id: string | null
      }>

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

      // BOM maliyeti varsa kullan, yoksa mevcut unit_price'ı kullan, o da yoksa selling_price kullan
      let unitPrice = bomCost > 0 ? bomCost : (item.unit_price && item.unit_price > 0 ? item.unit_price : (() => {
        const product = db.prepare('SELECT selling_price FROM active_products WHERE id = ?').get(item.product_id) as { selling_price?: number } | undefined
        return product?.selling_price || 0
      })())
      
      const totalPrice = unitPrice * (item.quantity || 0)
      
      baseTotalAmount += totalPrice
      itemsWithBomPrices.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: item.notes || null
      })
    }

    // İskonto hesapla
    const discountRate = customer.discount_rate || 0
    const discountAmount = (baseTotalAmount * discountRate) / 100
    const amountAfterDiscount = baseTotalAmount - discountAmount
    
    const taxRate = shipment.tax_rate || 0
    const taxAmount = (amountAfterDiscount * taxRate) / 100
    const finalAmount = amountAfterDiscount + taxAmount

    const getNextInvoiceNumber = () => {
      const prefix = type === 'sale' ? 'SAT' : 'ALI'
      const year = new Date().getFullYear()
      const prefixWithYear = `${prefix}-${year}`
      const row = db.prepare(`
        SELECT invoice_number FROM invoices
        WHERE invoice_number LIKE ?
        ORDER BY invoice_number DESC
        LIMIT 1
      `).get(`${prefixWithYear}-%`) as { invoice_number?: string } | undefined
      return generateNextCode(row?.invoice_number || null, { prefix: prefixWithYear, padding: 3 })
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const invoiceId = randomUUID()
      try {
        const result = db.transaction(() => {
          const invoiceNumber = getNextInvoiceNumber()
          
          // Fatura kaydını oluştur (iskonto bilgisi ile)
          db.prepare(`
            INSERT INTO invoices
            (id, invoice_number, shipment_id, customer_id, invoice_date, type, status, total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?)
          `).run(
            invoiceId,
            invoiceNumber,
            shipment_id,
            shipment.customer_id,
            invoiceDate,
            type,
            amountAfterDiscount, // İskonto sonrası tutar
            discountRate,
            discountAmount,
            taxRate,
            taxAmount,
            finalAmount,
            notes || shipment.notes || null
          )

          // Fatura kalemlerini ekle (BOM fiyatları ile)
          const insertItem = db.prepare(`
            INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total_price, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          for (const item of itemsWithBomPrices) {
            insertItem.run(
              randomUUID(),
              invoiceId,
              item.product_id,
              item.quantity,
              item.unit_price,
              item.total_price,
              item.notes || null
            )
          }

          db.prepare(`
            UPDATE shipments
            SET invoice_id = ?, invoice_number = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(invoiceId, invoiceNumber, shipment_id)

          // Fatura oluşturulduğunda cari hesaba transaction yazılmaz
          // Çünkü sevkiyat oluşturulurken zaten cari hesaba borç yazılmış (iskonto düşülmüş tutar ile)
          // Fatura sadece belge olarak kaydedilir, cari hesap işlemi sevkiyat üzerinden yapılır

          return { invoiceId, invoiceNumber }
        })()

        return NextResponse.json({
          success: true,
          invoice: {
            id: result.invoiceId,
            invoice_number: result.invoiceNumber,
            shipment_id,
          },
        }, { status: 201 })
      } catch (error: any) {
        const message = String(error?.message || '')
        if (message.includes('UNIQUE') && message.includes('invoice_number') && attempt < 2) {
          continue
        }
        throw error
      }
    }

    return NextResponse.json({ error: 'Fatura numarası oluşturulamadı' }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

