import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const PATCH = withAuth(async (request: NextRequest, user, context: any) => {
  const body = await request.json().catch(() => ({})) as { status?: string; notes?: string | null }
  const id = context?.params?.requestId
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`
    UPDATE hr_timeoff_requests
    SET status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        approver_id = COALESCE(?, approver_id),
        approved_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE approved_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND deleted_at IS NULL
  `).run(
    body.status ?? null,
    body.notes ?? null,
    user?.userId ?? null,
    body.status ?? null,
    id
  )
  return NextResponse.json({ success: true })
})

export const DELETE = withAuth(async (_request: NextRequest, _user, context: any) => {
  const id = context?.params?.requestId
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  db.prepare(`UPDATE hr_timeoff_requests SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(id)
  return NextResponse.json({ success: true })
})
