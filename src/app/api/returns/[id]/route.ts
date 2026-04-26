import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'
import { DEFAULT_WAREHOUSE_ID, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'

function recalcAccountBalance(db: ReturnType<typeof getDatabase>, accountId: string) {
  const r = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
    FROM account_transactions WHERE account_id = ?
  `).get(accountId) as { balance: number }
  db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(r.balance, accountId)
}

// GET: İade detay
export const GET = withAuth(async (request: NextRequest, _user: any, context?: any) => {
  try {
    const resolvedParams = await (context as any)?.params
    const id = resolvedParams?.id
    if (!id) return fail('ID gerekli', { status: 400 })
    const db = getDatabase()
    const row = db.prepare(`
      SELECT r.*, a.name as customer_name, a.code as customer_code
      FROM customer_returns r
      LEFT JOIN accounts a ON r.customer_id = a.id
      WHERE r.id = ? AND r.deleted_at IS NULL
    `).get(id) as any
    if (!row) return fail('İade bulunamadı', { status: 404 })
    const items = db.prepare('SELECT * FROM customer_return_items WHERE return_id = ?').all(id) as any[]
    return ok({ ...row, items })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Onayla → stok girişi + cari mahsup
export const POST = withAuth(async (request: NextRequest, _user: any, context?: any) => {
  try {
    const resolvedParams = await (context as any)?.params
    const id = resolvedParams?.id
    if (!id) return fail('ID gerekli', { status: 400 })

    const db = getDatabase()
    const ret = db.prepare('SELECT * FROM customer_returns WHERE id = ? AND deleted_at IS NULL').get(id) as any
    if (!ret) return fail('İade bulunamadı', { status: 404 })
    if (ret.status !== 'draft') return fail('Sadece taslak iadeler onaylanabilir', { status: 400 })

    const items = db.prepare('SELECT * FROM customer_return_items WHERE return_id = ?').all(id) as any[]
    if (items.length === 0) return fail('En az bir kalem gerekli', { status: 400 })

    const now = new Date().toISOString()

    db.transaction(() => {
      db.prepare('UPDATE customer_returns SET status = ?, updated_at = ? WHERE id = ?').run('confirmed', now, id)

      for (const item of items) {
        const movId = randomUUID()
        db.prepare(`
          INSERT INTO stock_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, company_id, branch_id, warehouse_id, to_warehouse_id, created_at)
          VALUES (?, ?, 'in', ?, 'customer_return', ?, ?, ?, ?, ?, ?, ?)
        `).run(movId, item.product_id, item.quantity, id, `İade ${ret.return_number}`, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID, DEFAULT_WAREHOUSE_ID, now)
      }

      const txId = randomUUID()
      db.prepare(`
        INSERT INTO account_transactions (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
        VALUES (?, ?, 'credit', ?, 'customer_return', ?, ?, ?)
      `).run(txId, ret.account_id, ret.total_amount, id, `Müşteri iadesi ${ret.return_number} (cari mahsup)`, now)
      recalcAccountBalance(db, ret.account_id)
    })()

    return ok({ success: true, message: 'İade onaylandı. Stok girişi ve cari mahsup yapıldı.' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// PATCH: Güncelle (sadece draft)
export const PATCH = withAuth(async (request: NextRequest, _user: any, context?: any) => {
  try {
    const resolvedParams = await (context as any)?.params
    const id = resolvedParams?.id
    if (!id) return fail('ID gerekli', { status: 400 })
    const body = await parseJsonBody(request) as { notes?: string; status?: string }
    const db = getDatabase()
    const existing = db.prepare('SELECT id, status FROM customer_returns WHERE id = ? AND deleted_at IS NULL').get(id) as any
    if (!existing) return fail('İade bulunamadı', { status: 404 })
    if (existing.status !== 'draft') return fail('Sadece taslak düzenlenebilir', { status: 400 })

    const updates: string[] = ['updated_at = ?']
    const params: any[] = [new Date().toISOString()]
    if (body.notes !== undefined) { updates.push('notes = ?'); params.push(body.notes) }
    if (body.status === 'cancelled') { updates.push('status = ?'); params.push('cancelled') }
    params.push(id)
    db.prepare(`UPDATE customer_returns SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return ok({ success: true })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
