import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateNextCode } from '@/lib/utils/codeGenerator'

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
    const body = await request.json() as InvoiceCreateInput
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

    const totalAmount = shipment.total_amount || 0
    const taxRate = shipment.tax_rate || 0
    const taxAmount = shipment.tax_amount || 0
    const finalAmount = shipment.final_amount || totalAmount + taxAmount

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
          db.prepare(`
            INSERT INTO invoices
            (id, invoice_number, shipment_id, customer_id, invoice_date, type, status, total_amount, tax_rate, tax_amount, final_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?, ?, ?)
          `).run(
            invoiceId,
            invoiceNumber,
            shipment_id,
            shipment.customer_id,
            invoiceDate,
            type,
            totalAmount,
            taxRate,
            taxAmount,
            finalAmount,
            notes || shipment.notes || null
          )

          const insertItem = db.prepare(`
            INSERT INTO invoice_items (id, invoice_id, product_id, quantity, unit_price, total_price, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
          for (const item of items) {
            insertItem.run(
              randomUUID(),
              invoiceId,
              item.product_id,
              item.quantity,
              item.unit_price || 0,
              item.total_price || 0,
              item.notes || null
            )
          }

          db.prepare(`
            UPDATE shipments
            SET invoice_id = ?, invoice_number = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(invoiceId, invoiceNumber, shipment_id)

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
