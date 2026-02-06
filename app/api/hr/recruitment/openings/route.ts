import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: İlanlar (status ile filtre)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const db = getDatabase()
    let query = `
      SELECT o.*, d.name as department_name
      FROM hr_job_openings o
      LEFT JOIN hr_departments d ON d.id = o.department_id AND d.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
    `
    const params: string[] = []
    if (status) {
      query += ' AND o.status = ?'
      params.push(status)
    }
    query += ' ORDER BY o.created_at DESC'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni ilan
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { title, department_id, location, description } = body || {}
    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: 'title gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_job_openings (id, title, department_id, location, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(title).trim(),
      department_id ? String(department_id).trim() : null,
      location ? String(location).trim() : null,
      description ? String(description).trim() : null
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
