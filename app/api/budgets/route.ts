import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { DEFAULT_COMPANY_ID } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'

const BUDGET_CATEGORIES = ['Satış', 'Satın alma', 'Personel', 'Genel gider', 'Pazarlama', 'Ar-Ge', 'Diğer']

/** GET: Bütçe satırları; query: company_id?, period_start?, period_end? (period = YYYY-MM) */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('company_id') || DEFAULT_COMPANY_ID
  const periodStart = searchParams.get('period_start') || ''
  const periodEnd = searchParams.get('period_end') || ''

  const db = getDatabase()
  let sql = `SELECT id, company_id, period, category, budgeted_amount, created_at FROM budgets WHERE company_id = ?`
  const params: (string | number)[] = [companyId]
  if (periodStart) {
    sql += ` AND period >= ?`
    params.push(periodStart)
  }
  if (periodEnd) {
    sql += ` AND period <= ?`
    params.push(periodEnd)
  }
  sql += ` ORDER BY period DESC, category`

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string
    company_id: string
    period: string
    category: string
    budgeted_amount: number
    created_at: string
  }>
  return NextResponse.json(rows)
})

/** POST: Bütçe satırı ekle. body: period (YYYY-MM), category, budgeted_amount */
export const POST = withAuth(async (request: NextRequest) => {
  const body = await parseJsonBody(request).catch(() => ({})) as { period?: string; category?: string; budgeted_amount?: number }
  const period = body.period?.trim()
  const category = body.category?.trim()
  const budgetedAmount = typeof body.budgeted_amount === 'number' ? body.budgeted_amount : Number(body.budgeted_amount)

  if (!period || !category) {
    return NextResponse.json({ error: 'period (YYYY-MM) ve category gerekli' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: 'period YYYY-MM formatında olmalı (örn. 2024-01)' }, { status: 400 })
  }
  if (!Number.isFinite(budgetedAmount) || budgetedAmount < 0) {
    return NextResponse.json({ error: 'budgeted_amount 0 veya pozitif sayı olmalı' }, { status: 400 })
  }

  const db = getDatabase()
  const existing = db.prepare(
    'SELECT id, budgeted_amount FROM budgets WHERE company_id = ? AND period = ? AND category = ?'
  ).get(DEFAULT_COMPANY_ID, period, category) as { id: string } | undefined
  const now = new Date().toISOString()

  if (existing) {
    db.prepare('UPDATE budgets SET budgeted_amount = ?, created_at = ? WHERE id = ?').run(budgetedAmount, now, existing.id)
    const row = db.prepare('SELECT id, company_id, period, category, budgeted_amount, created_at FROM budgets WHERE id = ?').get(existing.id)
    return NextResponse.json(row)
  }

  const id = randomUUID()
  db.prepare(`
    INSERT INTO budgets (id, company_id, period, category, budgeted_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, DEFAULT_COMPANY_ID, period, category, budgetedAmount, now)
  const row = db.prepare('SELECT id, company_id, period, category, budgeted_amount, created_at FROM budgets WHERE id = ?').get(id)
  return NextResponse.json(row)
})
