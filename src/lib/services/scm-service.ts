import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { financeService } from './finance-service'
import { inventoryService } from './inventory-service'
import { AccountInput, OrderInput, InvoiceInput } from '../validation/scm-schema'

/**
 * Satınalma ve Satış (SCM) Servisi
 * Cari hesaplar, siparişler ve fatura döngüsünü yönetir.
 */
class SCMService {
  /**
   * Yeni bir Cari Hesap (Müşteri/Tedarikçi) oluşturur.
   */
  async createAccount(input: AccountInput, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const accountId = randomUUID()

    return db.transaction(() => {
      db.prepare(`
        INSERT INTO accounts (
          id, code, name, type, tax_number, email, phone, address, 
          risk_limit, discount_rate, authorized_person_name, authorized_person_phone,
          company_id, branch_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        accountId, input.code, input.name, input.type, input.tax_number, 
        input.email, input.phone, input.address, input.risk_limit, 
        input.discount_rate, input.authorized_person_name, input.authorized_person_phone,
        companyId, branchId, userId
      )
      return { accountId }
    })()
  }

  /**
   * Satış veya Satınalma Siparişi oluşturur.
   */
  async createOrder(type: 'sale' | 'purchase', input: OrderInput, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const orderId = randomUUID()
    const orderNum = `${type === 'sale' ? 'SAL' : 'PUR'}-${Date.now().toString().slice(-6)}`

    return db.transaction(() => {
      const table = type === 'sale' ? 'sales_orders' : 'purchase_orders'
      const itemTable = type === 'sale' ? 'sales_order_items' : 'purchase_order_items'
      const fkColumn = type === 'sale' ? 'customer_id' : 'supplier_id'
      const fkOrderColumn = type === 'sale' ? 'sales_order_id' : 'purchase_order_id'
      const itemFkColumn = type === 'sale' ? 'product_id' : 'material_id'

      // 1. Sipariş Başlığını Oluştur
      db.prepare(`
        INSERT INTO ${table} (
          id, ${fkColumn}, order_number, order_date, status, 
          payment_terms_days, company_id, branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, input.account_id, orderNum, input.order_date, input.status,
        input.payment_terms_days, companyId, branchId
      )

      // 2. Sipariş Kalemlerini Ekle
      let totalAmount = 0
      const insertItem = db.prepare(`
        INSERT INTO ${itemTable} (
          id, ${fkOrderColumn}, ${itemFkColumn}, quantity, unit_price, total_price
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)

      for (const item of input.items) {
        const lineTotal = item.quantity * item.unit_price
        totalAmount += lineTotal
        insertItem.run(randomUUID(), orderId, item.product_id, item.quantity, item.unit_price, lineTotal)
        
        // Satış ise Stok REZERVE et (Önemli MRP Entegrasyonu)
        if (type === 'sale') {
          db.prepare(`
            INSERT INTO stock_reservations (id, material_id, quantity, reference_type, reference_id, status, company_id, branch_id)
            VALUES (?, ?, ?, 'sales_order', ?, 'active', ?, ?)
          `).run(randomUUID(), item.product_id, item.quantity, orderId, companyId, branchId)
        }
      }

      // 3. Toplam Tutarı Güncelle
      db.prepare(`UPDATE ${table} SET total_amount = ?, final_amount = ? WHERE id = ?`)
        .run(totalAmount, totalAmount, orderId)

      return { orderId, orderNumber: orderNum }
    })()
  }

  /**
   * Satış Siparişini Sevkiyata dönüştürür ve Otomatik Fatura oluşturur.
   * Deadlock önlemek için asenkron yan etkiler (Stok/Muhasebe) işlem dışına taşındı.
   */
  async processShipment(orderId: string, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    
    // 1. Gerekli verileri önceden oku
    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) as any
    if (!order) throw new Error('Sipariş bulunamadı')
    if (order.status === 'completed') throw new Error('Sipariş zaten sevk edilmiş')

    const items = db.prepare('SELECT * FROM sales_order_items WHERE sales_order_id = ?').all() as any[]
    const shipmentId = randomUUID()
    const shipmentNum = `SHP-${Date.now().toString().slice(-6)}`
    const invoiceId = randomUUID()
    const invoiceNum = `INV-${shipmentNum}`

    // 2. ANA VERİTABANI İŞLEMLERİ (Senkron Transaction)
    db.transaction(() => {
      // A. Sevkiyat (Shipment) Kaydı
      db.prepare(`
        INSERT INTO shipments (id, shipment_number, customer_id, shipment_date, status, total_quantity, total_amount, company_id, branch_id)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'completed', ?, ?, ?, ?)
      `).run(
        shipmentId, shipmentNum, order.customer_id, 
        items.reduce((s, i) => s + i.quantity, 0), order.total_amount,
        companyId, branchId
      )

      // B. Otomatik Fatura Kaydı
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, shipment_id, customer_id, invoice_date, 
          type, status, total_amount, final_amount, company_id, branch_id
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 'sale', 'issued', ?, ?, ?, ?)
      `).run(
        invoiceId, invoiceNum, shipmentId, order.customer_id, 
        order.total_amount, order.total_amount, companyId, branchId
      )

      // C. Cari Bakiye Güncelleme
      db.prepare('UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(order.total_amount, order.customer_id)

      // D. Cari Hareket (Ledger)
      db.prepare(`
        INSERT INTO account_transactions (id, account_id, transaction_type, amount, reference_type, reference_id, description, company_id, branch_id)
        VALUES (?, ?, 'debit', ?, 'invoice', ?, ?, ?, ?)
      `).run(
        randomUUID(), order.customer_id, order.total_amount, invoiceId, 
        `Satış Faturası: ${invoiceNum}`, companyId, branchId
      )

      // E. Rezervasyonları 'Fulfilled' yap
      for (const item of items) {
        db.prepare('UPDATE stock_reservations SET status = "fulfilled" WHERE reference_id = ? AND material_id = ?').run(orderId, item.product_id)
      }

      // F. Sipariş Durumunu Güncelle
      db.prepare('UPDATE sales_orders SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(orderId)
    })()

    // 3. ASENKRON YAN ETKİLER (Transaction Dışında ve Await Edilerek)
    // Bu metodlar kendi içlerinde işlem (transaction) başlatabilir veya asenkron servis çağırabilir.
    try {
      for (const item of items) {
        // Envanter Servisi üzerinden STOK ÇIKIŞI (Correct method: processStockOut)
        await inventoryService.processStockOut({
          material_id: item.product_id,
          quantity: item.quantity,
          notes: `Satış Sevkiyatı: ${shipmentNum}`,
          reference_type: 'shipment',
          reference_id: shipmentId
        }, companyId, branchId, userId)
      }
    } catch (stockError) {
      console.error('[SCM] Stock reduction failed but transaction committed!', stockError)
      // Kritik sistemlerde burada telafi edici bir işlem başlatılmalıdır.
    }

    return { shipmentId, invoiceId }
  }

  /**
   * Cari Hesapları Listeler (Filtreli ve Sayfalamalı)
   */
  async getAccounts(type?: 'customer' | 'vendor', limit = 20, offset = 0) {
    const db = getDatabase()
    let query = 'SELECT * FROM accounts WHERE deleted_at IS NULL'
    const params: any[] = []
    
    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }
    
    // Total count for pagination
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params) as { count: number }
    const total = totalRow ? totalRow.count : 0
    
    // Paginated results
    query += ' ORDER BY created_at DESC, id ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const data = db.prepare(query).all(...params)
    
    return { data, total }
  }
}

export const scmService = new SCMService()
