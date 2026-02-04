import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Departman detayı
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const department = db.prepare(`
      SELECT *
      FROM hr_departments
      WHERE id = ? AND deleted_at IS NULL
    `).get(id)
    if (!department) {
      return NextResponse.json({ error: 'Departman bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(department)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Departman güncelle
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request)
    const { name, description, manager_id } = body || {}
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_departments WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Departman bulunamadı' }, { status: 404 })
    }
    db.prepare(`
      UPDATE hr_departments
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          manager_id = COALESCE(?, manager_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? String(name).trim() : null,
      description ? String(description).trim() : null,
      manager_id ? String(manager_id).trim() : null,
      id
    )
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Departman sil (soft delete)
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE hr_departments
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
