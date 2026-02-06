import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

function countBusinessDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  let count = 0
  const d = new Date(s)
  while (d <= e) {
    const day = d.getDay()
    if (day !== 0 && day !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// GET: İzin taleplerini listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam, 10) : null

    const db = getDatabase()
    let query = `
      SELECT r.*, e.full_name as employee_name
      FROM hr_timeoff_requests r
      JOIN hr_employees e ON e.id = r.employee_id AND e.deleted_at IS NULL
      WHERE r.deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (employeeId) {
      query += ' AND r.employee_id = ?'
      params.push(employeeId)
    }
    if (status) {
      query += ' AND r.status = ?'
      params.push(status)
    }
    if (year) {
      query += " AND (CAST(strftime('%Y', r.start_date) AS INT) = ? OR CAST(strftime('%Y', r.end_date) AS INT) = ?)"
      params.push(year, year)
    }
    query += ' ORDER BY r.start_date DESC, r.created_at DESC'

    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni izin talebi
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { employee_id, type, start_date, end_date, reason, notes } = body || {}
    if (!employee_id || !type || !start_date || !end_date) {
      return NextResponse.json({ error: 'employee_id, type, start_date, end_date gerekli' }, { status: 400 })
    }
    const totalDays = countBusinessDays(start_date, end_date)
    if (totalDays <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tarih aralığı seçin' }, { status: 400 })
    }

    const db = getDatabase()
    const balanceRow = db.prepare(`
      SELECT remaining FROM hr_timeoff_balances
      WHERE employee_id = ? AND year = ? AND deleted_at IS NULL
    `).get(employee_id, new Date(start_date).getFullYear()) as { remaining: number } | undefined
    const available = balanceRow ? balanceRow.remaining : 0
    if (available < totalDays) {
      return NextResponse.json(
        { error: `Yeterli izin bakiyesi yok. Mevcut: ${available} gün, talep: ${totalDays} gün` },
        { status: 400 }
      )
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_timeoff_requests
      (id, employee_id, type, start_date, end_date, total_days, status, reason, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      employee_id,
      String(type).trim(),
      start_date,
      end_date,
      totalDays,
      reason ? String(reason).trim() : null,
      notes ? String(notes).trim() : null
    )
    return NextResponse.json({ id, total_days: totalDays }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
