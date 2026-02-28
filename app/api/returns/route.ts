import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID } from '@/lib/database/db'

function generateReturnNumber(db: ReturnType<typeof getDatabase>): string {
  const year = new Date().getFullYear()
  const prefix = `IAD-${year}`
  const last = db.prepare('SELECT return_number FROM customer_returns WHERE return_number LIKE ? ORDER BY return_number DESC LIMIT 1').get(`${prefix}-%`) as { return_number?: string } | undefined
  if (!last?.return_number) return `${prefix}-001`
  const n = parseInt(last.return_number.split('-').pop() || '0', 10)
  return `${prefix}-${String(n + 1).padStart(3, '0')}`
}

// GET: İade listesi
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customer_id')

    const db = getDatabase()
    let where = 'r.deleted_at IS NULL'
    const params: string[] = []
    if (status) { where += ' AND r.status = ?'; params.push(status) }
    if (customerId) { where += ' AND r.customer_id = ?'; params.push(customerId) }

    const rows = db.prepare(`
      SELECT r.*, a.name as customer_name, a.code as customer_code,
        (SELECT COUNT(*) FROM customer_return_items ri WHERE ri.return_id = r.id) as item_count
      FROM customer_returns r
      LEFT JOIN accounts a ON r.customer_id = a.id
      WHERE ${where}
      ORDER BY r.return_date DESC, r.created_at DESC
      LIMIT 200
    `).all(...params) as any[]
    return ok(rows)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Yeni iade (taslak)
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await parseJsonBody(request) as {
      customer_id: string
      account_id?: string
      return_date?: string
      notes?: string
      items?: Array<{ product_id: string; product_name?: string; quantity: number; unit_price?: number; reason?: string }>
    }
    const { customer_id, account_id, return_date, notes, items = [] } = body
    if (!customer_id) return fail('Müşteri seçimi gerekli', { status: 400 })

    const db = getDatabase()
    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND deleted_at IS NULL').get(customer_id || account_id) as { id: string } | undefined
    if (!account) return fail('Cari bulunamadı', { status: 404 })

    const id = randomUUID()
    const now = new Date().toISOString()
    const returnNumber = generateReturnNumber(db)
    const totalAmount = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)

    db.prepare(`
      INSERT INTO customer_returns (id, return_number, customer_id, account_id, return_date, status, total_amount, notes, company_id, branch_id, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
    `).run(id, returnNumber, customer_id, customer_id, return_date || now.slice(0, 10), totalAmount, notes || null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, now, now, user?.userId || null)

    const ins = db.prepare(`
      INSERT INTO customer_return_items (id, return_id, product_id, product_name, quantity, unit_price, total_price, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const item of items) {
      const qty = Number(item.quantity) || 0
      const up = Number(item.unit_price) || 0
      ins.run(randomUUID(), id, item.product_id, item.product_name || null, qty, up, qty * up, item.reason || null)
    }

    return ok({ id, return_number: returnNumber }, { status: 201 })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
