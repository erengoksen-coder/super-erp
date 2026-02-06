import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Vardiya şablonlarını listele
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT id, name, start_time, end_time, break_minutes, working_days, is_active, created_at
      FROM hr_shift_templates
      WHERE deleted_at IS NULL
      ORDER BY name
    `).all()
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni vardiya şablonu
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { name, start_time, end_time, break_minutes, working_days } = body || {}
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_shift_templates
      (id, name, start_time, end_time, break_minutes, working_days, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(name).trim(),
      start_time ? String(start_time).trim() : '09:00',
      end_time ? String(end_time).trim() : '18:00',
      break_minutes != null ? Number(break_minutes) : 60,
      working_days != null ? String(working_days).trim() : '1,2,3,4,5'
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
