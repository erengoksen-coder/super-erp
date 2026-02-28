import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET() {
    try {
        const db = getDatabase()

        const thisMonthStart = `strftime('%Y-%m', 'now') || '-01'`
        const lastMonthStart = `strftime('%Y-%m', 'now', '-1 month') || '-01'`

        const metrics = []

        // Siparişler
        const ordersThis = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as a FROM orders WHERE deleted_at IS NULL AND created_at >= date(${thisMonthStart})`).get() as any
        const ordersLast = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as a FROM orders WHERE deleted_at IS NULL AND created_at >= date(${lastMonthStart}) AND created_at < date(${thisMonthStart})`).get() as any
        metrics.push({
            name: 'Sipariş Sayısı', thisMonth: ordersThis.c, lastMonth: ordersLast.c,
            change: ordersLast.c > 0 ? ((ordersThis.c - ordersLast.c) / ordersLast.c * 100).toFixed(1) : null, icon: 'ShoppingCart'
        })
        metrics.push({
            name: 'Sipariş Tutarı', thisMonth: ordersThis.a, lastMonth: ordersLast.a,
            change: ordersLast.a > 0 ? ((ordersThis.a - ordersLast.a) / ordersLast.a * 100).toFixed(1) : null, icon: 'DollarSign', isCurrency: true
        })

        // Faturalar
        const invThis = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as a FROM invoices WHERE deleted_at IS NULL AND invoice_date >= date(${thisMonthStart}) AND type = 'sales'`).get() as any
        const invLast = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(total_amount), 0) as a FROM invoices WHERE deleted_at IS NULL AND invoice_date >= date(${lastMonthStart}) AND invoice_date < date(${thisMonthStart}) AND type = 'sales'`).get() as any
        metrics.push({
            name: 'Fatura Sayısı', thisMonth: invThis.c, lastMonth: invLast.c,
            change: invLast.c > 0 ? ((invThis.c - invLast.c) / invLast.c * 100).toFixed(1) : null, icon: 'FileText'
        })
        metrics.push({
            name: 'Fatura Tutarı', thisMonth: invThis.a, lastMonth: invLast.a,
            change: invLast.a > 0 ? ((invThis.a - invLast.a) / invLast.a * 100).toFixed(1) : null, icon: 'DollarSign', isCurrency: true
        })

        // Sevkiyatlar
        const shipThis = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE deleted_at IS NULL AND created_at >= date(${thisMonthStart})`).get() as any
        const shipLast = db.prepare(`SELECT COUNT(*) as c FROM shipments WHERE deleted_at IS NULL AND created_at >= date(${lastMonthStart}) AND created_at < date(${thisMonthStart})`).get() as any
        metrics.push({
            name: 'Sevkiyat', thisMonth: shipThis.c, lastMonth: shipLast.c,
            change: shipLast.c > 0 ? ((shipThis.c - shipLast.c) / shipLast.c * 100).toFixed(1) : null, icon: 'Truck'
        })

        // Üretim Emirleri
        const prodThis = db.prepare(`SELECT COUNT(*) as c FROM production_orders WHERE deleted_at IS NULL AND created_at >= date(${thisMonthStart})`).get() as any
        const prodLast = db.prepare(`SELECT COUNT(*) as c FROM production_orders WHERE deleted_at IS NULL AND created_at >= date(${lastMonthStart}) AND created_at < date(${thisMonthStart})`).get() as any
        metrics.push({
            name: 'Üretim Emri', thisMonth: prodThis.c, lastMonth: prodLast.c,
            change: prodLast.c > 0 ? ((prodThis.c - prodLast.c) / prodLast.c * 100).toFixed(1) : null, icon: 'Factory'
        })

        // Yeni müşteriler
        const custThis = db.prepare(`SELECT COUNT(*) as c FROM accounts WHERE deleted_at IS NULL AND type = 'customer' AND created_at >= date(${thisMonthStart})`).get() as any
        const custLast = db.prepare(`SELECT COUNT(*) as c FROM accounts WHERE deleted_at IS NULL AND type = 'customer' AND created_at >= date(${lastMonthStart}) AND created_at < date(${thisMonthStart})`).get() as any
        metrics.push({
            name: 'Yeni Müşteri', thisMonth: custThis.c, lastMonth: custLast.c,
            change: custLast.c > 0 ? ((custThis.c - custLast.c) / custLast.c * 100).toFixed(1) : null, icon: 'Users'
        })

        // QC Kontrolleri
        try {
            const qcThis = db.prepare(`SELECT COUNT(*) as c, SUM(CASE WHEN result='failed' THEN 1 ELSE 0 END) as f FROM quality_controls WHERE deleted_at IS NULL AND inspection_date >= date(${thisMonthStart})`).get() as any
            const qcLast = db.prepare(`SELECT COUNT(*) as c, SUM(CASE WHEN result='failed' THEN 1 ELSE 0 END) as f FROM quality_controls WHERE deleted_at IS NULL AND inspection_date >= date(${lastMonthStart}) AND inspection_date < date(${thisMonthStart})`).get() as any
            metrics.push({
                name: 'QC Kontrol', thisMonth: qcThis.c, lastMonth: qcLast.c,
                change: qcLast.c > 0 ? ((qcThis.c - qcLast.c) / qcLast.c * 100).toFixed(1) : null, icon: 'ClipboardCheck'
            })
        } catch { }

        return NextResponse.json({ data: { metrics } })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
