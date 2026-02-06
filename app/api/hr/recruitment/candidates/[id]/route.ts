import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// PATCH: Aday durumu güncelle (status: applied, interview, offer, rejected)
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    const body = await parseJsonBody(request)
    const { status, notes } = body || {}
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_job_candidates WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return NextResponse.json({ error: 'Aday bulunamadı' }, { status: 404 })
    db.prepare(`
      UPDATE hr_job_candidates
      SET status = COALESCE(?, status), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status ? String(status).trim() : null, notes != null ? String(notes).trim() || null : null, id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
