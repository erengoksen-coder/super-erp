import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { DEFAULT_COMPANY_ID } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

/** GET: Fırsat listesi; query: account_id?, stage? */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id') || undefined
  const stage = searchParams.get('stage') || undefined

  const db = getDatabase()
  let sql = `
    SELECT o.id, o.account_id, o.title, o.stage, o.amount, o.expected_close_date, o.notes, o.created_at, o.updated_at,
           a.name AS account_name, a.code AS account_code
    FROM crm_opportunities o
    LEFT JOIN accounts a ON a.id = o.account_id
    WHERE 1=1
  `
  const params: string[] = []
  if (accountId) {
    sql += ` AND o.account_id = ?`
    params.push(accountId)
  }
  if (stage) {
    sql += ` AND o.stage = ?`
    params.push(stage)
  }
  sql += ` ORDER BY o.stage, o.expected_close_date ASC, o.created_at DESC`

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string
    account_id: string
    title: string
    stage: string
    amount: number
    expected_close_date: string | null
    notes: string | null
    created_at: string
    updated_at: string
    account_name: string | null
    account_code: string | null
  }>
  return NextResponse.json(rows)
})

/** POST: Yeni fırsat */
export const POST = withAuth(async (request: NextRequest) => {
  const body = await parseJsonBody(request).catch(() => ({})) as {
    account_id?: string
    title?: string
    stage?: string
    amount?: number
    expected_close_date?: string
    notes?: string
  }
  const accountId = body.account_id?.trim()
  const title = body.title?.trim()
  const stage = STAGES.includes(body.stage || '') ? body.stage : 'lead'
  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount) || 0
  const expectedCloseDate = body.expected_close_date?.trim() || null
  const notes = body.notes?.trim() || null

  if (!accountId || !title) {
    return NextResponse.json({ error: 'account_id ve title gerekli' }, { status: 400 })
  }

  const db = getDatabase()
  const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId)
  if (!account) {
    return NextResponse.json({ error: 'Cari hesap bulunamadı' }, { status: 400 })
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO crm_opportunities (id, company_id, account_id, title, stage, amount, expected_close_date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, DEFAULT_COMPANY_ID, accountId, title, stage, amount, expectedCloseDate, notes, now, now)

  const row = db.prepare(`
    SELECT o.id, o.account_id, o.title, o.stage, o.amount, o.expected_close_date, o.notes, o.created_at,
           a.name AS account_name, a.code AS account_code
    FROM crm_opportunities o LEFT JOIN accounts a ON a.id = o.account_id WHERE o.id = ?
  `).get(id) as object
  return NextResponse.json(row)
})
