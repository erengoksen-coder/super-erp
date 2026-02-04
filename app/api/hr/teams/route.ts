import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type TeamRow = {
  id: string
  name: string
  department_id: string | null
  leader_id: string | null
  created_at: string
}

// GET: Takımları listele
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const teams = db.prepare(`
      SELECT id, name, department_id, leader_id, created_at
      FROM hr_teams
      WHERE deleted_at IS NULL
      ORDER BY name
    `).all() as TeamRow[]
    return NextResponse.json(teams)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni takım oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { name, department_id, leader_id } = body || {}
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_teams
      (id, name, department_id, leader_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(name).trim(),
      department_id ? String(department_id).trim() : null,
      leader_id ? String(leader_id).trim() : null
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
