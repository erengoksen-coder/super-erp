import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok } from '@/lib/api/response'

const LIMIT = 5

/** GET /api/search?q=... — Sipariş, cari ve fatura için hızlı arama (Ctrl+K). */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) {
    return ok({ orders: [], accounts: [], invoices: [] })
  }
  const like = `%${q}%`
  const db = getDatabase()

  const orders = db
    .prepare(
      `SELECT id, order_number, dealer_name, customer_name, product_name
       FROM orders
       WHERE deleted_at IS NULL
         AND (order_number LIKE ? OR dealer_name LIKE ? OR customer_name LIKE ? OR product_name LIKE ?)
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(like, like, like, like, LIMIT) as Array<{
    id: string
    order_number: string
    dealer_name: string | null
    customer_name: string | null
    product_name: string | null
  }>

  const accounts = db
    .prepare(
      `SELECT id, code, name
       FROM accounts
       WHERE deleted_at IS NULL
         AND (name LIKE ? OR code LIKE ?)
       ORDER BY name
       LIMIT ?`
    )
    .all(like, like, LIMIT) as Array<{ id: string; code: string; name: string }>

  const invoices = db
    .prepare(
      `SELECT id, invoice_number, customer_name, type
       FROM invoices
       WHERE deleted_at IS NULL
         AND (invoice_number LIKE ? OR customer_name LIKE ?)
       ORDER BY invoice_date DESC, created_at DESC
       LIMIT ?`
    )
    .all(like, like, LIMIT) as Array<{
    id: string
    invoice_number: string
    customer_name: string | null
    type: string
  }>

  return ok({
    orders: orders.map((o) => ({
      id: o.id,
      label: o.order_number,
      sub: [o.dealer_name, o.customer_name, o.product_name].filter(Boolean).join(' · ') || undefined,
      href: `/orders`,
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      label: `${a.code} — ${a.name}`,
      href: `/accounts/${a.id}`,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      label: i.invoice_number,
      sub: i.customer_name ?? undefined,
      href: `/invoices/${i.id}`,
    })),
  })
})
