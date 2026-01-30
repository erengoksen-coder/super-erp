import { NextRequest } from 'next/server'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_LIST } from '@/lib/api/cache'
import { logAudit } from '@/lib/audit'
import { logAudit as logAuditEntry } from '@/lib/audit/logger'
import { withAuth } from '@/lib/api/withAuth'

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

// Bayi isminden otomatik cari hesap oluştur (eğer yoksa)
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

// GET: Tüm siparişleri getir
export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    let status = searchParams.get('status')
    if (status === 'shipped') {
      status = 'completed'
    }

    // Pending status için özel sorgu - production_order_id olmayanları getir
    if (status === 'pending') {
      // ÇOK SIKI sorgu: Sadece status='pending' ve production_order_id NULL veya boş olanları getir
      // Ayrıca status='in_production' olanları da hariç tut
      const query = `
        SELECT 
          o.*,
          p.name as matched_product_name,
          p.sku as matched_product_sku
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
      const orders = db.prepare(query).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as OrderRow[]
      
      // ÇOK SIKI filtreleme: JavaScript tarafında da filtrele
      const filteredOrders = orders.filter(order => {
        // Status kontrolü - ÇOK SIKI
        if (order.status !== 'pending') {
          logger.debug(`[Orders API - Pending] Sipariş ${order.order_number} filtrelendi (status: ${order.status})`)
          return false
        }
        
        // Production order ID kontrolü - ÇOK SIKI
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
      
      // Eğer SQL'den gelen ile filtrelenmiş arasında fark varsa, logla
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
      
      // Her siparişin detaylarını logla (debug için - sadece ilk 3)
      if (orders.length > 0) {
        logger.debug(`[Orders API - Pending] İlk 3 sipariş detayı`, {
          sample_orders: orders.slice(0, 3).map(o => ({
            order_number: o.order_number,
            status: o.status,
            production_order_id: o.production_order_id,
            product_id: o.product_id
          }))
        })
      }
      
      return ok(filteredOrders, { headers: CACHE_HEADERS_LIST })
    }

    // Diğer status'ler için normal sorgu
    const customerName = searchParams.get('customer_name') // Müşteri ismi arama filtresi
    
    let query = `
      SELECT 
        o.*,
        p.name as matched_product_name,
        p.sku as matched_product_sku
        FROM active_orders o
      LEFT JOIN active_products p ON o.product_id = p.id
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

    const orders = db.prepare(query).all(...params) as OrderRow[]
    
    // Status pending değilse normal filtreleme
    return ok(orders, { headers: CACHE_HEADERS_LIST })
  } catch (error: any) {
    console.error('Siparişler yüklenirken hata:', error)
    return fail(error.message, { status: 500 })
  }
}, ['admin', 'manager', 'sales'])

// POST: Manuel sipariş oluştur
export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json()
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
        if (order.unit) {
          combinedNotes += (combinedNotes ? ' | ' : '') + `Birim: ${order.unit}`
        }

        // Ürünü bul (SKU veya isim ile)
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

        // Bayi isminden otomatik cari hesap oluştur (eğer yoksa)
        createAccountIfNotExists(db, order.dealer_name)

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

    return ok(
      {
        orders: insertedOrders,
      },
      { message: `${insertedOrders.length} sipariş başarıyla oluşturuldu` }
    )
  } catch (error: any) {
    console.error('Sipariş oluşturulurken hata:', error)
    return fail(error.message, { status: 500 })
  }
}, ['admin', 'sales'])

// PATCH: Sipariş durumunu güncelle (ör. iptal)
export const PATCH = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await request.json()
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

// DELETE: Sipariş sil
export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const db = getDatabase()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return fail('Sipariş id gerekli', { status: 400 })
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
