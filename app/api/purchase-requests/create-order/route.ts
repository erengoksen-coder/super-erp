import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'

/**
 * POST: Seçilen satın alma taleplerinden satın alma siparişi oluştur.
 * Body: { request_ids: string[] }
 * Talepler tedarikçiye göre gruplanır; her tedarikçi için bir sipariş oluşturulur ve talepler "ordered" yapılır.
 */
export const POST = withAuth(async (request: NextRequest) => {
  const body = await parseJsonBody(request)
  const { request_ids } = body
  if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
    return NextResponse.json(
      { error: 'request_ids (dizi) gerekli ve en az bir talep seçin' },
      { status: 400 }
    )
  }

  const db = getDatabase()
  const ids = [...new Set(request_ids)] as string[]

  const requests = db.prepare(`
    SELECT pr.*, m.supplier_id as material_supplier_id, pr.supplier_name as request_supplier_name
    FROM purchase_requests pr
    JOIN materials m ON pr.material_id = m.id AND m.deleted_at IS NULL
    WHERE pr.id IN (${ids.map(() => '?').join(',')}) AND pr.deleted_at IS NULL
  `).all(...ids) as any[]

  if (requests.length === 0) {
    return NextResponse.json({ error: 'Geçerli talep bulunamadı' }, { status: 404 })
  }

  const supplierIdFromName = (name: string | null): string | null => {
    if (!name || !String(name).trim()) return null
    const row = db.prepare(`
      SELECT id FROM accounts WHERE type = 'supplier' AND deleted_at IS NULL AND TRIM(LOWER(name)) = TRIM(LOWER(?)) LIMIT 1
    `).get(String(name).trim()) as { id: string } | undefined
    return row?.id ?? null
  }

  const firstSupplierId = db.prepare(`
    SELECT id FROM accounts WHERE type = 'supplier' AND deleted_at IS NULL LIMIT 1
  `).get() as { id: string } | undefined

  const grouped = new Map<string, typeof requests>()
  for (const r of requests) {
    let sid = r.material_supplier_id || supplierIdFromName(r.request_supplier_name) || firstSupplierId?.id
    if (!sid) {
      return NextResponse.json(
        { error: `Talep için tedarikçi bulunamadı: ${r.request_number}. Lütfen malzemeye tedarikçi atayın veya cari hesaplarda tedarikçi ekleyin.` },
        { status: 400 }
      )
    }
    if (!grouped.has(sid)) grouped.set(sid, [])
    grouped.get(sid)!.push(r)
  }

  const orderDate = new Date().toISOString().split('T')[0]
  const prefix = 'SIS'
  const todayStr = orderDate.replace(/-/g, '')
  const createdOrders: { id: string; order_number: string; supplier_id: string; item_count: number }[] = []

  let sequenceStart = 1
  const last = db.prepare(`
    SELECT order_number FROM purchase_orders 
    WHERE order_number LIKE ? AND (deleted_at IS NULL OR deleted_at = '')
    ORDER BY order_number DESC LIMIT 1
  `).get(`${prefix}-${todayStr}-%`) as { order_number: string } | undefined
  if (last) {
    sequenceStart = (parseInt(last.order_number.slice(-4), 10) || 0) + 1
  }

  db.transaction(() => {
    let seq = sequenceStart
    for (const [supplierId, reqs] of grouped) {
      const orderNumber = `${prefix}-${todayStr}-${String(seq).padStart(4, '0')}`
      seq++

      let totalAmount = 0
      for (const r of reqs) {
        totalAmount += (r.requested_quantity || 0) * (r.unit_price || 0)
      }

      const poId = randomUUID()
      db.prepare(`
        INSERT INTO purchase_orders (id, supplier_id, order_number, order_date, status, total_amount, final_amount, company_id, branch_id)
        VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `).run(poId, supplierId, orderNumber, orderDate, totalAmount, totalAmount, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      for (const r of reqs) {
        const itemId = randomUUID()
        const totalPrice = (r.requested_quantity || 0) * (r.unit_price || 0)
        db.prepare(`
          INSERT INTO purchase_order_items (id, purchase_order_id, material_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(itemId, poId, r.material_id, r.requested_quantity, r.unit_price || 0, totalPrice)
      }

      for (const r of reqs) {
        db.prepare('UPDATE purchase_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('ordered', r.id)
      }

      createdOrders.push({ id: poId, order_number: orderNumber, supplier_id: supplierId, item_count: reqs.length })
    }
  })()

  return NextResponse.json({
    success: true,
    message: `${createdOrders.length} satın alma siparişi oluşturuldu; talepler "Sipariş verildi" olarak güncellendi.`,
    orders: createdOrders,
  }, { status: 201 })
})
