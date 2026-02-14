import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'

function deriveStatus(endDate: string): 'active' | 'expired' {
  const today = new Date().toISOString().split('T')[0]
  return endDate < today ? 'expired' : 'active'
}

/** GET: Tek sözleşme */
export const GET = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const db = getDatabase()
  const row = db.prepare(`
    SELECT c.id, c.account_id, c.title, c.start_date, c.end_date, c.status, c.notes, c.created_at, c.updated_at,
           a.name AS account_name, a.code AS account_code
    FROM contracts c
    LEFT JOIN accounts a ON a.id = c.account_id
    WHERE c.id = ?
  `).get(id) as Record<string, unknown> | undefined
  if (!row) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 })
  const endDate = row.end_date as string
  return NextResponse.json({ ...row, derived_status: deriveStatus(endDate) })
})

/** PATCH: Güncelle */
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const body = (await parseJsonBody(request).catch(() => ({}))) as Record<string, unknown>
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM contracts WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 })

  const updates: string[] = []
  const values: unknown[] = []
  if (body.title !== undefined) {
    updates.push('title = ?')
    values.push(typeof body.title === 'string' ? body.title.trim() : body.title)
  }
  if (body.start_date !== undefined) {
    updates.push('start_date = ?')
    values.push(body.start_date ? String(body.start_date).trim() : null)
  }
  if (body.end_date !== undefined) {
    updates.push('end_date = ?')
    values.push(String(body.end_date).trim())
  }
  if (body.status !== undefined) {
    updates.push('status = ?')
    values.push(String(body.status))
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?')
    values.push(body.notes ? String(body.notes).trim() : null)
  }
  if (updates.length === 0) {
    const row = db.prepare(`
      SELECT c.id, c.account_id, c.title, c.start_date, c.end_date, c.status, c.notes, c.created_at, c.updated_at,
             a.name AS account_name, a.code AS account_code
      FROM contracts c LEFT JOIN accounts a ON a.id = c.account_id WHERE c.id = ?
    `).get(id) as Record<string, unknown>
    return NextResponse.json({ ...row, derived_status: deriveStatus((row.end_date as string) || '') })
  }
  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)
  db.prepare(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const row = db.prepare(`
    SELECT c.id, c.account_id, c.title, c.start_date, c.end_date, c.status, c.notes, c.created_at, c.updated_at,
           a.name AS account_name, a.code AS account_code
    FROM contracts c LEFT JOIN accounts a ON a.id = c.account_id WHERE c.id = ?
  `).get(id) as Record<string, unknown>
  return NextResponse.json({ ...row, derived_status: deriveStatus((row.end_date as string) || '') })
})

/** DELETE */
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  const r = db.prepare('DELETE FROM contracts WHERE id = ?').run(id)
  if (r.changes === 0) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 })
  return NextResponse.json({ success: true })
})
