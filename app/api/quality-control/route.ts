import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Kalite kontrol kayıtlarını getir
export const GET = withAuth(async (request: NextRequest) => {
    try {
        const db = getDatabase()
        const url = new URL(request.url)
        const result = url.searchParams.get('result')
        const status = url.searchParams.get('status')
        const search = url.searchParams.get('search')

        let sql = `SELECT * FROM quality_controls WHERE deleted_at IS NULL`
        const params: any[] = []

        if (result && result !== 'all') { sql += ` AND result = ?`; params.push(result) }
        if (status) { sql += ` AND status = ?`; params.push(status) }
        if (search) {
            sql += ` AND (qc_number LIKE ? OR product_name LIKE ? OR batch_number LIKE ?)`
            params.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        sql += ` ORDER BY created_at DESC LIMIT 200`
        const rows = db.prepare(sql).all(...params)

        return ok(rows)
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})

// POST: Yeni kalite kontrol kaydı oluştur
export const POST = withAuth(async (request: NextRequest) => {
    try {
        const body = await request.json()
        const db = getDatabase()

        // QC numara üret
        const last = db.prepare(`SELECT qc_number FROM quality_controls ORDER BY created_at DESC LIMIT 1`).get() as any
        let nextNum = 1
        if (last?.qc_number) {
            const match = last.qc_number.match(/(\d+)$/)
            if (match) nextNum = parseInt(match[1]) + 1
        }
        const qcNumber = `QC-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`

        const id = randomUUID()
        const quantityInspected = body.quantity_inspected || 0
        const quantityPassed = body.quantity_passed || 0
        const quantityFailed = body.quantity_failed || 0

        // Sonucu otomatik belirle
        let result = body.result || 'pending'
        if (quantityFailed === 0 && quantityPassed > 0) result = 'passed'
        else if (quantityPassed === 0 && quantityFailed > 0) result = 'failed'
        else if (quantityFailed > 0 && quantityPassed > 0) result = 'partial'

        db.prepare(`
            INSERT INTO quality_controls (id, qc_number, production_order_id, inspector_id, inspection_date, product_id, product_name, batch_number, quantity_inspected, quantity_passed, quantity_failed, defect_type, defect_description, result, notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, qcNumber, body.production_order_id || null, body.inspector_id || null,
            body.inspection_date || new Date().toISOString(), body.product_id || null,
            body.product_name || null, body.batch_number || null,
            quantityInspected, quantityPassed, quantityFailed,
            body.defect_type || null, body.defect_description || null,
            result, body.notes || null, body.status || 'completed'
        )

        return ok({ id, qc_number: qcNumber, message: 'QC kaydı oluşturuldu' }, { status: 201 })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})
