import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { apiLogger } from '@/lib/api/logger'
import * as XLSX from 'xlsx'

/** GET: Denetim kaydı Excel dışa aktarma (tarih filtresi opsiyonel) - sadece admin */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 5000, 10000)
    const tableParam = searchParams.get('table')
    const tableFilter = tableParam === 'all' || tableParam === '' ? '' : (tableParam || 'admin_operation')
    const fromDate = searchParams.get('from') || ''
    const toDate = searchParams.get('to') || ''

    type Row = {
      id: string
      table_name: string
      action: string
      record_id: string | null
      user_id: string | null
      before_data: string | null
      after_data: string | null
      created_at: string
      user_name: string | null
      username: string | null
    }
    const db = getDatabase()
    let rows: Row[] = []
    if (tableFilter) {
      if (fromDate && toDate) {
        rows = db.prepare(`
          SELECT a.id, a.table_name, a.action, a.record_id, a.user_id, a.before_data, a.after_data, a.created_at,
                 u.full_name as user_name, u.username
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.table_name = ? AND date(a.created_at) >= date(?) AND date(a.created_at) <= date(?)
          ORDER BY a.created_at DESC
          LIMIT ?
        `).all(tableFilter, fromDate, toDate, limit) as Row[]
      } else {
        rows = db.prepare(`
          SELECT a.id, a.table_name, a.action, a.record_id, a.user_id, a.before_data, a.after_data, a.created_at,
                 u.full_name as user_name, u.username
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.table_name = ?
          ORDER BY a.created_at DESC
          LIMIT ?
        `).all(tableFilter, limit) as Row[]
      }
    } else {
      if (fromDate && toDate) {
        rows = db.prepare(`
          SELECT a.id, a.table_name, a.action, a.record_id, a.user_id, a.before_data, a.after_data, a.created_at,
                 u.full_name as user_name, u.username
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE date(a.created_at) >= date(?) AND date(a.created_at) <= date(?)
          ORDER BY a.created_at DESC
          LIMIT ?
        `).all(fromDate, toDate, limit) as Row[]
      } else {
        rows = db.prepare(`
          SELECT a.id, a.table_name, a.action, a.record_id, a.user_id, a.before_data, a.after_data, a.created_at,
                 u.full_name as user_name, u.username
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC
          LIMIT ?
        `).all(limit) as Row[]
      }
    }

    const exportData = rows.map((r) => ({
      Tarih: r.created_at,
      Tablo: r.table_name,
      İşlem: r.action,
      'Kayıt ID': r.record_id || '',
      Kullanıcı: r.user_name || r.username || r.user_id || '',
      'Önceki (özet)': r.before_data ? (r.before_data.length > 200 ? r.before_data.slice(0, 200) + '...' : r.before_data) : '',
      'Sonraki (özet)': r.after_data ? (r.after_data.length > 200 ? r.after_data.slice(0, 200) + '...' : r.after_data) : '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 28 },
      { wch: 18 },
      { wch: 36 },
      { wch: 36 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Denetim Kaydı')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `Denetim_Kaydi_${new Date().toISOString().split('T')[0]}.xlsx`
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dışa aktarma hatası'
    apiLogger.error('Audit log export failed', { error: message, stack: e instanceof Error ? e.stack : undefined })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}, ['admin'])
