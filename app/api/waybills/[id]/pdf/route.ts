import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { generateWaybillPDF } from '@/lib/pdf/generator'

export const GET = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/waybills/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

        const db = getDatabase()
        const waybill = db.prepare(`
      SELECT w.*, a.name as customer_name, a.code as customer_code, a.address, a.tax_number
      FROM waybills w
      LEFT JOIN accounts a ON w.customer_id = a.id
      WHERE w.id = ? AND w.deleted_at IS NULL
    `).get(id) as any
        if (!waybill) return NextResponse.json({ error: 'İrsaliye bulunamadı' }, { status: 404 })

        const items = db.prepare('SELECT * FROM waybill_items WHERE waybill_id = ? ORDER BY created_at').all(id) as any[]
        const customer = { name: waybill.customer_name, code: waybill.customer_code, address: waybill.address, tax_number: waybill.tax_number, tax_office: waybill.tax_office }

        const pdfBuffer = await generateWaybillPDF(waybill, items, customer)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${waybill.waybill_number || 'irsaliye'}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('İrsaliye PDF hatası:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
