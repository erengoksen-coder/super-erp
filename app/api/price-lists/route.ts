import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

// GET: Fiyat listelerini getir
export const GET = withAuth(async (request: NextRequest) => {
    try {
        const db = getDatabase()
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')

        let query = `SELECT pl.*, (SELECT COUNT(*) FROM price_list_items pli WHERE pli.price_list_id = pl.id) as item_count FROM price_lists pl WHERE pl.deleted_at IS NULL`
        const params: any[] = []
        if (status) { query += ' AND pl.status = ?'; params.push(status) }
        query += ' ORDER BY pl.is_default DESC, pl.name ASC'

        const rows = db.prepare(query).all(...params) as any[]
        return ok(rows)
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})

// POST: Fiyat listesi oluştur
export const POST = withAuth(async (request: NextRequest) => {
    try {
        const body = await request.json()
        const { name, code, description, currency, is_default, valid_from, valid_until, items, customer_group_id } = body
        if (!name) return fail('Fiyat listesi adı gerekli', { status: 400 })

        const db = getDatabase()
        const id = randomUUID()
        const now = new Date().toISOString()
        const itemList = Array.isArray(items) ? items : []

        db.transaction(() => {
            if (is_default) {
                db.prepare('UPDATE price_lists SET is_default = 0 WHERE is_default = 1').run()
            }
            try {
                db.prepare(`
        INSERT INTO price_lists (id, name, code, description, currency, is_default, valid_from, valid_until, status, customer_group_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(id, name, code || null, description || null, currency || 'TRY', is_default ? 1 : 0, valid_from || null, valid_until || null, customer_group_id || null, now, now)
            } catch (e: any) {
                if (e.message?.includes('no such column')) {
                    db.prepare(`
        INSERT INTO price_lists (id, name, code, description, currency, is_default, valid_from, valid_until, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(id, name, code || null, description || null, currency || 'TRY', is_default ? 1 : 0, valid_from || null, valid_until || null, now, now)
                } else throw e
            }

            const ins = db.prepare('INSERT INTO price_list_items (id, price_list_id, product_id, product_name, unit_price, min_quantity, discount_rate, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
            for (const item of itemList) {
                ins.run(randomUUID(), id, item.product_id, item.product_name || null, Number(item.unit_price) || 0, Number(item.min_quantity) || 1, Number(item.discount_rate) || 0, now, now)
            }
        })()

        return NextResponse.json({ success: true, price_list: { id, name } }, { status: 201 })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})
