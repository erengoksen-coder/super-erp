import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateInvoiceNumber } from '@/lib/utils/codeGenerator'

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
export async function GET(request: NextRequest) {
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
}

// POST: Sevkiyattan fatura oluştur
export async function POST(request: NextRequest) {
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
      JOIN products p ON si.product_id = p.id
      WHERE si.shipment_id = ? AND si.deleted_at IS NULL
      ORDER BY si.created_at
    `).all(shipment_id) as any[]

    if (items.length === 0) {
      return NextResponse.json({ error: 'Sevkiyat kalemi bulunamadı' }, { status: 400 })
    }

    const invoiceId = randomUUID()
    const invoiceNumber = await generateInvoiceNumber(type)
    const invoiceDate = invoice_date || shipment.shipment_date || new Date().toISOString().slice(0, 10)

    const totalAmount = shipment.total_amount || 0
    const taxRate = shipment.tax_rate || 0
    const taxAmount = shipment.tax_amount || 0
    const finalAmount = shipment.final_amount || totalAmount + taxAmount

    db.transaction(() => {
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
    })()

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        shipment_id,
      },
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
