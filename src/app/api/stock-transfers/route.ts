import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
    try {
        const db = getDatabase()
        const url = new URL(req.url)
        const status = url.searchParams.get('status')

        let sql = `SELECT st.*, 
      (SELECT COUNT(*) FROM stock_transfer_items WHERE transfer_id = st.id) as item_count,
      (SELECT COALESCE(SUM(quantity), 0) FROM stock_transfer_items WHERE transfer_id = st.id) as total_quantity
      FROM stock_transfers st WHERE st.deleted_at IS NULL`
        const params: any[] = []

        if (status && status !== 'all') { sql += ` AND st.status = ?`; params.push(status) }
        sql += ` ORDER BY st.created_at DESC LIMIT 200`

        const rows = db.prepare(sql).all(...params)
        return NextResponse.json({ data: rows })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const db = getDatabase()
        const body = await req.json()

        if (!body.from_warehouse_id || !body.to_warehouse_id) {
            return NextResponse.json({ error: 'Kaynak ve hedef depo zorunlu' }, { status: 400 })
        }
        if (body.from_warehouse_id === body.to_warehouse_id) {
            return NextResponse.json({ error: 'Kaynak ve hedef depo aynı olamaz' }, { status: 400 })
        }

        // Transfer numara üret
        const last = db.prepare(`SELECT transfer_number FROM stock_transfers ORDER BY created_at DESC LIMIT 1`).get() as any
        let nextNum = 1
        if (last?.transfer_number) {
            const match = last.transfer_number.match(/(\d+)$/)
            if (match) nextNum = parseInt(match[1]) + 1
        }
        const transferNumber = `TRN-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`

        // Depo isimlerini al
        const fromWh = db.prepare(`SELECT name FROM warehouses WHERE id = ?`).get(body.from_warehouse_id) as any
        const toWh = db.prepare(`SELECT name FROM warehouses WHERE id = ?`).get(body.to_warehouse_id) as any

        const id = randomUUID()
        db.prepare(`
      INSERT INTO stock_transfers (id, transfer_number, from_warehouse_id, to_warehouse_id, from_warehouse_name, to_warehouse_name, transfer_date, status, notes, transferred_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, transferNumber, body.from_warehouse_id, body.to_warehouse_id,
            fromWh?.name || '', toWh?.name || '',
            body.transfer_date || new Date().toISOString(), 'draft',
            body.notes || null, body.transferred_by || null)

        // Kalem ekle
        if (Array.isArray(body.items)) {
            const insertItem = db.prepare(`
        INSERT INTO stock_transfer_items (id, transfer_id, product_id, product_name, quantity, unit)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
            for (const item of body.items) {
                insertItem.run(randomUUID(), id, item.product_id, item.product_name || '', item.quantity || 0, item.unit || 'adet')
            }
        }

        return NextResponse.json({ data: { id, transfer_number: transferNumber, message: 'Transfer oluşturuldu' } }, { status: 201 })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
