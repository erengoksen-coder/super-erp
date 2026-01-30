import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM hr_holidays WHERE deleted_at IS NULL ORDER BY date').all()
  return NextResponse.json({ holidays: rows })
})

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json() as { date?: string; name?: string; is_working_day?: number }
  if (!body.date || !body.name) {
    return NextResponse.json({ error: 'date ve name gerekli' }, { status: 400 })
  }
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO hr_holidays
    (id, date, name, is_working_day, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(id, body.date, body.name, body.is_working_day ?? 0)
  return NextResponse.json({ id }, { status: 201 })
})

export const PATCH = withAuth(async (request: NextRequest) => {
  const body = await request.json() as { id?: string; name?: string; is_working_day?: number }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`
    UPDATE hr_holidays
    SET name = COALESCE(?, name),
        is_working_day = COALESCE(?, is_working_day),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(body.name ?? null, body.is_working_day ?? null, body.id)
  return NextResponse.json({ success: true })
})

export const DELETE = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`UPDATE hr_holidays SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(id)
  return NextResponse.json({ success: true })
})
