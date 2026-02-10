import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { apiLogger } from '@/lib/api/logger'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_LIST } from '@/lib/api/cache'
import { logAudit } from '@/lib/audit'
import { logAudit as logAuditEntry } from '@/lib/audit/logger'
import { withAuth, withAuthAndPermission } from '@/lib/api/withAuth'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 500

type Db = ReturnType<typeof getDatabase>

type AccountIdRow = {
  id: string
}

type AccountCodeRow = {
  code: string
}

type OrderRow = {
  order_number: string
  status: string
  production_order_id: string | null
  product_id: string | null
  customer_name: string | null
  dealer_name: string | null
  matched_product_name?: string | null
  matched_product_sku?: string | null
  order_date?: string | null
  created_at?: string | null
  [key: string]: unknown
}

type ManualOrderInput = {
  order_number?: string
  notes?: string
  fabric_code?: string
  case_info?: string
  leg_info?: string
  cushion_info?: string
  unit?: string
  product_id?: string | null
  product_sku?: string | null
  product_name?: string
  dealer_name?: string | null
  customer_name?: string | null
  customer_code?: string | null
  quantity?: number
  unit_price?: number
  order_date?: string | null
  configuration?: string | null
}

type ProductIdRow = {
  id: string
}

type InsertedOrder = {
  id: string
  order_number: string
  product_name?: string
  quantity?: number
  status: 'pending'
  product_id: string | null
}

type OrderStatusRow = {
  id: string
  status: string
  production_order_id: string | null
  order_number: string
}

// Bayi isminden otomatik cari hesap oluştur (eşer yoksa)
function createAccountIfNotExists(db: Db, dealerName: string | null): void {
  if (!dealerName || dealerName.trim() === '') {
    return
  }

  const trimmedName = dealerName.trim()
  
  // Aynı isimde cari hesap var mı kontrol et
  const existingAccount = db
    .prepare('SELECT id FROM accounts WHERE name = ? COLLATE NOCASE')
    .get(trimmedName) as AccountIdRow | undefined
  
  if (existingAccount) {
    // Zaten var, oluşturma
    return
  }

  try {
    // Kod oluştur
    const lastAccount = db.prepare(`
      SELECT code FROM accounts 
      WHERE type = 'customer' 
      ORDER BY code DESC 
      LIMIT 1
    `).get() as AccountCodeRow | undefined
    
    let codeNumber = 1
    if (lastAccount) {
      const lastNum = parseInt(lastAccount.code.replace(/[^0-9]/g, '')) || 0
      codeNumber = lastNum + 1
    }
    
    const code = `MUS-${String(codeNumber).padStart(4, '0')}`
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Cari hesap oluştur (created_by ve updated_by NULL, FOREIGN KEY constraint için)
    db.prepare(`
      INSERT INTO accounts (id, code, name, type, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, code, trimmedName, 'customer', null, null)
  } catch (error: any) {
    // Hata durumunda detaylı log
    console.error(`Cari hesap oluşturulamadı (${trimmedName}):`, {
      error: error.message,
      stack: error.stack,
      dealerName: trimmedName
    })
    // Hata olsa bile devam et (duplicate key vb. durumlar için)
  }
}

function createMaterialIfNotExists(db: Db, fabricCode: string | null, unit?: string | null): void {
  if (!fabricCode || fabricCode.trim() === '') {
    return
  }

  const trimmedCode = fabricCode.trim()
  // Hammadde adı = kumaş kodu (siparişten otomatik alırken)
  const name = trimmedCode
  const existingMaterial = db
    .prepare('SELECT id, unit FROM materials WHERE (code = ? OR name = ? COLLATE NOCASE) AND deleted_at IS NULL')
    .all(trimmedCode, trimmedCode) as Array<{ id: string; unit: string | null }>

  if (existingMaterial.length > 0) {
    const hasMetre = existingMaterial.some((row) => (row.unit || '').toLowerCase() === 'metre')
    if (hasMetre) {
      db.prepare("DELETE FROM materials WHERE (code = ? OR name = ? COLLATE NOCASE) AND LOWER(COALESCE(unit, '')) != 'metre' AND (deleted_at IS NULL OR deleted_at = '')")
        .run(trimmedCode, trimmedCode)
    }
    return
  }

  try {
    const id = `mat-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const materialUnit = 'metre'

    db.prepare(`
      INSERT INTO materials (
        id, code, name, category, unit, stock_amount, min_stock_level, purchase_price,
        company_id, branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      trimmedCode,
      name,
      'Kumaş',
      materialUnit,
      0,
      0,
      0,
      DEFAULT_COMPANY_ID,
      DEFAULT_BRANCH_ID
    )

    db.prepare(`
      INSERT OR IGNORE INTO material_stocks (id, material_id, warehouse_id, quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      `mstock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      id,
      DEFAULT_WAREHOUSE_ID,
      0
    )
  } catch (error: any) {
    console.error(`Hammadde oluşturulamadı (${trimmedCode}):`, {
      error: error.message,
      stack: error.stack,
    })
  }
}

// GET: Tüm siparişleri getir
export const GET = withAuthAndPermission(async (request) => {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    let status = searchParams.get('status')
    const wantShippedOnly = status === 'shipped'
    const wantCompletedNotShipped = status === 'completed'
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE) : null
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0
    if (status === 'shipped') {
      status = 'completed' // shipped orders have o.status='completed', filtered by display_status below
    }

    // Pending status için özel sorgu - production_order_id olmayanları getir
    if (status === 'pending') {
      // �!OK SIKI sorgu: Sadece status='pending' ve production_order_id NULL veya boş olanları getir
      // Ayrıca status='in_production' olanları da hariç tut
      const query = `
        SELECT 
          o.*,
          p.name as matched_product_name,
          p.sku as matched_product_sku,
          CASE 
            WHEN o.production_order_id IS NOT NULL AND o.production_order_id != '' THEN
              CASE 
                WHEN EXISTS (
                  SELECT 1 
                  FROM production_orders po
                  JOIN product_serial_numbers psn ON po.id = psn.production_order_id
                  WHERE po.id = o.production_order_id
                    AND psn.shipment_id IS NOT NULL
                    AND psn.shipment_id != ''
                ) THEN 'shipped'
                ELSE o.status
              END
            ELSE o.status
          END as display_status
        FROM active_orders o
        LEFT JOIN active_products p ON o.product_id = p.id
        WHERE o.status = 'pending'
          AND o.status != 'in_production'
          AND (o.production_order_id IS NULL OR o.production_order_id = '')
          AND o.company_id = ?
          AND o.branch_id = ?
          AND o.deleted_at IS NULL
        ORDER BY COALESCE(o.order_date, o.created_at) ASC
      `
      const orders = db.prepare(query).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as (OrderRow & { display_status?: string })[]
      
      // �!OK SIKI filtreleme: JavaScript tarafında da filtrele
      const filteredOrders = orders.filter(order => {
        // Status kontrolü - �!OK SIKI
        if (order.status !== 'pending') {
          logger.debug(`[Orders API - Pending] Sipariş ${order.order_number} filtrelendi (status: ${order.status})`)
          return false
        }
        
        // Production order ID kontrolü - �!OK SIKI
        const prodId = order.production_order_id
        if (prodId === null || prodId === undefined) {
          return true
        }
        
        const prodIdStr = String(prodId).trim()
        if (prodIdStr === '' || prodIdStr === 'null' || prodIdStr === 'undefined') {
          return true
        }
        
        logger.debug(`[Orders API - Pending] Sipariş ${order.order_number} filtrelendi (production_order_id: ${prodIdStr})`)
        return false
      })
      
      logger.info(`[Orders API - Pending] SQL'den gelen: ${orders.length}, JavaScript filtrelenmiş: ${filteredOrders.length}`)

      // Eşer SQL'den gelen ile filtrelenmiş arasında fark varsa, logla
      if (orders.length !== filteredOrders.length) {
        const diff = orders.filter(o => {
          const prodId = o.production_order_id
          return prodId !== null && prodId !== undefined && String(prodId).trim() !== '' && String(prodId).trim() !== 'null'
        })
        logger.warn(`[Orders API - Pending] SQL'den gelen ama filtrelenen siparişler (${diff.length} adet)`, {
          filtered_orders: diff.slice(0, 5).map(o => ({
            order_number: o.order_number,
            status: o.status,
            production_order_id: o.production_order_id
          }))
        })
      }
      const total = filteredOrders.length
      const paginated = limit != null ? filteredOrders.slice(offset, offset + limit) : filteredOrders
      if (limit != null) {
        return ok(paginated, { headers: CACHE_HEADERS_LIST, meta: { total, limit, offset } })
      }
      return ok(filteredOrders, { headers: CACHE_HEADERS_LIST })
    }

    // Diğer status'ler için normal sorgu
    const customerName = searchParams.get('customer_name') // Müşteri ismi arama filtresi
    
    let query = `
      SELECT 
        o.*,
        p.name as matched_product_name,
        p.sku as matched_product_sku,
        po.order_number as production_order_number,
        po.due_date as production_order_due_date,
        CASE 
          WHEN o.status = 'completed' AND o.production_order_id IS NOT NULL AND o.production_order_id != '' AND NOT EXISTS (
            SELECT 1 FROM product_serial_numbers psn 
            WHERE psn.production_order_id = o.production_order_id AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
          ) THEN 'shipped'
          ELSE o.status
        END as display_status
      FROM active_orders o
      LEFT JOIN active_products p ON o.product_id = p.id
      LEFT JOIN production_orders po ON po.id = o.production_order_id AND (po.deleted_at IS NULL OR po.deleted_at = '')
      WHERE 1=1
    `
    const params: string[] = []

    query += ' AND o.company_id = ? AND o.branch_id = ?'
    params.push(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    // active_orders view already filters deleted_at

    if (status) {
      query += ' AND o.status = ?'
      params.push(status)
    }
    
    // Müşteri ismi arama filtresi
    if (customerName && customerName.trim()) {
      query += ' AND (o.customer_name LIKE ? OR o.dealer_name LIKE ?)'
      const searchPattern = `%${customerName.trim()}%`
      params.push(searchPattern, searchPattern)
    }

    query += ' ORDER BY COALESCE(o.order_date, o.created_at) ASC'

    type OrderRowWithDisplay = OrderRow & { display_status?: string }
    let orders = db.prepare(query).all(...params) as OrderRowWithDisplay[]
    
    if (wantShippedOnly) {
      orders = orders.filter((o) => o.display_status === 'shipped')
    } else if (wantCompletedNotShipped) {
      orders = orders.filter((o) => o.display_status !== 'shipped')
    }
    const total = orders.length
    const paginated = limit != null ? orders.slice(offset, offset + limit) : orders
    if (limit != null) {
      return ok(paginated, { headers: CACHE_HEADERS_LIST, meta: { total, limit, offset } })
    }
    return ok(orders, { headers: CACHE_HEADERS_LIST })
  } catch (error: any) {
    console.error('Siparişler yüklenirken hata:', error)
    apiLogger.error('Orders API GET failed', { error: error?.message, stack: error?.stack })
    try {
      await logger.error('[Orders API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return fail(error.message, { status: 500 })
  }
}, '/orders', 'view')

// POST: Manuel sipariş oluştur
export const POST = withAuth(async (request, user) => {
  try {
    let body: any
    try {
      body = await parseJsonBody(request)
    } catch (error: any) {
      return fail(error?.message || 'Geçersiz JSON', { status: 400 })
    }

    if (!body || typeof body !== 'object') {
      return fail('Geçersiz istek verisi', { status: 400 })
    }

    ;(body as { created_by?: string }).created_by = user.userId
    const { orders: manualOrders } = body as { orders?: ManualOrderInput[] }

    if (!manualOrders || !Array.isArray(manualOrders) || manualOrders.length === 0) {
      return fail('Sipariş verisi gerekli', {
        status: 400,
        details: 'Lütfen sipariş bilgilerini gönderin.',
      })
    }

    const db = getDatabase()
    const insertedOrders: InsertedOrder[] = []
    const actorId = user.userId

    const insertOrders = db.transaction(() => {
      // Manuel sipariş oluşturma
      for (const order of manualOrders) {
        const orderId = randomUUID()
        const orderNumber = order.order_number || `SIP-${Date.now()}-${randomUUID().substring(0, 8)}`

        // Excel formatındaki ekstra alanları notlar alanına birleştir
        let combinedNotes = order.notes || ''
        if (order.fabric_code) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Kumaş: ${order.fabric_code}`
        }
        if (order.case_info) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Kasa: ${order.case_info}`
        }
        if (order.leg_info) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Ayak: ${order.leg_info}`
        }
        if (order.cushion_info) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Kirlent: ${order.cushion_info}`
        }
        if (order.unit) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${order.unit}`
        }

        // �Srünü bul (SKU veya isim ile)
        let productId: string | null = order.product_id || null
        if (!productId && order.product_sku) {
          const product = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(order.product_sku) as ProductIdRow | undefined
          if (product) {
            productId = product.id
          }
        }
        if (!productId && order.product_name) {
          const product = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${order.product_name}%`) as ProductIdRow | undefined
          if (product) {
            productId = product.id
          }
        }

        // Sadece Cari Adı (dealer_name) ile cari hesap oluştur; Müşteri Adı ile cari açılmaz
        createAccountIfNotExists(db, order.dealer_name ?? null)
        // Kumaş kodu varsa hammaddeye ekle (yoksa otomatik oluştur)
        createMaterialIfNotExists(db, order.fabric_code ?? null, order.unit ?? null)

        db.prepare(`
        INSERT INTO orders (
          id, order_number, dealer_name, customer_name, customer_code, product_name, product_sku,
          product_id, quantity, unit_price, total_amount, order_date, delivery_date, status,
          configuration, notes, company_id, branch_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        orderId,
        orderNumber,
        order.dealer_name || null,
        order.customer_name || null,
        order.customer_code || null,
        order.product_name || '',
        order.product_sku || null,
        productId,
        order.quantity || 0,
        order.unit_price || 0,
        (order.quantity || 0) * (order.unit_price || 0),
        order.order_date || null,
        'pending',
        order.configuration || null,
        combinedNotes || null,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID
      )

        insertedOrders.push({
          id: orderId,
          order_number: orderNumber,
          product_name: order.product_name,
          quantity: order.quantity,
          status: 'pending',
          product_id: productId
        })

        logAudit(db, {
          tableName: 'orders',
          action: 'create',
          recordId: orderId,
          userId: actorId,
          after: {
            id: orderId,
            order_number: orderNumber,
            status: 'pending',
            product_id: productId,
          },
        })
      }
    })

    insertOrders()

    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    void dispatchWebhook('order.created', { orders: insertedOrders })

    // E-posta bildirimi (müşteri e-postası varsa, SMTP yoksa log)
    const uniqueDealers = [...new Set((manualOrders as { dealer_name?: string }[]).map((o) => (o.dealer_name || '').trim()).filter(Boolean))]
    if (uniqueDealers.length > 0) {
      const { sendEmail } = await import('@/lib/notifications/send')
      const { fillTemplate, emailTemplates } = await import('@/lib/notifications/templates')
      for (const dealerName of uniqueDealers) {
        const acc = db.prepare('SELECT id, name, email FROM accounts WHERE name = ? AND deleted_at IS NULL').get(dealerName) as { id: string; name: string; email: string | null } | undefined
        if (acc?.email) {
          const orderNumbers = (manualOrders as { dealer_name?: string }[])
            .filter((o) => (o.dealer_name || '').trim() === dealerName)
            .map((o) => (o as { order_number?: string }).order_number || '')
            .filter(Boolean)
          const orderNumbersStr = orderNumbers.length > 0 ? orderNumbers.join(', ') : insertedOrders.map((o) => o.order_number).join(', ')
          const subject = fillTemplate(emailTemplates.orderConfirmation.subject, { orderNumbers: orderNumbersStr })
          const text = fillTemplate(emailTemplates.orderConfirmation.text, { customerName: acc.name, orderNumbers: orderNumbersStr })
          const html = fillTemplate(emailTemplates.orderConfirmation.html, { customerName: acc.name, orderNumbers: orderNumbersStr })
          sendEmail({ to: acc.email, subject, text, html }).then((r) => {
            if (!r.ok) apiLogger.warn('Sipariş e-posta gönderilemedi', { to: acc.email, error: r.error })
          }).catch(() => {})
        }
      }
    }

    return ok(
      {
        orders: insertedOrders,
      },
      { message: `${insertedOrders.length} sipariş başarıyla oluşturuldu` }
    )
  } catch (error: any) {
    console.error('Sipariş oluşturulurken hata:', error)
    apiLogger.error('Orders API POST failed', { error: error?.message, stack: error?.stack })
    return fail(error.message, { status: 500 })
  }
}, ['admin', 'sales'])

// PUT: Sipariş düzenle (sadece beklemedeki, üretime alınmamış)
export const PUT = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await parseJsonBody(request) as ManualOrderInput & { id?: string }
    const orderId = body?.id
    if (!orderId || typeof orderId !== 'string') {
      return fail('Sipariş id gerekli', { status: 400 })
    }

    const db = getDatabase()
    const current = db.prepare(`
      SELECT id, status, production_order_id, order_number FROM orders WHERE id = ? AND deleted_at IS NULL
    `).get(orderId) as { id: string; status: string; production_order_id: string | null; order_number: string } | undefined

    if (!current) {
      return fail('Sipariş bulunamadı', { status: 404 })
    }
    if (current.status !== 'pending') {
      return fail('Sadece beklemedeki siparişler düzenlenebilir', { status: 400 })
    }
    if (current.production_order_id && String(current.production_order_id).trim() !== '') {
      return fail('Üretime alınan sipariş düzenlenemez', { status: 400 })
    }

    const {
      dealer_name, customer_name, customer_code, product_name, product_sku, quantity, unit_price,
      order_date, configuration, fabric_code, case_info, leg_info, cushion_info, unit, notes
    } = body

    let combinedNotes = typeof notes === 'string' ? notes.trim() : ''
    if (fabric_code !== undefined && fabric_code !== null && String(fabric_code).trim()) {
      combinedNotes += (combinedNotes ? ' | ' : '') + `Kumaş: ${String(fabric_code).trim()}`
    }
    if (case_info !== undefined && case_info !== null && String(case_info).trim()) {
      combinedNotes += (combinedNotes ? ' | ' : '') + `Kasa: ${String(case_info).trim()}`
    }
    if (leg_info !== undefined && leg_info !== null && String(leg_info).trim()) {
      combinedNotes += (combinedNotes ? ' | ' : '') + `Ayak: ${String(leg_info).trim()}`
    }
    if (cushion_info !== undefined && cushion_info !== null && String(cushion_info).trim()) {
      combinedNotes += (combinedNotes ? ' | ' : '') + `Kirlent: ${String(cushion_info).trim()}`
    }
    if (unit !== undefined && unit !== null && String(unit).trim()) {
      combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${String(unit).trim()}`
    }

    let productId: string | null = (body as any).product_id ?? null
    if (!productId && product_sku) {
      const product = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(product_sku) as ProductIdRow | undefined
      if (product) productId = product.id
    }
    if (!productId && product_name) {
      const product = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${product_name}%`) as ProductIdRow | undefined
      if (product) productId = product.id
    }

    // Sadece Cari Adı (dealer_name) ile cari hesap oluştur; Müşteri Adı ile cari açılmaz
    createAccountIfNotExists(db, dealer_name ?? null)
    if (fabric_code) {
      createMaterialIfNotExists(db, fabric_code ?? null, unit ?? null)
    }

    const totalAmount = (Number(quantity) || 0) * (Number(unit_price) || 0)
    db.prepare(`
      UPDATE orders SET
        dealer_name = ?, customer_name = ?, customer_code = ?, product_name = ?, product_sku = ?,
        product_id = ?, quantity = ?, unit_price = ?, total_amount = ?, order_date = ?,
        configuration = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      dealer_name ?? null,
      customer_name ?? null,
      customer_code ?? null,
      product_name ?? '',
      product_sku ?? null,
      productId,
      Number(quantity) || 0,
      Number(unit_price) || 0,
      totalAmount,
      order_date ?? null,
      configuration ?? null,
      combinedNotes || null,
      orderId
    )

    logAudit(db, {
      tableName: 'orders',
      action: 'update',
      recordId: orderId,
      userId: user.userId,
      after: { order_number: current.order_number, status: current.status },
    })

    return ok({ id: orderId }, { message: 'Sipariş güncellendi' })
  } catch (error: any) {
    logger.error('[Orders API - PUT] Hata', { error: error?.message })
    return fail(error.message || 'Sipariş güncellenemedi', { status: 500 })
  }
})

// PATCH: Sipariş durumunu güncelle (ör. iptal)
export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await parseJsonBody(request)
    const orderId = body?.orderId || body?.id
    const status = body?.status
    const cancelReason = typeof body?.cancel_reason === 'string' ? body.cancel_reason.trim() : ''

    if (!orderId || !status) {
      return fail('Sipariş ID ve durum gerekli', { status: 400 })
    }

    if (status !== 'cancelled') {
      return fail('Geçersiz durum güncellemesi', { status: 400 })
    }
    if (!cancelReason) {
      return fail('İptal nedeni gerekli', { status: 400 })
    }

    const db = getDatabase()
    const current = db
      .prepare('SELECT id, status, production_order_id, order_number FROM active_orders WHERE id = ? AND deleted_at IS NULL')
      .get(orderId) as OrderStatusRow | undefined

    if (!current) {
      return fail('Sipariş bulunamadı', { status: 404 })
    }

    if (current.status !== 'pending') {
      return fail('Sadece beklemede olan sipariş iptal edilebilir', { status: 400 })
    }

    if (current.production_order_id && String(current.production_order_id).trim() !== '') {
      return fail('Üretime alınan sipariş iptal edilemez', { status: 400 })
    }

    const update = db.prepare(
      'UPDATE orders SET status = ?, cancel_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(status, cancelReason, orderId)

    logger.info('[Orders API - PATCH] Sipariş iptal edildi', {
      order_id: orderId,
      order_number: current.order_number,
      changes: update.changes,
    })

    logAudit(db, {
      tableName: 'orders',
      action: 'update',
      recordId: orderId,
      userId: user.userId,
      before: {
        status: current.status,
        cancel_reason: null,
      },
      after: {
        status,
        cancel_reason: cancelReason,
      },
    })

    return ok(
      { id: orderId, status },
      { message: 'Sipariş iptal edildi' }
    )
  } catch (error: any) {
    logger.error('[Orders API - PATCH] Hata', { error: error?.message })
    return fail(error.message || 'Sipariş güncellenemedi', { status: 500 })
  }
})

// DELETE: Sipariş sil (tek veya tümü - all=1 sadece admin)
export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')

    if (all === '1' || all === 'true') {
      const result = db.prepare('UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL').run()
      logger.info(`[Orders API - DELETE] Tüm siparişler silindi`, { deleted_count: result.changes })
      return ok({ deleted_count: result.changes }, { message: `${result.changes} sipariş silindi` })
    }

    const id = searchParams.get('id')
    if (!id) {
      return fail('Sipariş id gerekli (veya all=1 ile tümünü sil)', { status: 400 })
    }

    const order = db.prepare('SELECT * FROM active_orders WHERE id = ? AND deleted_at IS NULL').get(id) as OrderRow | undefined
    if (!order) {
      return fail('Sipariş bulunamadı', { status: 404 })
    }

    const deleteResult = db
      .prepare('UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL')
      .run(id)

    if (deleteResult.changes === 0) {
      return fail('Sipariş bulunamadı', { status: 404 })
    }

    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || undefined

    logAuditEntry({
      table: 'orders',
      recordId: id,
      action: 'DELETE',
      oldData: order,
      newData: null,
      userId: user.userId,
      ipAddress,
    })

    logger.info(`[Orders API - DELETE] Sipariş silindi`, { id })

    return ok(
      {
        deleted_count: deleteResult.changes,
      },
      { message: 'Sipariş başarıyla silindi' }
    )
  } catch (error: any) {
    console.error('Siparişler silinirken hata:', error)
    logger.error(`[Orders API - DELETE] Hata: ${error.message}`, { error })
    return fail('Siparişler silinemedi', { status: 500, details: error.message })
  }
}, ['admin'])

