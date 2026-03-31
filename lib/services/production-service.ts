import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { inventoryService } from './inventory-service'
import { BOMInput, ProductionOrderInput } from '../validation/production-schema'

/**
 * Üretim ve Planlama (MRP) Servisi
 * Reçete (BOM), Üretim Emri ve MRP süreçlerini yönetir.
 */
class ProductionService {
  /**
   * Yeni bir ürün reçetesi (BOM) oluşturur.
   */
  async createBOM(input: BOMInput, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const bomId = randomUUID()
    const versionId = randomUUID()

    return db.transaction(() => {
      // 1. Ürün eğer 'products' tablosunda yoksa veya kodu farklıysa (basitleştirme için şimdilik ID bazlı varsayıyoruz)
      // Normalde bir Mamül (Product) kartı olması gerekir.
      
      // 2. BOM Versiyonu oluştur
      db.prepare(`
        INSERT INTO bom_versions (id, product_id, version_no, effective_date, is_active, company_id, branch_id)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1, ?, ?)
      `).run(versionId, input.product_code, input.version || 1, companyId, branchId)

      // 3. BOM Kalemlerini ekle
      const insertItem = db.prepare(`
        INSERT INTO bom (id, version_id, product_id, material_id, quantity_required, waste_percentage, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const item of input.items) {
        insertItem.run(randomUUID(), versionId, input.product_code, item.material_id, item.quantity, item.wastage_percentage, companyId, branchId)
      }

      return { bomId: versionId }
    })()
  }

  /**
   * Üretim Emri (Production Order) oluşturur ve hammadde rezerve eder.
   */
  async createProductionOrder(input: ProductionOrderInput, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const orderId = randomUUID()
    const orderNumber = `PROD-${Date.now().toString().slice(-6)}`

    return db.transaction(() => {
      // 1. Üretim Emrini Kaydet
      db.prepare(`
        INSERT INTO production_orders (id, order_number, product_id, quantity, status, company_id, branch_id)
        VALUES (?, ?, ?, ?, 'pending', ?, ?)
      `).run(orderId, orderNumber, input.bom_id, input.quantity, companyId, branchId)

      // 2. Aktif Reçeteyi Bul ve Hammadde Rezervasyonu Yap
      const bomItems = db.prepare(`
        SELECT material_id, quantity_required, waste_percentage 
        FROM bom 
        WHERE version_id = (SELECT id FROM bom_versions WHERE product_id = ? AND is_active = 1 LIMIT 1)
      `).all(input.bom_id) as any[]

      for (const item of bomItems) {
        const totalNeeded = item.quantity_required * input.quantity * (1 + (item.waste_percentage / 100))
        
        // Stok Rezervasyonu Oluştur
        db.prepare(`
          INSERT INTO stock_reservations (id, material_id, quantity, reference_type, reference_id, status, company_id, branch_id)
          VALUES (?, ?, ?, 'production_order', ?, 'active', ?, ?)
        `).run(randomUUID(), item.material_id, totalNeeded, orderId, companyId, branchId)
      }

      // 3. Opsiyonel: İş Emri (Work Order) oluştur
      const workOrderId = randomUUID()
      db.prepare(`
        INSERT INTO work_orders (id, production_order_id, work_order_number, status, company_id, branch_id)
        VALUES (?, ?, ?, 'open', ?, ?)
      `).run(workOrderId, orderId, `WO-${orderNumber}`, companyId, branchId)

      return { orderId, orderNumber }
    })()
  }

  /**
   * Üretimi tamamlar: 
   * 1. Rezervasyonları kapatır.
   * 2. Hammadde stoklarını düşer.
   * 3. Mamül stoğunu artırır.
   */
  async completeProductionOrder(orderId: string, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    
    return db.transaction(() => {
      const order = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(orderId) as any
      if (!order) throw new Error('Üretim emri bulunamadı')
      if (order.status === 'completed') throw new Error('Bu emir zaten tamamlanmış')

      // 1. Rezervasyonları getir ve stoktan düş
      const reservations = db.prepare('SELECT * FROM stock_reservations WHERE reference_id = ? AND status = "active"').all(orderId) as any[]
      
      for (const res of reservations) {
        // Hammadde çıkışı (Inventory Service)
        inventoryService.processStockIn({
          material_id: res.material_id,
          quantity: res.quantity,
          movement_type: 'out',
          notes: `Üretim Sarfiyatı: ${order.order_number}`,
          reference_type: 'production_order',
          reference_id: orderId
        }, companyId, branchId, userId)

        // Rezervasyonu kapat
        db.prepare('UPDATE stock_reservations SET status = "fulfilled", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(res.id)
      }

      // 2. Mamül (Product) stoğunu artır
      // Not: Sistemde Mamüller de 'materials' tablosunda veya 'products' tablosunda olabilir. 
      // Mevcut şemaya göre mamüller 'products' tablosunda ama stok hareketleri her ikisini de destekliyor.
      db.prepare(`
        INSERT INTO stock_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, company_id, branch_id)
        VALUES (?, ?, 'in', ?, 'production_order', ?, ?, ?, ?)
      `).run(
        randomUUID(), order.product_id, order.quantity, 'production_order', orderId, 
        `Üretimden Giriş: ${order.order_number}`, companyId, branchId
      )

      // 3. Durumu güncelle
      db.prepare('UPDATE production_orders SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(orderId)
      db.prepare('UPDATE work_orders SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE production_order_id = ?').run(orderId)

      return { success: true }
    })()
  }

  /**
   * Reçeteleri listeler
   */
  async getBOMs() {
    const db = getDatabase()
    return db.prepare(`
      SELECT bv.*, p.name as product_name, 
      (SELECT COUNT(*) FROM bom WHERE version_id = bv.id) as item_count
      FROM bom_versions bv
      LEFT JOIN materials p ON bv.product_id = p.id
      WHERE bv.deleted_at IS NULL
    `).all()
  }
}

export const productionService = new ProductionService()
