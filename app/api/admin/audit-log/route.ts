import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { apiLogger } from '@/lib/api/logger'

/** GET: Son admin işlemleri (audit_logs, table_name = admin_operation) - sadece admin */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
    const tableParam = searchParams.get('table')
    const tableFilter = tableParam === 'all' || tableParam === '' ? '' : (tableParam || 'admin_operation')

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
    const dataCols = 'COALESCE(a.old_data, a.before_data) as before_data, COALESCE(a.new_data, a.after_data) as after_data'
    const rows: Row[] = tableFilter
      ? (db.prepare(`
          SELECT a.id, a.table_name, a.action, a.record_id, a.user_id, ${dataCols}, a.created_at,
                 u.full_name as user_name, u.username
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          WHERE a.table_name = ?
          ORDER BY a.created_at DESC
          LIMIT ?
        `).all(tableFilter, limit) as Row[])
      : (db.prepare(`
          SELECT a.id, a.table_name, a.action, a.record_id, a.user_id, ${dataCols}, a.created_at,
                 u.full_name as user_name, u.username
          FROM audit_logs a
          LEFT JOIN users u ON u.id = a.user_id
          ORDER BY a.created_at DESC
          LIMIT ?
        `).all(limit) as Row[])

    const list = rows.map((r) => {
      let before_data: unknown = null
      let after_data: unknown = null
      try {
        if (r.before_data) before_data = JSON.parse(r.before_data)
      } catch {}
      try {
        if (r.after_data) after_data = JSON.parse(r.after_data)
      } catch {}
      return {
        id: r.id,
        table_name: r.table_name,
        action: r.action,
        record_id: r.record_id,
        user_id: r.user_id,
        user_name: r.user_name || r.username || r.user_id,
        before_data,
        after_data,
        created_at: r.created_at,
      }
    })

    return NextResponse.json(list)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Audit log hatası'
    apiLogger.error('Audit log GET failed', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}, ['admin'])
