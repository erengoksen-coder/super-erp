import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM hr_workplaces WHERE deleted_at IS NULL ORDER BY name').all()
  return NextResponse.json({ workplaces: rows })
})

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json() as { name?: string; address?: string | null; city?: string | null; country?: string | null; timezone?: string | null }
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
  }
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO hr_workplaces (id, name, address, city, country, timezone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(id, body.name.trim(), body.address ?? null, body.city ?? null, body.country ?? null, body.timezone ?? null)
  return NextResponse.json({ id }, { status: 201 })
})

export const PATCH = withAuth(async (request: NextRequest) => {
  const body = await request.json() as { id?: string; name?: string; address?: string | null; city?: string | null; country?: string | null; timezone?: string | null }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`
    UPDATE hr_workplaces
    SET name = COALESCE(?, name),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        timezone = COALESCE(?, timezone),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(body.name ?? null, body.address ?? null, body.city ?? null, body.country ?? null, body.timezone ?? null, body.id)
  return NextResponse.json({ success: true })
})

export const DELETE = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`UPDATE hr_workplaces SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(id)
  return NextResponse.json({ success: true })
})
