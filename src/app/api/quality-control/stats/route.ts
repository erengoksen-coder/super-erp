import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'

// GET: QC istatistikleri
export const GET = withAuth(async () => {
    try {
        const db = getDatabase()

        const total = db.prepare(`SELECT COUNT(*) as c FROM quality_controls WHERE deleted_at IS NULL`).get() as any
        const passed = db.prepare(`SELECT COUNT(*) as c FROM quality_controls WHERE deleted_at IS NULL AND result = 'passed'`).get() as any
        const failed = db.prepare(`SELECT COUNT(*) as c FROM quality_controls WHERE deleted_at IS NULL AND result = 'failed'`).get() as any
        const partial = db.prepare(`SELECT COUNT(*) as c FROM quality_controls WHERE deleted_at IS NULL AND result = 'partial'`).get() as any

        const totalInspected = db.prepare(`SELECT COALESCE(SUM(quantity_inspected), 0) as s FROM quality_controls WHERE deleted_at IS NULL`).get() as any
        const totalFailed = db.prepare(`SELECT COALESCE(SUM(quantity_failed), 0) as s FROM quality_controls WHERE deleted_at IS NULL`).get() as any

        const defectRate = totalInspected.s > 0 ? ((totalFailed.s / totalInspected.s) * 100).toFixed(2) : '0.00'

        // Son 6 ay trend
        const monthly = db.prepare(`
            SELECT 
                strftime('%Y-%m', inspection_date) as month,
                COUNT(*) as total,
                SUM(CASE WHEN result = 'passed' THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN result = 'failed' THEN 1 ELSE 0 END) as failed,
                COALESCE(SUM(quantity_inspected), 0) as inspected,
                COALESCE(SUM(quantity_failed), 0) as defects
            FROM quality_controls
            WHERE deleted_at IS NULL AND inspection_date >= date('now', '-6 months')
            GROUP BY strftime('%Y-%m', inspection_date)
            ORDER BY month ASC
        `).all()

        return ok({
            summary: { total: total.c, passed: passed.c, failed: failed.c, partial: partial.c },
            quantities: { totalInspected: totalInspected.s, totalFailed: totalFailed.s, defectRate },
            monthly,
        })
    } catch (e: any) {
        return fail(e.message, { status: 500 })
    }
})
