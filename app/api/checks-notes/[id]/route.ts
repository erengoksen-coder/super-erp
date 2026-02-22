import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'
import { randomUUID } from 'crypto'
import type { CheckNoteRow } from '../route'

const CHECK_NOTE_REFERENCE_TYPE = 'check_note'

function recalcAccountBalance(db: ReturnType<typeof getDatabase>, accountId: string) {
  const balanceRow = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
    FROM account_transactions WHERE account_id = ?
  `).get(accountId) as { balance: number }
  db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceRow.balance, accountId)
}

type UpdateInput = {
  type?: 'check' | 'promissory_note'
  direction?: 'received' | 'given'
  account_id?: string
  amount?: number
  currency?: string
  issue_date?: string | null
  due_date?: string
  bank_name?: string | null
  check_or_note_number?: string | null
  status?: string
  notes?: string | null
  given_to?: string | null
  given_at?: string | null
  given_to_account_id?: string | null
}

async function resolveId(request: NextRequest, context?: unknown): Promise<string> {
  const resolved = await Promise.resolve(
    (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
  )
  const id = typeof resolved?.id === 'string' ? resolved.id : new URL(request.url).pathname.split('/').filter(Boolean).pop()
  return id ?? ''
}

// GET: Tek çek/senet detayı
export const GET = withAuth(async (request: NextRequest, _user, context?: unknown) => {
  try {
    const id = await resolveId(request, context)
    if (!id) return fail('ID gerekli', { status: 400 })

    const db = getDatabase()
    const row = db.prepare(`
      SELECT
        c.id, c.type, c.direction, c.account_id, c.amount, c.currency,
        c.issue_date, c.due_date, c.bank_name, c.check_or_note_number,
        c.status, c.notes, c.given_to, c.given_at, c.given_to_account_id,
        c.created_at, c.updated_at,
        a.name as account_name,
        a.code as account_code
      FROM checks_and_notes c
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `).get(id) as CheckNoteRow | undefined
    if (!row) return fail('Kayıt bulunamadı', { status: 404 })
    return ok(row)
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Checks-notes GET by id failed')
    apiLogger.error('Checks-notes API GET [id] failed', { error: err.message })
    return fail(err.message, { status: 500 })
  }
})

// PUT: Güncelle
export const PUT = withAuth(async (request: NextRequest, _user, context?: unknown) => {
  try {
    const id = await resolveId(request, context)
    if (!id) return fail('ID gerekli', { status: 400 })

    const body = await parseJsonBody(request) as UpdateInput
    const db = getDatabase()
    const existing = db.prepare(`
      SELECT id, account_id, status, amount, direction, given_to_account_id FROM checks_and_notes WHERE id = ? AND deleted_at IS NULL
    `).get(id) as { id: string; account_id: string; status: string; amount: number; direction: string; given_to_account_id: string | null } | undefined
    if (!existing) return fail('Kayıt bulunamadı', { status: 404 })

    if (body.account_id != null) {
      const account = db.prepare(`
        SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL
      `).get(body.account_id) as { id: string } | undefined
      if (!account) return fail('Cari hesap bulunamadı', { status: 404 })
    }

    const newStatus = body.status !== undefined ? body.status : existing.status
    if (newStatus === 'given' && (body.given_at === undefined || body.given_at === null || body.given_at === '')) {
      body.given_at = new Date().toISOString().split('T')[0]
    }

    const updates: string[] = []
    const values: unknown[] = []
    const allowed: (keyof UpdateInput)[] = [
      'type', 'direction', 'account_id', 'amount', 'currency',
      'issue_date', 'due_date', 'bank_name', 'check_or_note_number', 'status', 'notes',
      'given_to', 'given_at', 'given_to_account_id'
    ]
    for (const key of allowed) {
      const v = body[key]
      if (v === undefined) continue
      if (key === 'amount' && (Number.isNaN(Number(v)) || Number(v) <= 0)) continue
      if (key === 'type' && v !== 'check' && v !== 'promissory_note') continue
      if (key === 'direction' && v !== 'received' && v !== 'given') continue
      updates.push(`${key} = ?`)
      values.push(v === null || v === '' ? null : v)
    }

    if (updates.length === 0) return ok({ id })

    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    db.prepare(`
      UPDATE checks_and_notes SET ${updates.join(', ')} WHERE id = ?
    `).run(...values)

    // Cari alacak/borç:
    // 1) Alındığı cari (account_id): Bize çek veren müşteri → "Çek alındı" açıklaması, CREDIT → Alacaklı (yeşil).
    // 2) Verildiği cari (given_to_account_id): Bizim çek verdiğimiz cari → "Çek verildi" açıklaması, DEBIT → Borçlu (kırmızı).
    const accountId = body.account_id ?? existing.account_id
    const amount = body.amount ?? existing.amount
    const prevStatus = existing.status
    const prevGivenToAccountId = existing.given_to_account_id
    const newGivenToAccountId = body.given_to_account_id !== undefined ? (body.given_to_account_id || null) : prevGivenToAccountId
    const txId = randomUUID()

    if (newStatus === 'given' && prevStatus !== 'given' && existing.direction === 'received') {
      // Alındığı cari: POST'ta zaten hareket oluşturulduysa sadece açıklamayı güncelle, yoksa insert (eski kayıtlar)
      const existingTx = db.prepare(`
        SELECT id FROM account_transactions
        WHERE account_id = ? AND reference_type = ? AND reference_id = ?
      `).get(accountId, CHECK_NOTE_REFERENCE_TYPE, id) as { id: string } | undefined
      if (existingTx) {
        db.prepare(`
          UPDATE account_transactions SET description = ? WHERE account_id = ? AND reference_type = ? AND reference_id = ?
        `).run('Çek/Senet alındı', accountId, CHECK_NOTE_REFERENCE_TYPE, id)
      } else {
        db.prepare(`
          INSERT INTO account_transactions
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'credit', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(txId, accountId, amount, CHECK_NOTE_REFERENCE_TYPE, id, 'Çek/Senet alındı')
      }
      recalcAccountBalance(db, accountId)
      // Bizim çek verdiğimiz cari → Borçlu: debit, açıklama "Çek/Senet verildi"
      if (newGivenToAccountId) {
        const debitId = randomUUID()
        db.prepare(`
          INSERT INTO account_transactions
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'debit', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          debitId,
          newGivenToAccountId,
          amount,
          CHECK_NOTE_REFERENCE_TYPE,
          id,
          'Çek/Senet verildi'
        )
        recalcAccountBalance(db, newGivenToAccountId)
      }
    } else if (newStatus !== 'given' && prevStatus === 'given' && existing.direction === 'received') {
      if (prevGivenToAccountId) {
        db.prepare(`
          DELETE FROM account_transactions
          WHERE account_id = ? AND reference_type = ? AND reference_id = ?
        `).run(prevGivenToAccountId, CHECK_NOTE_REFERENCE_TYPE, id)
        recalcAccountBalance(db, prevGivenToAccountId)
      }
      // Alındığı cari: hareketi silme, açıklamayı (Beklemede) yap (POST'ta oluşturulmuş hareket kalsın)
      const upd = db.prepare(`
        UPDATE account_transactions SET description = ? WHERE account_id = ? AND reference_type = ? AND reference_id = ?
      `).run('Çek/Senet alındı (Beklemede)', accountId, CHECK_NOTE_REFERENCE_TYPE, id)
      if (upd.changes === 0) {
        db.prepare(`
          INSERT INTO account_transactions
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'credit', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(txId, accountId, amount, CHECK_NOTE_REFERENCE_TYPE, id, 'Çek/Senet alındı (Beklemede)')
      }
      recalcAccountBalance(db, accountId)
    } else if (newStatus === 'given' && prevStatus === 'given' && newGivenToAccountId !== prevGivenToAccountId) {
      if (prevGivenToAccountId) {
        db.prepare(`
          DELETE FROM account_transactions
          WHERE account_id = ? AND reference_type = ? AND reference_id = ?
        `).run(prevGivenToAccountId, CHECK_NOTE_REFERENCE_TYPE, id)
        recalcAccountBalance(db, prevGivenToAccountId)
      }
      if (newGivenToAccountId) {
        const debitId = randomUUID()
        db.prepare(`
          INSERT INTO account_transactions
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'debit', ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          debitId,
          newGivenToAccountId,
          amount,
          CHECK_NOTE_REFERENCE_TYPE,
          id,
          'Çek/Senet verildi'
        )
        recalcAccountBalance(db, newGivenToAccountId)
      }
    }

    return ok({ id }, { message: 'Güncellendi' })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Checks-notes PUT failed')
    apiLogger.error('Checks-notes API PUT failed', { error: err.message })
    return fail(err.message, { status: 500 })
  }
})

// DELETE: Soft delete
export const DELETE = withAuth(async (request: NextRequest, _user, context?: unknown) => {
  try {
    const id = await resolveId(request, context)
    if (!id) return fail('ID gerekli', { status: 400 })

    const db = getDatabase()
    const existing = db.prepare(`
      SELECT id, account_id, given_to_account_id FROM checks_and_notes WHERE id = ? AND deleted_at IS NULL
    `).get(id) as { id: string; account_id: string; given_to_account_id: string | null } | undefined
    if (!existing) return fail('Kayıt bulunamadı', { status: 404 })

    db.prepare(`
      DELETE FROM account_transactions WHERE reference_type = ? AND reference_id = ?
    `).run(CHECK_NOTE_REFERENCE_TYPE, id)
    recalcAccountBalance(db, existing.account_id)
    if (existing.given_to_account_id) recalcAccountBalance(db, existing.given_to_account_id)

    const now = new Date().toISOString()
    db.prepare(`
      UPDATE checks_and_notes SET deleted_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, id)
    return ok({ id }, { message: 'Silindi' })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Checks-notes DELETE failed')
    apiLogger.error('Checks-notes API DELETE failed', { error: err.message })
    return fail(err.message, { status: 500 })
  }
})
