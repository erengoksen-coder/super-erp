import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'

const CHECK_NOTE_REFERENCE_TYPE = 'check_note'

function recalcAccountBalance(db: ReturnType<typeof getDatabase>, accountId: string) {
  const balanceRow = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
    FROM account_transactions WHERE account_id = ?
  `).get(accountId) as { balance: number }
  db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceRow.balance, accountId)
}

export type CheckNoteRow = {
  id: string
  type: string
  direction: string
  account_id: string
  amount: number
  currency: string
  issue_date: string | null
  due_date: string
  bank_name: string | null
  check_or_note_number: string | null
  status: string
  notes: string | null
  given_to: string | null
  given_at: string | null
  given_to_account_id: string | null
  created_at: string
  updated_at: string
  account_name?: string | null
  account_code?: string | null
}

type CreateInput = {
  type: 'check' | 'promissory_note'
  direction: 'received' | 'given'
  account_id: string
  amount: number
  currency?: string
  issue_date?: string | null
  due_date: string
  bank_name?: string | null
  check_or_note_number?: string | null
  status?: string
  notes?: string | null
}

// GET: Çek ve senet listesi (filtre: type, direction, account_id)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const direction = searchParams.get('direction')
    const accountId = searchParams.get('account_id')
    const overdue = searchParams.get('overdue') === '1'

    const db = getDatabase()
    let query = `
      SELECT
        c.id, c.type, c.direction, c.account_id, c.amount, c.currency,
        c.issue_date, c.due_date, c.bank_name, c.check_or_note_number,
        c.status, c.notes, c.given_to, c.given_at, c.given_to_account_id,
        c.created_at, c.updated_at,
        a.name as account_name,
        a.code as account_code
      FROM checks_and_notes c
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.deleted_at IS NULL
    `
    const params: string[] = []
    if (type) {
      query += ' AND c.type = ?'
      params.push(type)
    }
    if (direction) {
      query += ' AND c.direction = ?'
      params.push(direction)
    }
    if (accountId) {
      query += ' AND c.account_id = ?'
      params.push(accountId)
    }
    if (overdue) {
      query += " AND c.due_date IS NOT NULL AND date(c.due_date) < date('now') AND c.status NOT IN ('collected', 'cancelled')"
    }
    query += ' ORDER BY c.due_date ASC, c.created_at DESC'
    const rows = db.prepare(query).all(...params) as CheckNoteRow[]
    return ok(rows)
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Checks-notes GET failed')
    apiLogger.error('Checks-notes API GET failed', { error: err.message })
    return fail(err.message, { status: 500 })
  }
})

// POST: Yeni çek veya senet ekle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as CreateInput
    const {
      type,
      direction,
      account_id,
      amount,
      currency = 'TRY',
      issue_date,
      due_date,
      bank_name,
      check_or_note_number,
      status = 'pending',
      notes,
    } = body

    if (!type || (type !== 'check' && type !== 'promissory_note')) {
      return fail('type "check" veya "promissory_note" olmalıdır', { status: 400 })
    }
    if (!direction || (direction !== 'received' && direction !== 'given')) {
      return fail('direction "received" veya "given" olmalıdır', { status: 400 })
    }
    if (!account_id) {
      return fail('Cari hesap (account_id) gerekli', { status: 400 })
    }
    if (amount == null || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      return fail('Tutar 0\'dan büyük olmalıdır', { status: 400 })
    }
    if (!due_date) {
      return fail('Vade tarihi (due_date) gerekli', { status: 400 })
    }

    const db = getDatabase()
    const account = db.prepare(`
      SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL
    `).get(account_id) as { id: string } | undefined
    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO checks_and_notes
      (id, type, direction, account_id, amount, currency, issue_date, due_date,
       bank_name, check_or_note_number, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      direction,
      account_id,
      Number(amount),
      currency || 'TRY',
      issue_date || null,
      due_date,
      bank_name ?? null,
      check_or_note_number ?? null,
      status || 'pending',
      notes ?? null,
      now,
      now
    )

    // Cari hareketi: çek/senet girişi caride hemen işlensin (bakiye ve hareket listesinde görünsün)
    const amountNum = Number(amount)
    const txId = randomUUID()
    if (direction === 'received') {
      // Alındığı cari: müşteri bize çek verdi → alacak (credit)
      db.prepare(`
        INSERT INTO account_transactions
        (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
        VALUES (?, ?, 'credit', ?, ?, ?, ?, ?)
      `).run(txId, account_id, amountNum, CHECK_NOTE_REFERENCE_TYPE, id, 'Çek/Senet alındı (Beklemede)', now)
    } else {
      // Verildiği cari: biz carideki cariye çek verdik → borç (debit)
      db.prepare(`
        INSERT INTO account_transactions
        (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
        VALUES (?, ?, 'debit', ?, ?, ?, ?, ?)
      `).run(txId, account_id, amountNum, CHECK_NOTE_REFERENCE_TYPE, id, 'Çek/Senet verildi (Beklemede)', now)
    }
    recalcAccountBalance(db, account_id)

    return ok({ id }, { status: 201, message: 'Kayıt eklendi' })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Checks-notes POST failed')
    apiLogger.error('Checks-notes API POST failed', { error: err.message })
    return fail(err.message, { status: 500 })
  }
})
