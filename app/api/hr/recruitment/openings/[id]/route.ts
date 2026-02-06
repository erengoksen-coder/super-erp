import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Tek ilan
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const db = getDatabase()
    const row = db.prepare(`
      SELECT o.*, d.name as department_name
      FROM hr_job_openings o
      LEFT JOIN hr_departments d ON d.id = o.department_id AND d.deleted_at IS NULL
      WHERE o.id = ? AND o.deleted_at IS NULL
    `).get(id)
    if (!row) return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 })
    return NextResponse.json(row)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: İlan güncelle (status: open/closed)
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const body = await parseJsonBody(request)
    const { title, department_id, location, description, status } = body || {}
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_job_openings WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return NextResponse.json({ error: 'İlan bulunamadı' }, { status: 404 })
    db.prepare(`
      UPDATE hr_job_openings
      SET title = COALESCE(?, title),
          department_id = COALESCE(?, department_id),
          location = COALESCE(?, location),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title ? String(title).trim() : null,
      department_id != null ? String(department_id).trim() || null : null,
      location != null ? String(location).trim() || null : null,
      description != null ? String(description).trim() || null : null,
      status ? String(status).trim() : null,
      id
    )
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
