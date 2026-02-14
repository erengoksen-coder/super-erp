import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'

/** GET: Kur listesi; query: from_currency?, to_currency?, rate_date? (YYYY-MM-DD), limit? */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from_currency') || undefined
  const to = searchParams.get('to_currency') || undefined
  const rateDate = searchParams.get('rate_date') || undefined
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))

  const db = getDatabase()
  let sql = `SELECT id, from_currency, to_currency, rate, rate_date, created_at FROM currency_rates WHERE 1=1`
  const params: (string | number)[] = []
  if (from) {
    sql += ` AND from_currency = ?`
    params.push(from)
  }
  if (to) {
    sql += ` AND to_currency = ?`
    params.push(to)
  }
  if (rateDate) {
    sql += ` AND rate_date = ?`
    params.push(rateDate)
  }
  sql += ` ORDER BY rate_date DESC, from_currency, to_currency LIMIT ?`
  params.push(limit)

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string
    from_currency: string
    to_currency: string
    rate: number
    rate_date: string
    created_at: string
  }>
  return NextResponse.json(rows)
})

/** POST: Kur ekle. body: from_currency, to_currency, rate, rate_date (YYYY-MM-DD) */
export const POST = withAuth(async (request: NextRequest) => {
  const body = await parseJsonBody(request).catch(() => ({})) as {
    from_currency?: string
    to_currency?: string
    rate?: number
    rate_date?: string
  }
  const fromCurrency = (body.from_currency || 'USD').toString().toUpperCase().slice(0, 3)
  const toCurrency = (body.to_currency || 'TRY').toString().toUpperCase().slice(0, 3)
  const rate = typeof body.rate === 'number' ? body.rate : Number(body.rate)
  const rateDate = (body.rate_date || new Date().toISOString().split('T')[0]).toString().slice(0, 10)

  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: 'Geçerli bir kur girin (pozitif sayı)' }, { status: 400 })
  }

  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO currency_rates (id, from_currency, to_currency, rate, rate_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, fromCurrency, toCurrency, rate, rateDate, new Date().toISOString())

  const row = db.prepare('SELECT id, from_currency, to_currency, rate, rate_date, created_at FROM currency_rates WHERE id = ?').get(id)
  return NextResponse.json(row)
})
