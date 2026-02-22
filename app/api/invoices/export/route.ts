import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import * as XLSX from 'xlsx'

// GET: Faturaları Excel olarak dışa aktar
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const startDate = searchParams.get('start_date') || ''
    const endDate = searchParams.get('end_date') || ''
    const limit = Math.min(EXPORT_MAX_LIMIT, parseInt(searchParams.get('limit') || String(EXPORT_MAX_LIMIT), 10) || EXPORT_MAX_LIMIT)

    const db = getDatabase()
    let query = `
      SELECT 
        i.invoice_number as "Fatura No",
        a.name as "Müşteri",
        a.code as "Müşteri Kodu",
        s.shipment_number as "Sevkiyat No",
        i.invoice_date as "Fatura Tarihi",
        i.type as "Tip",
        i.status as "Durum",
        i.total_amount as "Ara Toplam",
        i.tax_rate as "KDV Oranı",
        i.tax_amount as "KDV Tutarı",
        i.final_amount as "Genel Toplam",
        i.notes as "Notlar",
        i.created_at as "Oluşturulma"
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      LEFT JOIN shipments s ON i.shipment_id = s.id
      WHERE i.deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (customerId) {
      query += ' AND i.customer_id = ?'
      params.push(customerId)
    }
    if (status) {
      query += ' AND i.status = ?'
      params.push(status)
    }
    if (type) {
      query += ' AND i.type = ?'
      params.push(type)
    }
    if (startDate) {
      query += ' AND i.invoice_date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      query += ' AND i.invoice_date <= ?'
      params.push(endDate)
    }
    query += ' ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT ?'
    params.push(limit)

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[]
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 35 }, { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(workbook, sheet, 'Faturalar')
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="faturalar_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Export hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
