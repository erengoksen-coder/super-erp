import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM hr_teams WHERE deleted_at IS NULL ORDER BY name').all()
  return NextResponse.json({ teams: rows })
})

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json() as { name?: string; department_id?: string | null; leader_id?: string | null }
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
  }
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO hr_teams (id, name, department_id, leader_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(id, body.name.trim(), body.department_id ?? null, body.leader_id ?? null)
  return NextResponse.json({ id }, { status: 201 })
})

export const PATCH = withAuth(async (request: NextRequest) => {
  const body = await request.json() as { id?: string; name?: string; department_id?: string | null; leader_id?: string | null }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`
    UPDATE hr_teams
    SET name = COALESCE(?, name),
        department_id = COALESCE(?, department_id),
        leader_id = COALESCE(?, leader_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(body.name ?? null, body.department_id ?? null, body.leader_id ?? null, body.id)
  return NextResponse.json({ success: true })
})

export const DELETE = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`UPDATE hr_teams SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(id)
  return NextResponse.json({ success: true })
})
