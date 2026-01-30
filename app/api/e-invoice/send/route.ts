import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Faturayı e-fatura entegratörüne gönder (stub)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as { invoice_id?: string }
    const invoiceId = body.invoice_id

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoice_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND deleted_at IS NULL').get(invoiceId) as any
    if (!invoice) {
      return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
    }

    const integration = db.prepare(`
      SELECT * FROM e_invoice_integrations WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1
    `).get() as any

    if (!integration) {
      return NextResponse.json({ error: 'Aktif entegratör bulunamadı' }, { status: 400 })
    }

    // Stub: Gerçek entegrasyon burada yapılacak
    const logId = randomUUID()
    db.prepare(`
      INSERT INTO e_invoice_logs
      (id, invoice_id, provider, action, status, request_payload, response_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      invoiceId,
      integration.provider,
      'send',
      'queued',
      JSON.stringify({ invoice_id: invoiceId }),
      JSON.stringify({ message: 'queued' })
    )

    return NextResponse.json({ success: true, status: 'queued', log_id: logId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
