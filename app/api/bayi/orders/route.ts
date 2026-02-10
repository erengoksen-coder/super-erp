import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { parseJsonBody } from '@/lib/api/validate'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type Db = ReturnType<typeof getDatabase>

type BayiOrderInput = {
  product_name?: string
  product_sku?: string | null
  product_id?: string | null
  quantity?: number
  unit_price?: number
  customer_name?: string | null
  customer_code?: string | null
  order_date?: string | null
  notes?: string | null
  configuration?: string | null
  fabric_code?: string | null
  case_info?: string | null
  leg_info?: string | null
  cushion_info?: string | null
  unit?: string | null
}

function createAccountIfNotExists(db: Db, dealerName: string | null): void {
  if (!dealerName || dealerName.trim() === '') return
  const trimmedName = dealerName.trim()
  const existing = db.prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE').get(trimmedName) as { id: string } | undefined
  if (existing) return
  try {
    const lastRow = db.prepare('SELECT code FROM accounts WHERE type = ? AND deleted_at IS NULL ORDER BY code DESC LIMIT 1').get('customer') as { code: string } | undefined
    let codeNum = 1
    if (lastRow?.code) {
      const n = parseInt(lastRow.code.replace(/[^0-9]/g, ''), 10) || 0
      codeNum = n + 1
    }
    const code = `MUS-${String(codeNum).padStart(4, '0')}`
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    db.prepare('INSERT INTO accounts (id, code, name, type, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)').run(id, code, trimmedName, 'customer', null, null)
  } catch (e) {
    console.error('Cari oluşturulamadı:', trimmedName, e)
  }
}

/** BOM’da kayıtlı ürün ID’lerini döndürür (aktif versiyon). */
function getProductIdsWithBom(db: Db): Set<string> {
  try {
    const rows = db.prepare(`
      SELECT DISTINCT b.product_id
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      WHERE b.deleted_at IS NULL
    `).all() as Array<{ product_id: string }>
    return new Set(rows.map((r) => r.product_id))
  } catch {
    try {
      const rows = db.prepare('SELECT DISTINCT product_id FROM bom WHERE deleted_at IS NULL').all() as Array<{ product_id: string }>
      return new Set(rows.map((r) => r.product_id))
    } catch {
      return new Set()
    }
  }
}

/** Kumaş kodu/adı hammadde depoda (materials) var mı kontrol eder. */
function isMaterialInStore(db: Db, fabricCode: string | null): boolean {
  if (!fabricCode || !fabricCode.trim()) return true
  const trimmed = fabricCode.trim()
  const row = db.prepare('SELECT id FROM materials WHERE (code = ? OR name = ? COLLATE NOCASE) AND deleted_at IS NULL').get(trimmed, trimmed) as { id: string } | undefined
  return !!row
}

/**
 * Bayi kullanıcısının kendi cari adına ait siparişleri.
 * Sadece role=bayi ve dealer_name dolu kullanıcılar erişir.
 */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  const normalizedRole = (user.role || '').toString().trim().toLowerCase()
  if (normalizedRole !== 'bayi') {
    return fail('Bu alan sadece bayi kullanıcıları içindir', { status: 403 })
  }

  const db = getDatabase()
  const u = db.prepare('SELECT dealer_name FROM users WHERE id = ? AND deleted_at IS NULL').get(user.userId) as { dealer_name: string | null } | undefined
  const dealerName = (u?.dealer_name || '').trim()
  if (!dealerName) {
    return ok([])
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = `
    SELECT 
      o.id, o.order_number, o.dealer_name, o.customer_name, o.customer_code,
      o.product_name, o.product_sku, o.product_id, o.quantity, o.unit_price, o.total_amount,
      o.order_date, o.delivery_date, o.status, o.production_order_id, o.configuration, o.notes, o.created_at,
      po.order_number as production_order_number,
      po.due_date as production_order_due_date
    FROM active_orders o
    LEFT JOIN production_orders po ON po.id = o.production_order_id AND (po.deleted_at IS NULL OR po.deleted_at = '')
    WHERE TRIM(o.dealer_name) = ? AND o.company_id = ? AND o.branch_id = ?
  `
  const params: (string | number)[] = [dealerName, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID]

  if (status && ['pending', 'in_production', 'completed', 'cancelled'].includes(status)) {
    query += ' AND o.status = ?'
    params.push(status)
  }

  query += ' ORDER BY COALESCE(o.order_date, o.created_at) DESC'

  const orders = db.prepare(query).all(...params)
  return ok(orders, { headers: CACHE_HEADERS_SHORT })
})

/**
 * Bayi sipariş girişi. Sadece role=bayi; dealer_name kullanıcıdan alınır, body'de gönderilmez.
 */
export const POST = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  const normalizedRole = (user.role || '').toString().trim().toLowerCase()
  if (normalizedRole !== 'bayi') {
    return fail('Bu alan sadece bayi kullanıcıları içindir', { status: 403 })
  }

  const db = getDatabase()
  const u = db.prepare('SELECT dealer_name FROM users WHERE id = ? AND deleted_at IS NULL').get(user.userId) as { dealer_name: string | null } | undefined
  const dealerName = (u?.dealer_name || '').trim()
  if (!dealerName) {
    return fail('Bayi cari adı tanımlı değil. Yönetici ile iletişime geçin.', { status: 400 })
  }

  let body: { orders?: BayiOrderInput[] }
  try {
    body = await parseJsonBody(request) as { orders?: BayiOrderInput[] }
  } catch {
    return fail('Geçersiz JSON', { status: 400 })
  }
  const manualOrders = body?.orders
  if (!Array.isArray(manualOrders) || manualOrders.length === 0) {
    return fail('En az bir sipariş kalemi gerekli.', { status: 400 })
  }

  const productIdsWithBom = getProductIdsWithBom(db)

  for (const order of manualOrders) {
    const quantity = Number(order.quantity) || 0
    if (quantity <= 0) continue

    let productId: string | null = order.product_id || null
    if (!productId && order.product_sku) {
      const row = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(order.product_sku) as { id: string } | undefined
      if (row) productId = row.id
    }
    if (!productId && order.product_name) {
      const row = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${order.product_name}%`) as { id: string } | undefined
      if (row) productId = row.id
    }
    if (!productId || !productIdsWithBom.has(productId)) {
      return fail('Ürün adı yanlış', { status: 400 })
    }
    if (order.fabric_code?.trim() && !isMaterialInStore(db, order.fabric_code)) {
      return fail('Kumaş adı yanlış', { status: 400 })
    }
  }

  createAccountIfNotExists(db, dealerName)

  const inserted: { id: string; order_number: string; product_name?: string; quantity?: number }[] = []

  const run = db.transaction(() => {
    for (const order of manualOrders) {
      const quantity = Number(order.quantity) || 0
      const unitPrice = Number(order.unit_price) || 0
      if (quantity <= 0) continue

      let combinedNotes = (order.notes || '').trim()
      if (order.fabric_code?.trim()) combinedNotes += (combinedNotes ? ' | ' : '') + `Kumaş: ${order.fabric_code.trim()}`
      if (order.case_info?.trim()) combinedNotes += (combinedNotes ? ' | ' : '') + `Kasa: ${order.case_info.trim()}`
      if (order.leg_info?.trim()) combinedNotes += (combinedNotes ? ' | ' : '') + `Ayak: ${order.leg_info.trim()}`
      if (order.cushion_info?.trim()) combinedNotes += (combinedNotes ? ' | ' : '') + `Kirlent: ${order.cushion_info.trim()}`
      if (order.unit?.trim()) combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${order.unit.trim()}`

      let productId: string | null = order.product_id || null
      if (!productId && order.product_sku) {
        const row = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(order.product_sku) as { id: string } | undefined
        if (row) productId = row.id
      }
      if (!productId && order.product_name) {
        const row = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${order.product_name}%`) as { id: string } | undefined
        if (row) productId = row.id
      }

      const orderId = randomUUID()
      const orderNumber = `SIP-${Date.now()}-${randomUUID().substring(0, 8)}`
      const productName = order.product_name || order.product_sku || ''
      const totalAmount = quantity * unitPrice

      db.prepare(`
        INSERT INTO orders (
          id, order_number, dealer_name, customer_name, customer_code, product_name, product_sku,
          product_id, quantity, unit_price, total_amount, order_date, delivery_date, status,
          configuration, notes, company_id, branch_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        orderId,
        orderNumber,
        dealerName,
        order.customer_name ?? null,
        order.customer_code ?? null,
        productName,
        order.product_sku ?? null,
        productId,
        quantity,
        unitPrice,
        totalAmount,
        order.order_date ?? null,
        order.configuration ?? null,
        combinedNotes || null,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID
      )
      inserted.push({ id: orderId, order_number: orderNumber, product_name: productName, quantity })
    }
  })
  run()

  // Planlama, admin ve yönetici rollerine anlık bildirim gönder (Tamam’a basana kadar ekranda kalsın)
  try {
    const targetUsers = db.prepare(`
      SELECT id FROM users
      WHERE deleted_at IS NULL
        AND (
          LOWER(TRIM(COALESCE(role, ''))) IN ('admin', 'yönetici', 'yonetici')
          OR LOWER(TRIM(COALESCE(position, ''))) = 'planlama'
        )
    `).all() as Array<{ id: string }>
    const title = 'Yeni bayi siparişi'
    const message = `${dealerName} tarafından ${inserted.length} adet sipariş girildi.`
    const refType = 'bayi_order'
    const refId = inserted[0]?.id ?? ''
    for (const { id: targetUserId } of targetUsers) {
      if (targetUserId === user.userId) continue
      const notifId = randomUUID()
      db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, read, created_at)
        VALUES (?, ?, ?, ?, 'bayi_order', ?, ?, 0, CURRENT_TIMESTAMP)
      `).run(notifId, targetUserId, title, message, refType, refId)
    }
  } catch (e) {
    console.warn('[bayi/orders] Bildirim yazılamadı:', e)
  }

  return ok({ orders: inserted }, { message: `${inserted.length} sipariş oluşturuldu` })
})
