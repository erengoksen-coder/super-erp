import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type EmployeeRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string | null
  created_at: string
}

// GET: Çalışanları listele
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const employees = db.prepare(`
      SELECT id, full_name, email, phone, status, created_at
      FROM hr_employees
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `).all() as EmployeeRow[]
    return NextResponse.json(employees)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni çalışan oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { full_name, email, phone, status } = body || {}

    if (!full_name || !String(full_name).trim()) {
      return NextResponse.json({ error: 'full_name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_employees
      (id, full_name, email, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(full_name).trim(),
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : null,
      status ? String(status).trim() : 'active'
    )

    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
