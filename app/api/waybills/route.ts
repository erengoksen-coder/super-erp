import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { PAGINATION } from '@/lib/constants'

// İrsaliye numarası oluştur
function generateWaybillNumber(db: any): string {
    const year = new Date().getFullYear()
    const prefix = `IRS-${year}`
    const last = db.prepare(
        `SELECT waybill_number FROM waybills WHERE waybill_number LIKE ? ORDER BY waybill_number DESC LIMIT 1`
    ).get(`${prefix}-%`) as { waybill_number?: string } | undefined
    if (!last?.waybill_number) return `${prefix}-001`
    const lastNum = parseInt(last.waybill_number.split('-').pop() || '0', 10)
    return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`
}

// GET: İrsaliyeleri listele
export const GET = withAuth(async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customer_id')
        const status = searchParams.get('status')
        const shipmentId = searchParams.get('shipment_id')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const search = searchParams.get('search')?.trim()
        const limit = Math.min(
            Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT), 10) || PAGINATION.DEFAULT_LIMIT),
            PAGINATION.MAX_LIMIT
        )
        const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

        const db = getDatabase()
        const where: string[] = ['w.deleted_at IS NULL']
        const params: any[] = []

        if (customerId) { where.push('w.customer_id = ?'); params.push(customerId) }
        if (status) { where.push('w.status = ?'); params.push(status) }
        if (shipmentId) { where.push('w.shipment_id = ?'); params.push(shipmentId) }
        if (startDate) { where.push('w.waybill_date >= ?'); params.push(startDate) }
        if (endDate) { where.push('w.waybill_date <= ?'); params.push(endDate) }
        if (search) {
            where.push('(w.waybill_number LIKE ? OR a.name LIKE ? OR w.driver_name LIKE ? OR w.vehicle_plate LIKE ?)')
            const s = `%${search}%`
            params.push(s, s, s, s)
        }

        const whereSql = where.join(' AND ')
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM waybills w LEFT JOIN accounts a ON w.customer_id = a.id WHERE ${whereSql}`).get(...params) as { total: number }
        const total = countRow?.total ?? 0

        const rows = db.prepare(`
      SELECT w.*, a.name as customer_name, a.code as customer_code, s.shipment_number
      FROM waybills w
      LEFT JOIN accounts a ON w.customer_id = a.id
      LEFT JOIN shipments s ON w.shipment_id = s.id
      WHERE ${whereSql}
      ORDER BY w.waybill_date DESC, w.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[]

        // Her irsaliye için kalem sayısı
        const enriched = rows.map((w: any) => {
            const itemCount = db.prepare('SELECT COUNT(*) as cnt FROM waybill_items WHERE waybill_id = ?').get(w.id) as { cnt: number }
            return { ...w, item_count: itemCount?.cnt ?? 0 }
        })

        return ok(enriched, { meta: { total, limit, offset } })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// POST: İrsaliye oluştur (sevkiyattan veya manuel)
export const POST = withAuth(async (request: NextRequest) => {
    try {
        const body = await request.json()
        const { shipment_id, customer_id, waybill_date, driver_name, vehicle_plate, delivery_address, notes, items } = body

        const db = getDatabase()
        const id = randomUUID()
        const waybillNumber = generateWaybillNumber(db)
        const now = new Date().toISOString()

        // Sevkiyattan otomatik oluşturma
        if (shipment_id) {
            const shipment = db.prepare(`
        SELECT s.*, a.name as customer_name, a.id as cust_id
        FROM shipments s
        JOIN accounts a ON s.customer_id = a.id
        WHERE s.id = ? AND s.deleted_at IS NULL
      `).get(shipment_id) as any
            if (!shipment) return fail('Sevkiyat bulunamadı', { status: 404 })

            // Zaten irsaliye var mı?
            const existing = db.prepare('SELECT id FROM waybills WHERE shipment_id = ? AND deleted_at IS NULL').get(shipment_id)
            if (existing) return fail('Bu sevkiyat için zaten irsaliye oluşturulmuş', { status: 400 })

            // Sevkiyat kalemlerini al
            const shipmentItems = db.prepare(`
        SELECT si.*, p.name as product_name, p.sku as product_sku
        FROM shipment_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.shipment_id = ? AND si.deleted_at IS NULL
      `).all(shipment_id) as any[]

            const totalQty = shipmentItems.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)

            db.transaction(() => {
                db.prepare(`
          INSERT INTO waybills (id, waybill_number, shipment_id, customer_id, waybill_date, driver_name, vehicle_plate, delivery_address, notes, status, total_quantity, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?, ?)
        `).run(id, waybillNumber, shipment_id, shipment.customer_id, waybill_date || now.slice(0, 10), driver_name || null, vehicle_plate || null, delivery_address || null, notes || null, totalQty, now, now)

                const insertItem = db.prepare(`INSERT INTO waybill_items (id, waybill_id, product_id, product_name, product_sku, quantity, unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                for (const item of shipmentItems) {
                    insertItem.run(randomUUID(), id, item.product_id, item.product_name || null, item.product_sku || null, item.quantity || 0, 'ADET', item.notes || null)
                }
            })()

            return NextResponse.json({ success: true, waybill: { id, waybill_number: waybillNumber, shipment_id } }, { status: 201 })
        }

        // Manuel oluşturma
        if (!customer_id) return fail('customer_id veya shipment_id gerekli', { status: 400 })
        const manualItems = Array.isArray(items) ? items : []
        const totalQty = manualItems.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0)

        db.transaction(() => {
            db.prepare(`
        INSERT INTO waybills (id, waybill_number, shipment_id, customer_id, waybill_date, driver_name, vehicle_plate, delivery_address, notes, status, total_quantity, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
      `).run(id, waybillNumber, customer_id, waybill_date || now.slice(0, 10), driver_name || null, vehicle_plate || null, delivery_address || null, notes || null, totalQty, now, now)

            const insertItem = db.prepare(`INSERT INTO waybill_items (id, waybill_id, product_id, product_name, product_sku, quantity, unit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            for (const item of manualItems) {
                insertItem.run(randomUUID(), id, item.product_id || null, item.product_name || null, item.product_sku || null, Number(item.quantity) || 0, item.unit || 'ADET', item.notes || null)
            }
        })()

        return NextResponse.json({ success: true, waybill: { id, waybill_number: waybillNumber } }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
