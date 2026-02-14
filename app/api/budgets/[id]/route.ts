import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'

/** PATCH: Bütçe satırı güncelle (budgeted_amount). */
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const body = (await parseJsonBody(request).catch(() => ({}))) as { budgeted_amount?: number }
  const amount = typeof body.budgeted_amount === 'number' ? body.budgeted_amount : Number(body.budgeted_amount)
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'budgeted_amount 0 veya pozitif sayı olmalı' }, { status: 400 })
  }
  const db = getDatabase()
  const r = db.prepare('UPDATE budgets SET budgeted_amount = ?, created_at = ? WHERE id = ?').run(amount, new Date().toISOString(), id)
  if (r.changes === 0) return NextResponse.json({ error: 'Bütçe satırı bulunamadı' }, { status: 404 })
  const row = db.prepare('SELECT id, company_id, period, category, budgeted_amount, created_at FROM budgets WHERE id = ?').get(id)
  return NextResponse.json(row)
})

/** DELETE */
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  const db = getDatabase()
  const r = db.prepare('DELETE FROM budgets WHERE id = ?').run(id)
  if (r.changes === 0) return NextResponse.json({ error: 'Bütçe satırı bulunamadı' }, { status: 404 })
  return NextResponse.json({ success: true })
})
