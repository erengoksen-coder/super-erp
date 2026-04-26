import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Teklif detay
export const GET = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const resolvedParams = await (context as any)?.params
        const id = resolvedParams?.id || request.url.split('/quotations/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })
        const db = getDatabase()
        const q = db.prepare(`SELECT q.*, a.name as customer_name, a.code as customer_code FROM quotations q LEFT JOIN accounts a ON q.customer_id = a.id WHERE q.id = ? AND q.deleted_at IS NULL`).get(id) as any
        if (!q) return fail('Teklif bulunamadı', { status: 404 })
        const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order').all(id) as any[]
        return ok({ ...q, items })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})

// PATCH: Teklif güncelle
export const PATCH = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const resolvedParams = await (context as any)?.params
        const id = resolvedParams?.id || request.url.split('/quotations/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })
        const body = await request.json()
        const db = getDatabase()
        const existing = db.prepare('SELECT id FROM quotations WHERE id = ? AND deleted_at IS NULL').get(id)
        if (!existing) return fail('Teklif bulunamadı', { status: 404 })

        const updates: string[] = ['updated_at = ?']
        const params: any[] = [new Date().toISOString()]
        const fields = ['status', 'notes', 'terms', 'valid_until', 'quotation_date', 'discount_rate', 'tax_rate']
        fields.forEach(f => { if (body[f] !== undefined) { updates.push(`${f} = ?`); params.push(body[f]) } })
        params.push(id)
        db.prepare(`UPDATE quotations SET ${updates.join(', ')} WHERE id = ?`).run(...params)
        return ok({ success: true })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})

// DELETE: Soft delete
export const DELETE = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const resolvedParams = await (context as any)?.params
        const id = resolvedParams?.id || request.url.split('/quotations/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })
        const db = getDatabase()
        const now = new Date().toISOString()
        const result = db.prepare('UPDATE quotations SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, now, id)
        if (result.changes === 0) return fail('Teklif bulunamadı', { status: 404 })
        return ok({ success: true })
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})
