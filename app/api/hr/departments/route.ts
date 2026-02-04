import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type DepartmentRow = {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  created_at: string
}

// GET: Departmanları listele
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const departments = db.prepare(`
      SELECT id, name, description, manager_id, created_at
      FROM hr_departments
      WHERE deleted_at IS NULL
      ORDER BY name
    `).all() as DepartmentRow[]
    return NextResponse.json(departments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni departman oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { name, description, manager_id } = body || {}
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_departments
      (id, name, description, manager_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(name).trim(),
      description ? String(description).trim() : null,
      manager_id ? String(manager_id).trim() : null
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
