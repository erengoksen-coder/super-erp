import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Fiyat listesi detay
export const GET = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/price-lists/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })
        const db = getDatabase()
        const pl = db.prepare('SELECT * FROM price_lists WHERE id = ? AND deleted_at IS NULL').get(id) as any
        if (!pl) return fail('Fiyat listesi bulunamadı', { status: 404 })
        const items = db.prepare(`
      SELECT pli.*, p.name as current_product_name, p.sku
      FROM price_list_items pli
      LEFT JOIN products p ON pli.product_id = p.id
      WHERE pli.price_list_id = ?
      ORDER BY pli.product_name
    `).all(id) as any[]
        return ok({ ...pl, items })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})

// PATCH: Güncelle
export const PATCH = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/price-lists/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })
        const body = await request.json()
        const db = getDatabase()
        const updates: string[] = ['updated_at = ?']
        const params: any[] = [new Date().toISOString()]
        const fields = ['name', 'code', 'description', 'currency', 'is_default', 'valid_from', 'valid_until', 'status', 'customer_group_id']
        fields.forEach(f => { if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]) } })
        params.push(id)
        db.prepare(`UPDATE price_lists SET ${updates.join(', ')} WHERE id = ?`).run(...params)
        return ok({ success: true })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})

// DELETE: Soft delete
export const DELETE = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/price-lists/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })
        const db = getDatabase()
        const now = new Date().toISOString()
        db.prepare('UPDATE price_lists SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, now, id)
        return ok({ success: true })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})
