import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

/** GET: Tek fırsat */
export const GET = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  const row = db.prepare(`
    SELECT o.id, o.account_id, o.title, o.stage, o.amount, o.expected_close_date, o.notes, o.created_at, o.updated_at,
           a.name AS account_name, a.code AS account_code
    FROM crm_opportunities o LEFT JOIN accounts a ON a.id = o.account_id WHERE o.id = ?
  `).get(id)
  if (!row) return NextResponse.json({ error: 'Fırsat bulunamadı' }, { status: 404 })
  return NextResponse.json(row)
})

/** PATCH: Güncelle (stage, amount, expected_close_date, notes, title) */
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const body = (await parseJsonBody(request).catch(() => ({}))) as Record<string, unknown>
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM crm_opportunities WHERE id = ?').get(id)
  if (!existing) return NextResponse.json({ error: 'Fırsat bulunamadı' }, { status: 404 })

  const updates: string[] = []
  const values: unknown[] = []
  if (body.title !== undefined) {
    updates.push('title = ?')
    values.push(String(body.title).trim())
  }
  if (body.stage !== undefined && STAGES.includes(String(body.stage))) {
    updates.push('stage = ?')
    values.push(String(body.stage))
  }
  if (body.amount !== undefined) {
    updates.push('amount = ?')
    values.push(Number(body.amount) || 0)
  }
  if (body.expected_close_date !== undefined) {
    updates.push('expected_close_date = ?')
    values.push(body.expected_close_date ? String(body.expected_close_date).trim() : null)
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?')
    values.push(body.notes ? String(body.notes).trim() : null)
  }
  if (updates.length === 0) {
    const row = db.prepare(`
      SELECT o.id, o.account_id, o.title, o.stage, o.amount, o.expected_close_date, o.notes, o.created_at, o.updated_at,
             a.name AS account_name, a.code AS account_code
      FROM crm_opportunities o LEFT JOIN accounts a ON a.id = o.account_id WHERE o.id = ?
    `).get(id)
    return NextResponse.json(row)
  }
  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)
  db.prepare(`UPDATE crm_opportunities SET ${updates.join(', ')} WHERE id = ?`).run(...values)

  const row = db.prepare(`
    SELECT o.id, o.account_id, o.title, o.stage, o.amount, o.expected_close_date, o.notes, o.created_at, o.updated_at,
           a.name AS account_name, a.code AS account_code
    FROM crm_opportunities o LEFT JOIN accounts a ON a.id = o.account_id WHERE o.id = ?
  `).get(id)
  return NextResponse.json(row)
})

/** DELETE */
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  const r = db.prepare('DELETE FROM crm_opportunities WHERE id = ?').run(id)
  if (r.changes === 0) return NextResponse.json({ error: 'Fırsat bulunamadı' }, { status: 404 })
  return NextResponse.json({ success: true })
})
