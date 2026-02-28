import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Tek irsaliye detay (kalemlerle birlikte)
export const GET = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/waybills/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })

        const db = getDatabase()
        const waybill = db.prepare(`
      SELECT w.*, a.name as customer_name, a.code as customer_code, s.shipment_number
      FROM waybills w
      LEFT JOIN accounts a ON w.customer_id = a.id
      LEFT JOIN shipments s ON w.shipment_id = s.id
      WHERE w.id = ? AND w.deleted_at IS NULL
    `).get(id) as any
        if (!waybill) return fail('İrsaliye bulunamadı', { status: 404 })

        const items = db.prepare('SELECT * FROM waybill_items WHERE waybill_id = ? ORDER BY created_at').all(id) as any[]
        return ok({ ...waybill, items })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// PATCH: İrsaliye güncelle
export const PATCH = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/waybills/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })

        const body = await request.json()
        const { status, driver_name, vehicle_plate, delivery_address, notes, waybill_date } = body

        const db = getDatabase()
        const existing = db.prepare('SELECT id FROM waybills WHERE id = ? AND deleted_at IS NULL').get(id)
        if (!existing) return fail('İrsaliye bulunamadı', { status: 404 })

        const updates: string[] = ['updated_at = ?']
        const params: any[] = [new Date().toISOString()]

        if (status !== undefined) { updates.push('status = ?'); params.push(status) }
        if (driver_name !== undefined) { updates.push('driver_name = ?'); params.push(driver_name) }
        if (vehicle_plate !== undefined) { updates.push('vehicle_plate = ?'); params.push(vehicle_plate) }
        if (delivery_address !== undefined) { updates.push('delivery_address = ?'); params.push(delivery_address) }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes) }
        if (waybill_date !== undefined) { updates.push('waybill_date = ?'); params.push(waybill_date) }

        params.push(id)
        db.prepare(`UPDATE waybills SET ${updates.join(', ')} WHERE id = ?`).run(...params)

        return ok({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// DELETE: Soft delete
export const DELETE = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/waybills/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })

        const db = getDatabase()
        const now = new Date().toISOString()
        const result = db.prepare('UPDATE waybills SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL').run(now, now, id)
        if (result.changes === 0) return fail('İrsaliye bulunamadı', { status: 404 })

        return ok({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
