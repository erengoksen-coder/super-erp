import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

function generateQuotationNumber(db: any): string {
    const year = new Date().getFullYear()
    const prefix = `TKL-${year}`
    const last = db.prepare(`SELECT quotation_number FROM quotations WHERE quotation_number LIKE ? ORDER BY quotation_number DESC LIMIT 1`).get(`${prefix}-%`) as any
    if (!last?.quotation_number) return `${prefix}-001`
    const lastNum = parseInt(last.quotation_number.split('-').pop() || '0', 10)
    return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`
}

// GET: Teklifleri listele
export const GET = withAuth(async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const customerId = searchParams.get('customer_id')
        const search = searchParams.get('search')?.trim()

        const db = getDatabase()
        const where: string[] = ['q.deleted_at IS NULL']
        const params: any[] = []

        if (status) { where.push('q.status = ?'); params.push(status) }
        if (customerId) { where.push('q.customer_id = ?'); params.push(customerId) }
        if (search) {
            where.push('(q.quotation_number LIKE ? OR a.name LIKE ?)')
            params.push(`%${search}%`, `%${search}%`)
        }

        const rows = db.prepare(`
      SELECT q.*, a.name as customer_name, a.code as customer_code,
        (SELECT COUNT(*) FROM quotation_items qi WHERE qi.quotation_id = q.id) as item_count
      FROM quotations q
      LEFT JOIN accounts a ON q.customer_id = a.id
      WHERE ${where.join(' AND ')}
      ORDER BY q.created_at DESC
      LIMIT 200
    `).all(...params) as any[]

        return ok(rows)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// POST: Yeni teklif oluştur
export const POST = withAuth(async (request: NextRequest, user: any) => {
    try {
        const body = await request.json()
        const { customer_id, quotation_date, valid_until, notes, terms, items, discount_rate, tax_rate } = body
        if (!customer_id) return fail('Müşteri seçimi gerekli', { status: 400 })

        const db = getDatabase()
        const id = randomUUID()
        const quotationNumber = generateQuotationNumber(db)
        const now = new Date().toISOString()
        const itemList = Array.isArray(items) ? items : []

        const subtotal = itemList.reduce((s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
        const discRate = Number(discount_rate) || 0
        const discAmount = subtotal * (discRate / 100)
        const tRate = Number(tax_rate) || 20
        const taxAmt = (subtotal - discAmount) * (tRate / 100)
        const totalAmt = subtotal - discAmount + taxAmt

        db.transaction(() => {
            db.prepare(`
        INSERT INTO quotations (id, quotation_number, customer_id, quotation_date, valid_until, status, subtotal, discount_rate, discount_amount, tax_rate, tax_amount, total_amount, notes, terms, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, quotationNumber, customer_id, quotation_date || now.slice(0, 10), valid_until || null, subtotal, discRate, discAmount, tRate, taxAmt, totalAmt, notes || null, terms || null, user?.userId || null, now, now)

            const ins = db.prepare(`INSERT INTO quotation_items (id, quotation_id, product_id, product_name, product_sku, description, quantity, unit, unit_price, discount_rate, tax_rate, total_price, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
            itemList.forEach((item: any, idx: number) => {
                const qty = Number(item.quantity) || 0
                const price = Number(item.unit_price) || 0
                ins.run(randomUUID(), id, item.product_id || null, item.product_name || null, item.product_sku || null, item.description || null, qty, item.unit || 'ADET', price, Number(item.discount_rate) || 0, Number(item.tax_rate) || tRate, qty * price, idx)
            })
        })()

        return NextResponse.json({ success: true, quotation: { id, quotation_number: quotationNumber } }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
