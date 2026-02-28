import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET() {
    try {
        const db = getDatabase()

        // Son 12 aylık ciro (faturalardan)
        const months = db.prepare(`
      SELECT 
        strftime('%Y', invoice_date) as year,
        strftime('%m', invoice_date) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as invoice_count,
        COUNT(DISTINCT customer_id) as customer_count
      FROM invoices
      WHERE deleted_at IS NULL
        AND invoice_date >= date('now', '-12 months')
      GROUP BY strftime('%Y', invoice_date), strftime('%m', invoice_date)
      ORDER BY year ASC, month ASC
    `).all()

        // Bu ay vs geçen ay karşılaştırma
        const thisMonth = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as count
      FROM invoices WHERE deleted_at IS NULL
        AND strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now')
    `).get() as any

        const lastMonth = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue, COUNT(*) as count
      FROM invoices WHERE deleted_at IS NULL
        AND strftime('%Y-%m', invoice_date) = strftime('%Y-%m', 'now', '-1 month')
    `).get() as any

        // Toplam sipariş sayısı (bu ay)
        const ordersThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE deleted_at IS NULL
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get() as any

        // Toplam üretim emri (bu ay)
        const productionThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM production_orders WHERE deleted_at IS NULL
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get() as any

        // Toplam sevkiyat (bu ay)
        const shipmentsThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM shipments WHERE deleted_at IS NULL
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get() as any

        const changePercent = lastMonth.revenue > 0
            ? ((thisMonth.revenue - lastMonth.revenue) / lastMonth.revenue * 100).toFixed(1)
            : null

        return NextResponse.json({
            data: {
                months,
                comparison: {
                    thisMonth: { revenue: thisMonth.revenue, count: thisMonth.count },
                    lastMonth: { revenue: lastMonth.revenue, count: lastMonth.count },
                    changePercent,
                },
                kpi: {
                    ordersThisMonth: ordersThisMonth?.count || 0,
                    productionThisMonth: productionThisMonth?.count || 0,
                    shipmentsThisMonth: shipmentsThisMonth?.count || 0,
                }
            }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
