import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { generateInvoicePDF } from '@/lib/pdf/generator'

export const GET = withAuth(async (request: NextRequest, user: any, context?: any) => {
    try {
        const params = await Promise.resolve(context?.params)
        const id = params?.id || request.url.split('/invoices/')[1]?.split('/')[0]?.split('?')[0]
        if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

        const db = getDatabase()
        const invoice = db.prepare(`
      SELECT i.*, a.name as customer_name, a.code as customer_code, a.address, a.tax_number
      FROM invoices i
      LEFT JOIN accounts a ON i.customer_id = a.id
      WHERE i.id = ? AND i.deleted_at IS NULL
    `).get(id) as any
        if (!invoice) return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })

        const items = db.prepare(`
      SELECT ii.*, p.name as product_name, p.sku as product_sku
      FROM invoice_items ii
      LEFT JOIN products p ON ii.product_id = p.id
      WHERE ii.invoice_id = ?
      ORDER BY ii.created_at
    `).all(id) as any[]

        const customer = {
            name: invoice.customer_name,
            code: invoice.customer_code,
            address: invoice.address,
            tax_number: invoice.tax_number,
            tax_office: invoice.tax_office,
        }

        const pdfBuffer = await generateInvoicePDF(invoice, items, customer)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${invoice.invoice_number || 'fatura'}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('Fatura PDF hatası:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
