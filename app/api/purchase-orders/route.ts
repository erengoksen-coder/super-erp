import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Satın alma siparişleri listesi
export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT 
      po.id,
      po.order_number,
      po.order_date,
      po.status,
      po.total_amount,
      po.final_amount,
      po.supplier_id,
      a.name as supplier_name,
      (SELECT COUNT(*) FROM purchase_order_items WHERE purchase_order_id = po.id AND (deleted_at IS NULL OR deleted_at = '')) as total_items
    FROM purchase_orders po
    LEFT JOIN accounts a ON po.supplier_id = a.id AND a.deleted_at IS NULL
    WHERE (po.deleted_at IS NULL OR po.deleted_at = '')
      AND (po.company_id = ? OR po.company_id IS NULL)
      AND (po.branch_id = ? OR po.branch_id IS NULL)
    ORDER BY po.order_date DESC, po.created_at DESC
  `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any[]
  return NextResponse.json(rows)
})

// POST: Yeni satın alma siparişi oluştur
export const POST = withAuth(async (request: NextRequest) => {
  const body = await parseJsonBody(request)
  const { supplier_id, order_date, status, payment_terms_days, notes, items } = body
  if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'supplier_id ve en az bir kalem (items) gerekli' },
      { status: 400 }
    )
  }

  const db = getDatabase()

  const validItems = items
    .filter((i: any) => i.material_id && (i.quantity || 0) > 0)
    .map((i: any) => ({
      material_id: i.material_id,
      quantity: Number(i.quantity) || 0,
      unit_price: Number(i.unit_price) || 0,
    }))
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'En az bir geçerli kalem gerekli' }, { status: 400 })
  }

  const orderDate = order_date || new Date().toISOString().split('T')[0]
  const totalAmount = validItems.reduce((sum: number, i: any) => sum + i.quantity * i.unit_price, 0)

  let orderNumber: string
  const prefix = 'SIS'
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const last = db.prepare(`
    SELECT order_number FROM purchase_orders 
    WHERE order_number LIKE ? AND (deleted_at IS NULL OR deleted_at = '')
    ORDER BY order_number DESC LIMIT 1
  `).get(`${prefix}-${todayStr}-%`) as { order_number: string } | undefined
  if (last) {
    const num = parseInt(last.order_number.slice(-4), 10) || 0
    orderNumber = `${prefix}-${todayStr}-${String(num + 1).padStart(4, '0')}`
  } else {
    orderNumber = `${prefix}-${todayStr}-0001`
  }

  const id = randomUUID()
  db.transaction(() => {
    db.prepare(`
      INSERT INTO purchase_orders (id, supplier_id, order_number, order_date, status, total_amount, final_amount, payment_terms_days, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      supplier_id,
      orderNumber,
      orderDate,
      status || 'pending',
      totalAmount,
      totalAmount,
      payment_terms_days ?? null,
      DEFAULT_COMPANY_ID,
      DEFAULT_BRANCH_ID
    )
    for (const item of validItems) {
      const itemId = randomUUID()
      const totalPrice = item.quantity * item.unit_price
      db.prepare(`
        INSERT INTO purchase_order_items (id, purchase_order_id, material_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(itemId, id, item.material_id, item.quantity, item.unit_price, totalPrice)
    }
  })()

  const created = db.prepare(`
    SELECT po.*, a.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN accounts a ON po.supplier_id = a.id
    WHERE po.id = ?
  `).get(id) as any

  return NextResponse.json(created, { status: 201 })
})
