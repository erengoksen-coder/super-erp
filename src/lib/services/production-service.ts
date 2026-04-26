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
      // 1. Üretim emri ve ürün bilgilerini getir
      const order = db.prepare(`
        SELECT po.*, p.labor_cost as product_labor_cost, p.selling_price as product_selling_price 
        FROM production_orders po
        JOIN products p ON po.product_id = p.id
        WHERE po.id = ?
      `).get(orderId) as any
      
      if (!order) throw new Error('Üretim emri bulunamadı')
      if (order.status === 'completed') throw new Error('Bu emir zaten tamamlanmış')

      let totalMaterialCost = 0

      // 2. Rezervasyonları getir, stoktan düş ve maliyet hesapla
      const reservations = db.prepare(`
        SELECT sr.*, m.purchase_price 
        FROM stock_reservations sr
        JOIN materials m ON sr.material_id = m.id
        WHERE sr.reference_id = ? AND sr.status = "active"
      `).all(orderId) as any[]
      
      for (const res of reservations) {
        // Maliyet ekle
        totalMaterialCost += (res.quantity * (res.purchase_price || 0))

        // Hammadde çıkışı (Inventory Service)
        inventoryService.processStockOut({
          material_id: res.material_id,
          quantity: res.quantity,
          notes: `Üretim Sarfiyatı: ${order.order_number}`,
          reference_type: 'production_order',
          reference_id: orderId
        }, companyId, branchId, userId)

        // Rezervasyonu kapat
        db.prepare('UPDATE stock_reservations SET status = "fulfilled", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(res.id)
      }

      // 3. İşçilik ve Satış Fiyatı Analizi
      const laborCost = (order.product_labor_cost || 0) * order.quantity
      const totalCost = totalMaterialCost + laborCost
      
      // Sipariş tablosundan gerçek satış fiyatını dene, yoksa ürün kartındakini al
      const linkedOrder = db.prepare('SELECT unit_price FROM orders WHERE production_order_id = ? LIMIT 1').get(orderId) as any
      const unitSellingPrice = linkedOrder?.unit_price || order.product_selling_price || 0
      const totalSellingPrice = unitSellingPrice * order.quantity
      const netProfit = totalSellingPrice - totalCost

      // 4. Mamül (Product) stoğunu artır
      const movementId = randomUUID();
      db.prepare(`
        INSERT INTO inventory_movements (
          id, product_id, type, quantity, reference_type, 
          reference_id, notes, company_id, branch_id, created_by
        ) VALUES (?, ?, 'in', ?, 'production_order', ?, ?, ?, ?, ?)
      `).run(
        movementId, order.product_id, order.quantity, 'production_order', orderId, 
        `Üretimden Giriş: ${order.order_number}`, companyId, branchId, userId
      );

      // 5. Otomatik Barkod / Seri No Üretimi
      const serialNumber = `${order.order_number}-S${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO inventory_serials (id, product_id, serial_number, status, last_movement_id, company_id, branch_id)
        VALUES (?, ?, ?, 'available', ?, ?, ?)
      `).run(randomUUID(), order.product_id, serialNumber, movementId, companyId, branchId);

      // 6. Finansal verileri ve durumu güncelle
      db.prepare(`
        UPDATE production_orders 
        SET 
          status = "completed", 
          material_cost = ?, 
          labor_cost = ?, 
          total_cost = ?, 
          selling_price = ?, 
          profit = ?,
          updated_at = CURRENT_TIMESTAMP,
          completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(totalMaterialCost, laborCost, totalCost, totalSellingPrice, netProfit, orderId)
      
      db.prepare('UPDATE work_orders SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE production_order_id = ?').run(orderId)
      
      // Eğer bağlı bir müşteri siparişi varsa onu da güncelle
      db.prepare('UPDATE orders SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE production_order_id = ?').run(orderId)

      return { 
        success: true, 
        serial_number: serialNumber,
        financials: {
          materialCost: totalMaterialCost,
          laborCost: laborCost,
          totalCost: totalCost,
          profit: netProfit
        }
      }
    })()
  }

  /**
   * Reçeteleri listeler
   */
  async getBOMs() {
    const db = getDatabase()
    return db.prepare(`
      SELECT bv.*, p.name as product_name, p.sku as product_code,
      (SELECT COUNT(*) FROM bom WHERE version_id = bv.id) as item_count
      FROM bom_versions bv
      LEFT JOIN products p ON bv.product_id = p.id OR bv.product_id = p.sku
      WHERE bv.deleted_at IS NULL
    `).all()
  }
}

export const productionService = new ProductionService()
