import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Faturayı Nilvera e-fatura API ile gönder
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as { invoice_id?: string; is_earchive?: boolean }
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

    const config = JSON.parse(integration.config_json || '{}')

    // Fatura kalemlerini al
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? AND deleted_at IS NULL').all(invoiceId) as any[]

    // Müşteri bilgisi
    const customer = db.prepare('SELECT * FROM accounts WHERE id = ?').get(invoice.customer_id || invoice.account_id) as any

    const logId = randomUUID()

    // Nilvera entegrasyonu
    if (integration.provider === 'nilvera') {
      const { sendEInvoice, sendEArchiveInvoice, mapInvoiceToNilvera } = await import('@/lib/integrations/nilvera')

      const nilveraConfig = {
        apiKey: config.apiKey || config.api_key || '',
        environment: (config.environment || 'test') as 'test' | 'production',
        taxNumber: config.taxNumber || config.tax_number || '',
      }

      const supplier = {
        name: config.companyName || config.company_name || 'LIVASOFA',
        taxNumber: config.taxNumber || config.tax_number || '',
        city: config.city || 'İstanbul',
        district: config.district || '',
      }

      const customerInfo = {
        name: customer?.name || 'Müşteri',
        taxNumber: customer?.tax_number || customer?.tax_id || '',
        city: customer?.city || '',
        district: customer?.district || '',
      }

      const nilveraInvoice = mapInvoiceToNilvera(invoice, items, supplier, customerInfo, !!body.is_earchive)

      try {
        const result = body.is_earchive
          ? await sendEArchiveInvoice(nilveraConfig, nilveraInvoice)
          : await sendEInvoice(nilveraConfig, nilveraInvoice)

        db.prepare(`
          INSERT INTO e_invoice_logs
          (id, invoice_id, provider, action, status, request_payload, response_payload)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId, invoiceId, 'nilvera', 'send',
          result.IsSucceded ? 'sent' : 'error',
          JSON.stringify({ invoice_id: invoiceId, type: body.is_earchive ? 'e-arsiv' : 'e-fatura' }),
          JSON.stringify(result)
        )

        if (!result.IsSucceded) {
          return NextResponse.json({
            success: false,
            error: result.Message || result.Errors?.join(', ') || 'Gönderim başarısız',
            log_id: logId,
          }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          status: 'sent',
          uuid: result.Data,
          log_id: logId,
        })
      } catch (apiError: any) {
        db.prepare(`
          INSERT INTO e_invoice_logs
          (id, invoice_id, provider, action, status, request_payload, response_payload)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId, invoiceId, 'nilvera', 'send', 'error',
          JSON.stringify({ invoice_id: invoiceId }),
          JSON.stringify({ error: apiError.message })
        )
        return NextResponse.json({ error: apiError.message, log_id: logId }, { status: 500 })
      }
    }

    // Diğer entegratörler için mevcut stub
    db.prepare(`
      INSERT INTO e_invoice_logs
      (id, invoice_id, provider, action, status, request_payload, response_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId, invoiceId, integration.provider, 'send', 'queued',
      JSON.stringify({ invoice_id: invoiceId }),
      JSON.stringify({ message: 'queued' })
    )

    return NextResponse.json({ success: true, status: 'queued', log_id: logId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

