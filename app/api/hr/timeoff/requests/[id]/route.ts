import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Tek talep detayı
export const GET = withAuth(async (_request: NextRequest, user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const db = getDatabase()
    const row = db.prepare(`
      SELECT r.*, e.full_name as employee_name
      FROM hr_timeoff_requests r
      JOIN hr_employees e ON e.id = r.employee_id AND e.deleted_at IS NULL
      WHERE r.id = ? AND r.deleted_at IS NULL
    `).get(id)
    if (!row) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Onayla / Reddet
export const PATCH = withAuth(async (request: NextRequest, user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const body = await parseJsonBody(request)
    const { status: newStatus } = body || {}
    if (!newStatus || !['approved', 'rejected'].includes(newStatus)) {
      return NextResponse.json({ error: 'status: approved veya rejected olmalı' }, { status: 400 })
    }

    const db = getDatabase()
    const row = db.prepare(`
      SELECT id, employee_id, start_date, total_days, status
      FROM hr_timeoff_requests WHERE id = ? AND deleted_at IS NULL
    `).get(id) as { id: string; employee_id: string; start_date: string; total_days: number; status: string } | undefined
    if (!row) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Talep zaten işlenmiş' }, { status: 400 })
    }

    const approverId = user?.userId ?? null
    db.prepare(`
      UPDATE hr_timeoff_requests
      SET status = ?, approver_id = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, approverId, id)

    if (newStatus === 'approved') {
      const year = new Date(row.start_date).getFullYear()
      const balance = db.prepare(`
        SELECT id, used, remaining FROM hr_timeoff_balances
        WHERE employee_id = ? AND year = ? AND deleted_at IS NULL
      `).get(row.employee_id, year) as { id: string; used: number; remaining: number } | undefined
      if (balance) {
        const newUsed = balance.used + row.total_days
        const newRemaining = Math.max(0, balance.remaining - row.total_days)
        db.prepare(`
          UPDATE hr_timeoff_balances SET used = ?, remaining = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(newUsed, newRemaining, balance.id)
      }
    }

    return NextResponse.json({ id, status: newStatus })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
