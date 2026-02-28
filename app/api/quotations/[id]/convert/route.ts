import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

// POST: Teklifi siparişe dönüştür
export const POST = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/quotations/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return fail('ID gerekli', { status: 400 })

        const db = getDatabase()
        const quotation = db.prepare(`
      SELECT q.*, a.name as customer_name, a.code as customer_code
      FROM quotations q
      LEFT JOIN accounts a ON q.customer_id = a.id
      WHERE q.id = ? AND q.deleted_at IS NULL
    `).get(id) as any
        if (!quotation) return fail('Teklif bulunamadı', { status: 404 })
        if (quotation.status === 'converted') return fail('Bu teklif zaten siparişe dönüştürülmüş', { status: 400 })

        const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY sort_order').all(id) as any[]
        const now = new Date().toISOString()
        const orderId = randomUUID()

        // Sipariş numarası oluştur
        const year = new Date().getFullYear()
        const lastOrder = db.prepare(`SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1`).get(`SPR-${year}-%`) as any
        let orderNum = `SPR-${year}-001`
        if (lastOrder?.order_number) {
            const n = parseInt(lastOrder.order_number.split('-').pop() || '0', 10)
            orderNum = `SPR-${year}-${String(n + 1).padStart(3, '0')}`
        }

        db.transaction(() => {
            // Sipariş oluştur
            db.prepare(`
        INSERT INTO orders (id, order_number, customer_name, dealer_name, product_name, quantity, unit_price, total_amount, order_date, status, notes, company_id, branch_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(
                orderId, orderNum,
                quotation.customer_name || '',
                quotation.customer_name || '',
                items.map((i: any) => i.product_name).filter(Boolean).join(', ') || 'Teklif ürünleri',
                items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
                items.length > 0 ? items[0].unit_price : 0,
                quotation.total_amount || 0,
                now.slice(0, 10),
                `Teklif ${quotation.quotation_number}'den dönüştürüldü. ${quotation.notes || ''}`,
                quotation.company_id || 'company_default',
                quotation.branch_id || 'branch_default',
                now, now
            )

            // Teklifi "converted" yap
            db.prepare(`UPDATE quotations SET status = 'converted', converted_order_id = ?, updated_at = ? WHERE id = ?`).run(orderId, now, id)
        })()

        return NextResponse.json({
            success: true,
            message: `Teklif ${quotation.quotation_number} siparişe dönüştürüldü → ${orderNum}`,
            order: { id: orderId, order_number: orderNum }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
