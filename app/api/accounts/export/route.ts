import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import { getExportLimits, applyExportRowLimit } from '@/lib/auth/export-limits'
import { fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'
import * as XLSX from 'xlsx'

// GET: Cari hesapları Excel olarak dışa aktar
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role?: string }) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  const db = getDatabase()
  const limits = getExportLimits(db, user.userId, user.role)
  if (!limits.canExport) {
    return fail('Dışa aktarma yetkiniz yok. Yönetici ile iletişime geçin.', { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || ''
    const requestedLimit = Math.min(EXPORT_MAX_LIMIT, parseInt(searchParams.get('limit') || String(EXPORT_MAX_LIMIT), 10) || EXPORT_MAX_LIMIT)
    const limit = applyExportRowLimit(requestedLimit, limits, EXPORT_MAX_LIMIT)
    let query = `
      SELECT 
        code as "Kod",
        name as "Ad/Ünvan",
        type as "Tip",
        tax_number as "Vergi No",
        phone as "Telefon",
        email as "E-posta",
        address as "Adres",
        risk_limit as "Risk Limiti",
        discount_rate as "İskonto Oranı",
        balance as "Bakiye",
        authorized_person_name as "Yetkili Adı",
        authorized_person_phone as "Yetkili Telefon",
        created_at as "Oluşturulma"
      FROM accounts
      WHERE deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (type && type !== 'all') {
      query += ' AND type = ?'
      params.push(type)
    }
    query += ' ORDER BY code ASC LIMIT ?'
    params.push(limit)

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[]
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(rows)
    sheet['!cols'] = [
      { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(workbook, sheet, 'Cari Hesaplar')
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="cari_hesaplar_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Export hatası'
    apiLogger.error('Accounts export failed', { error: message, userId: user?.userId })
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
