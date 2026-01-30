import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type PaymentRow = {
  id: string
  account_id: string
  invoice_id: string | null
  amount: number
  payment_date: string
  method: string | null
  type: 'receipt' | 'payment'
  cash_box_id: string | null
  bank_id: string | null
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  account_name?: string | null
  account_code?: string | null
  invoice_number?: string | null
  invoice_final_amount?: number | null
}

type PaymentCreateInput = {
  account_id?: string
  invoice_id?: string | null
  amount?: number
  payment_date?: string
  method?: string | null
  type?: 'receipt' | 'payment'
  cash_box_id?: string | null
  bank_id?: string | null
  reference_type?: string | null
  reference_id?: string | null
  notes?: string | null
}

// GET: Ödeme/tahsilatları listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
    const invoiceId = searchParams.get('invoice_id')
    const type = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const db = getDatabase()
    let query = `
      SELECT 
        p.*,
        a.name as account_name,
        a.code as account_code,
        i.invoice_number,
        i.final_amount as invoice_final_amount
      FROM payments p
      LEFT JOIN accounts a ON p.account_id = a.id
      LEFT JOIN invoices i ON p.invoice_id = i.id
      WHERE p.deleted_at IS NULL
    `
    const params: string[] = []

    if (accountId) {
      query += ' AND p.account_id = ?'
      params.push(accountId)
    }
    if (invoiceId) {
      query += ' AND p.invoice_id = ?'
      params.push(invoiceId)
    }
    if (type) {
      query += ' AND p.type = ?'
      params.push(type)
    }
    if (startDate) {
      query += ' AND p.payment_date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      query += ' AND p.payment_date <= ?'
      params.push(endDate)
    }

    query += ' ORDER BY p.payment_date DESC, p.created_at DESC'
    const rows = db.prepare(query).all(...params) as PaymentRow[]
    return ok(rows)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Ödeme/tahsilat oluştur ve cari hareketi yaz
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as PaymentCreateInput
    const {
      account_id,
      invoice_id,
      amount,
      payment_date,
      method,
      type = 'receipt',
      cash_box_id,
      bank_id,
      reference_type,
      reference_id,
      notes,
    } = body

    if (!account_id) {
      return fail('account_id gerekli', { status: 400 })
    }
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      return fail('Tutar 0\'dan büyük olmalıdır', { status: 400 })
    }
    if (type !== 'receipt' && type !== 'payment') {
      return fail('type "receipt" veya "payment" olmalıdır', { status: 400 })
    }

    const db = getDatabase()
    const account = db.prepare(`
      SELECT id, name, code, balance FROM accounts
      WHERE id = ? AND deleted_at IS NULL
    `).get(account_id) as { id: string; name: string; code: string; balance: number } | undefined

    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    let invoiceFinalAmount: number | null = null
    if (invoice_id) {
      const invoice = db.prepare(`
        SELECT id, final_amount, status
        FROM invoices
        WHERE id = ? AND deleted_at IS NULL
      `).get(invoice_id) as { id: string; final_amount: number; status: string } | undefined
      if (!invoice) {
        return fail('Fatura bulunamadı', { status: 404 })
      }
      invoiceFinalAmount = invoice.final_amount || 0
    }

    const paymentId = randomUUID()
    const transactionId = randomUUID()
    const normalizedAmount = Number(amount)
    const transactionType = type === 'receipt' ? 'credit' : 'debit'
    const paymentDate = payment_date || new Date().toISOString()
    const description = notes || (type === 'receipt' ? 'Tahsilat' : 'Ödeme')

    db.transaction(() => {
      db.prepare(`
        INSERT INTO payments
        (id, account_id, invoice_id, amount, payment_date, method, type, cash_box_id, bank_id, reference_type, reference_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        paymentId,
        account_id,
        invoice_id || null,
        normalizedAmount,
        paymentDate,
        method || null,
        type,
        cash_box_id || null,
        bank_id || null,
        reference_type || null,
        reference_id || null,
        notes || null
      )

      db.prepare(`
        INSERT INTO account_transactions
        (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        transactionId,
        account_id,
        transactionType,
        normalizedAmount,
        'payment',
        paymentId,
        description
      )

      const balanceDelta = transactionType === 'credit' ? -normalizedAmount : normalizedAmount
      db.prepare(`
        UPDATE accounts
        SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(balanceDelta, account_id)

      if (cash_box_id) {
        const cashDelta = type === 'receipt' ? normalizedAmount : -normalizedAmount
        db.prepare(`
          UPDATE cash_boxes
          SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(cashDelta, cash_box_id)
      }
      if (bank_id) {
        const bankDelta = type === 'receipt' ? normalizedAmount : -normalizedAmount
        db.prepare(`
          UPDATE banks
          SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(bankDelta, bank_id)
      }

      if (invoice_id && type === 'receipt') {
        const paidRow = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as total_paid
          FROM payments
          WHERE invoice_id = ? AND type = 'receipt' AND deleted_at IS NULL
        `).get(invoice_id) as { total_paid: number } | undefined
        const totalPaid = paidRow?.total_paid || 0
        const newStatus = invoiceFinalAmount !== null && totalPaid >= invoiceFinalAmount ? 'paid' : 'issued'
        db.prepare(`
          UPDATE invoices
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newStatus, invoice_id)
      }
    })()

    return ok({ id: paymentId }, { status: 201, message: 'Ödeme kaydedildi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
