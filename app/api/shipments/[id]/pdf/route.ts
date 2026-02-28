import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { generateShipmentPDF } from '@/lib/pdf/generator'

export const GET = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const id = context?.params?.id || request.url.split('/shipments/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

        const db = getDatabase()
        const shipment = db.prepare(`
      SELECT s.*, a.name as customer_name, a.code as customer_code, a.address, a.tax_number
      FROM shipments s
      LEFT JOIN accounts a ON s.customer_id = a.id
      WHERE s.id = ? AND s.deleted_at IS NULL
    `).get(id) as any
        if (!shipment) return NextResponse.json({ error: 'Sevkiyat bulunamadı' }, { status: 404 })

        const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku as product_sku
      FROM shipment_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.shipment_id = ? AND si.deleted_at IS NULL
      ORDER BY si.created_at
    `).all(id) as any[]

        const customer = { name: shipment.customer_name, code: shipment.customer_code, address: shipment.address, tax_number: shipment.tax_number, tax_office: shipment.tax_office }

        const pdfBuffer = await generateShipmentPDF(shipment, items, customer)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${shipment.shipment_number || 'sevk-fisi'}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('Sevk Fişi PDF hatası:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
