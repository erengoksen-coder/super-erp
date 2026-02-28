import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

// POST: Siparişi onayla veya reddet
export const POST = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/orders/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('Sipariş ID gerekli', { status: 400 })

        const body = await request.json()
        const { action, notes } = body // action: 'approve' | 'reject'
        if (!action || !['approve', 'reject'].includes(action)) {
            return fail('action: approve veya reject gerekli', { status: 400 })
        }

        const db = getDatabase()
        const now = new Date().toISOString()

        // Onay kaydını bul
        const approval = db.prepare('SELECT * FROM order_approvals WHERE order_id = ? AND status = ?').get(id, 'pending') as any
        if (!approval) return fail('Onay bekleyen sipariş bulunamadı', { status: 404 })

        if (action === 'approve') {
            db.transaction(() => {
                db.prepare('UPDATE order_approvals SET status = ?, approved_by = ?, approved_at = ?, notes = ? WHERE id = ?')
                    .run('approved', user?.userId || 'admin', now, notes || null, approval.id)
                db.prepare("UPDATE orders SET status = 'pending', updated_at = ? WHERE id = ?").run(now, id)
            })()
            return ok({ success: true, message: 'Sipariş onaylandı' })
        } else {
            db.transaction(() => {
                db.prepare('UPDATE order_approvals SET status = ?, approved_by = ?, approved_at = ?, notes = ? WHERE id = ?')
                    .run('rejected', user?.userId || 'admin', now, notes || null, approval.id)
                db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, id)
            })()
            return ok({ success: true, message: 'Sipariş reddedildi' })
        }
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})

// GET: Onay bekleyen siparişler
export const GET = withAuth(async (request: NextRequest) => {
    try {
        const db = getDatabase()
        const rows = db.prepare(`
      SELECT oa.*, o.order_number, o.customer_name, o.product_name, o.total_amount, o.quantity,
             u.fullname as requested_by_name,
             u2.fullname as approved_by_name
      FROM order_approvals oa
      JOIN orders o ON oa.order_id = o.id
      LEFT JOIN users u ON oa.requested_by = u.id
      LEFT JOIN users u2 ON oa.approved_by = u2.id
      ORDER BY oa.requested_at DESC
      LIMIT 100
    `).all() as any[]
        return ok(rows)
    } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
})
