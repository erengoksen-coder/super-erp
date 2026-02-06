import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: İzin bakiyeleri (employee_id ve/veya year ile filtre)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

    const db = getDatabase()
    let query = `
      SELECT b.*, e.full_name as employee_name
      FROM hr_timeoff_balances b
      JOIN hr_employees e ON e.id = b.employee_id AND e.deleted_at IS NULL
      WHERE b.deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (employeeId) {
      query += ' AND b.employee_id = ?'
      params.push(employeeId)
    }
    query += ' AND b.year = ?'
    params.push(year)
    query += ' ORDER BY e.full_name'

    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Bakiye oluştur veya güncelle (yıllık hak / devir)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { employee_id, year, annual_entitlement, carried_over } = body || {}
    if (!employee_id || !year) {
      return NextResponse.json({ error: 'employee_id ve year gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const y = parseInt(String(year), 10)
    const entitlement = annual_entitlement != null ? Number(annual_entitlement) : 14
    const carried = carried_over != null ? Number(carried_over) : 0

    const existing = db.prepare(
      'SELECT id, used FROM hr_timeoff_balances WHERE employee_id = ? AND year = ? AND deleted_at IS NULL'
    ).get(employee_id, y) as { id: string; used: number } | undefined

    if (existing) {
      const remaining = entitlement + carried - existing.used
      db.prepare(`
        UPDATE hr_timeoff_balances
        SET annual_entitlement = ?, carried_over = ?, remaining = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(entitlement, carried, Math.max(0, remaining), existing.id)
      return NextResponse.json({ id: existing.id })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_timeoff_balances
      (id, employee_id, year, annual_entitlement, carried_over, used, remaining, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, employee_id, y, entitlement, carried, entitlement + carried)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
