import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// PATCH: Vardiya şablonu güncelle
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const body = await parseJsonBody(request)
    const { name, start_time, end_time, break_minutes, working_days, is_active } = body || {}
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_shift_templates WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return NextResponse.json({ error: 'Vardiya bulunamadı' }, { status: 404 })
    db.prepare(`
      UPDATE hr_shift_templates
      SET name = COALESCE(?, name),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          break_minutes = COALESCE(?, break_minutes),
          working_days = COALESCE(?, working_days),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? String(name).trim() : null,
      start_time ? String(start_time).trim() : null,
      end_time ? String(end_time).trim() : null,
      break_minutes != null ? Number(break_minutes) : null,
      working_days != null ? String(working_days).trim() : null,
      is_active != null ? (is_active ? 1 : 0) : null,
      id
    )
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Vardiya şablonu (soft delete)
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const db = getDatabase()
    db.prepare('UPDATE hr_shift_templates SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
