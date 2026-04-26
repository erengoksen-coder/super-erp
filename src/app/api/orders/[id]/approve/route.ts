import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type AuthUser } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

type ApprovalRow = { id: string; order_id: string; status: string }

type RouteContext = { params?: { id?: string } }

// POST: Siparişi onayla veya reddet
export const POST = withAuth(async (request: NextRequest, user: AuthUser, context?: RouteContext) => {
    try {
        const resolvedParams = await (context as any)?.params
        const id = resolvedParams?.id || request.url.split('/orders/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('Sipariş ID gerekli', { status: 400 })

        const body = await request.json() as { action?: string; notes?: string }
        const { action, notes } = body
        if (!action || !['approve', 'reject'].includes(action)) {
            return fail('action: approve veya reject gerekli', { status: 400 })
        }

    if (action === 'reject' && (!notes || !String(notes).trim())) {
      return fail('Red sebebi (notes) zorunlu', { status: 400 })
    }

        const db = getDatabase()
        const now = new Date().toISOString()

        const approval = db.prepare('SELECT * FROM order_approvals WHERE order_id = ? AND status = ?').get(id, 'pending') as ApprovalRow | undefined
        if (!approval) return fail('Onay bekleyen sipariş bulunamadı', { status: 404 })

        if (action === 'approve') {
            db.transaction(() => {
                db.prepare('UPDATE order_approvals SET status = ?, approved_by = ?, approved_at = ?, notes = ? WHERE id = ?')
                    .run('approved', user?.userId || 'admin', now, notes || null, approval.id)
                db.prepare("UPDATE orders SET status = 'pending', updated_at = ? WHERE id = ?").run(now, id)
                
                // Siparişle ilgili tüm bildirimleri "okundu" yap
                db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE reference_type = ? AND reference_id = ? AND (is_read = 0 OR is_read IS NULL)')
                    .run(now, 'order', id)

                // Planlama birimine bildirim gönder (yeni onaylanan sipariş için)
                try {
                    const orderInfo = db.prepare('SELECT order_number FROM orders WHERE id = ?').get(id) as { order_number: string } | undefined
                    const planners = db.prepare(`SELECT id FROM users WHERE job_title LIKE '%Planlama%'`).all() as { id: string }[]
                    for (const planner of planners) {
                        db.prepare(`
                            INSERT INTO notifications (id, user_id, title, message, type, link, reference_type, reference_id)
                            VALUES (?, ?, ?, ?, 'info', ?, 'order', ?)
                        `).run(randomUUID(), planner.id, 'Sipariş Onaylandı', `${orderInfo?.order_number || ''} nolu sipariş onaylandı ve planlamaya hazır.`, '/production/planning', id)
                    }
                } catch (err) {
                    console.error('Planlama bildirimi hatası:', err)
                }
            })()

            return ok({ success: true, message: 'Sipariş onaylandı' })
        } else {
            db.transaction(() => {
                db.prepare('UPDATE order_approvals SET status = ?, approved_by = ?, approved_at = ?, notes = ? WHERE id = ?')
                    .run('rejected', user?.userId || 'admin', now, notes || null, approval.id)
                db.prepare("UPDATE orders SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE id = ?").run(notes || 'Yönetici tarafından reddedildi', now, id)
                
                // Siparişle ilgili tüm bildirimleri "okundu" yap
                db.prepare('UPDATE notifications SET is_read = 1, read_at = ? WHERE reference_type = ? AND reference_id = ? AND (is_read = 0 OR is_read IS NULL)')
                    .run(now, 'order', id)
            })()
            return ok({ success: true, message: 'Sipariş reddedildi' })
        }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'İşlem başarısız'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
})

type ApprovalListRow = Record<string, unknown>

// GET: Onay bekleyen siparişler
export const GET = withAuth(async (_request: NextRequest) => {
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
    `).all() as ApprovalListRow[]
        return ok(rows)
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Liste alınamadı'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
})
