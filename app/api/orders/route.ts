import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'

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
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Pending status için özel sorgu - production_order_id olmayanları getir
    if (status === 'pending') {
      // ÇOK SIKI sorgu: Sadece status='pending' ve production_order_id NULL veya boş olanları getir
      // Ayrıca status='in_production' olanları da hariç tut
      const query = `
        SELECT 
          o.*,
          p.name as matched_product_name,
          p.sku as matched_product_sku
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.status = 'pending'
          AND o.status != 'in_production'
          AND (o.production_order_id IS NULL OR o.production_order_id = '')
        ORDER BY COALESCE(o.order_date, o.created_at) ASC
      `
      const orders = db.prepare(query).all() as OrderRow[]
      
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
      
      return ok(filteredOrders)
    }

    // Diğer status'ler için normal sorgu
    const customerName = searchParams.get('customer_name') // Müşteri ismi arama filtresi
    
    let query = `
      SELECT 
        o.*,
        p.name as matched_product_name,
        p.sku as matched_product_sku
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE 1=1
    `
    const params: string[] = []

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
    return ok(orders)
  } catch (error: any) {
    console.error('Siparişler yüklenirken hata:', error)
    return fail(error.message, { status: 500 })
  }
}

// POST: Manuel sipariş oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orders: manualOrders } = body as { orders?: ManualOrderInput[] }

    if (!manualOrders || !Array.isArray(manualOrders) || manualOrders.length === 0) {
      return fail('Sipariş verisi gerekli', {
        status: 400,
        details: 'Lütfen sipariş bilgilerini gönderin.',
      })
    }

    const db = getDatabase()
    const insertedOrders: InsertedOrder[] = []

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
        const product = db.prepare('SELECT id FROM products WHERE sku = ?').get(order.product_sku) as ProductIdRow | undefined
        if (product) {
          productId = product.id
        }
      }
      if (!productId && order.product_name) {
        const product = db.prepare('SELECT id FROM products WHERE name LIKE ?').get(`%${order.product_name}%`) as ProductIdRow | undefined
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
          configuration, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, CURRENT_TIMESTAMP)
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
        combinedNotes || null
      )

      insertedOrders.push({
        id: orderId,
        order_number: orderNumber,
        product_name: order.product_name,
        quantity: order.quantity,
        status: 'pending',
        product_id: productId
      })
    }
    
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
}

// DELETE: Tüm siparişleri sil
export async function DELETE(request: NextRequest) {
  try {
    const db = getDatabase()
    
    // Tüm siparişleri sil
    const deleteResult = db.prepare('DELETE FROM orders').run()
    
    logger.info(`[Orders API - DELETE] ${deleteResult.changes} sipariş silindi`)
    
    return ok(
      {
        deleted_count: deleteResult.changes,
      },
      { message: `${deleteResult.changes} sipariş başarıyla silindi` }
    )
  } catch (error: any) {
    console.error('Siparişler silinirken hata:', error)
    logger.error(`[Orders API - DELETE] Hata: ${error.message}`, { error })
    return fail('Siparişler silinemedi', { status: 500, details: error.message })
  }
}
