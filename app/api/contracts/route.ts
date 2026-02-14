import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'

function deriveStatus(endDate: string): 'active' | 'expired' {
  const today = new Date().toISOString().split('T')[0]
  return endDate < today ? 'expired' : 'active'
}

/** GET: Liste; query: account_id, status (active|expired) */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id') || undefined
  const statusFilter = searchParams.get('status') || undefined

  const db = getDatabase()
  let sql = `
    SELECT c.id, c.account_id, c.title, c.start_date, c.end_date, c.status, c.notes, c.created_at, c.updated_at,
           a.name AS account_name, a.code AS account_code
    FROM contracts c
    LEFT JOIN accounts a ON a.id = c.account_id
    WHERE 1=1
  `
  const params: string[] = []
  if (accountId) {
    sql += ` AND c.account_id = ?`
    params.push(accountId)
  }
  sql += ` ORDER BY c.end_date ASC, c.created_at DESC`

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string
    account_id: string
    title: string
    start_date: string | null
    end_date: string
    status: string
    notes: string | null
    created_at: string
    updated_at: string
    account_name: string | null
    account_code: string | null
  }>

  let result = rows.map((r) => {
    const derived = deriveStatus(r.end_date)
    return { ...r, derived_status: derived }
  })
  if (statusFilter === 'active' || statusFilter === 'expired') {
    result = result.filter((r) => r.derived_status === statusFilter)
  }

  return NextResponse.json(result)
})

/** POST: Yeni sözleşme */
export const POST = withAuth(async (request: NextRequest) => {
  const body = await parseJsonBody(request).catch(() => ({}))
  const accountId = (body as { account_id?: string }).account_id
  const title = (body as { title?: string }).title?.trim()
  const startDate = (body as { start_date?: string }).start_date?.trim() || null
  const endDate = (body as { end_date?: string }).end_date?.trim()
  const notes = (body as { notes?: string }).notes?.trim() || null

  if (!accountId || !title || !endDate) {
    return NextResponse.json(
      { error: 'account_id, title ve end_date gerekli' },
      { status: 400 }
    )
  }

  const db = getDatabase()
  const account = db.prepare('SELECT id FROM accounts WHERE id = ?').get(accountId)
  if (!account) {
    return NextResponse.json({ error: 'Cari hesap bulunamadı' }, { status: 400 })
  }

  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO contracts (id, company_id, branch_id, account_id, title, start_date, end_date, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, accountId, title, startDate, endDate, notes, now, now)

  const row = db.prepare(`
    SELECT c.id, c.account_id, c.title, c.start_date, c.end_date, c.status, c.notes, c.created_at,
           a.name AS account_name, a.code AS account_code
    FROM contracts c
    LEFT JOIN accounts a ON a.id = c.account_id
    WHERE c.id = ?
  `).get(id) as object
  return NextResponse.json(row)
})
