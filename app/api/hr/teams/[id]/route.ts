import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Takım detayı
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const team = db.prepare(`
      SELECT *
      FROM hr_teams
      WHERE id = ? AND deleted_at IS NULL
    `).get(id)
    if (!team) {
      return NextResponse.json({ error: 'Takım bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(team)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Takım güncelle
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request)
    const { name, department_id, leader_id } = body || {}
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_teams WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Takım bulunamadı' }, { status: 404 })
    }
    db.prepare(`
      UPDATE hr_teams
      SET name = COALESCE(?, name),
          department_id = COALESCE(?, department_id),
          leader_id = COALESCE(?, leader_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? String(name).trim() : null,
      department_id ? String(department_id).trim() : null,
      leader_id ? String(leader_id).trim() : null,
      id
    )
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Takım sil (soft delete)
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE hr_teams
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
