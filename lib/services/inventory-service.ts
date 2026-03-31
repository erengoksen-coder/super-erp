import { getDatabase, DEFAULT_WAREHOUSE_ID, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { MaterialInput, StockMovementInput } from '../validation/inventory-schema'
import { logAudit } from '@/lib/audit'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { createJournalEntry } from '@/lib/utils/accounting'

export interface MaterialWithStock extends MaterialInput {
  id: string
  code: string
  stock_amount: number
  total_in: number
  total_out: number
}

export const inventoryService = {
  /**
   * Tüm malzemeleri stok miktarlarıyla birlikte getirir
   */
  async getAllMaterials(companyId: string, branchId: string): Promise<MaterialWithStock[]> {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT 
        m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price,
        COALESCE(m.stock_amount, 0) as stock_amount,
        COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE material_id = m.id AND movement_type = 'in' AND deleted_at IS NULL), 0) as total_in,
        COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE material_id = m.id AND movement_type = 'out' AND deleted_at IS NULL), 0) as total_out
      FROM materials m
      WHERE m.deleted_at IS NULL AND m.company_id = ? AND m.branch_id = ?
      ORDER BY m.name ASC
    `).all(companyId, branchId) as any[]

    return rows.map(row => ({
      ...row,
      stock_amount: Number(row.stock_amount || 0)
    }))
  },

  /**
   * Yeni malzeme kartı oluşturur
   */
  async createMaterial(data: MaterialInput, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const id = data.id || randomUUID()
    
    let materialCode = data.code
    if (!materialCode) {
      const { generateMaterialCode } = await import('@/lib/utils/codeGenerator')
      materialCode = await generateMaterialCode()
    }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, unit_price, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        materialCode,
        data.name,
        data.category || null,
        data.unit,
        data.stock_amount || 0,
        data.min_stock_level || 0,
        data.unit_price || 0,
        companyId,
        branchId
      )

      // Varsayılan depo stok kaydı
      db.prepare(`
        INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
      `).run(randomUUID(), id, DEFAULT_WAREHOUSE_ID, data.stock_amount || 0)

      if (data.stock_amount && data.stock_amount > 0) {
        db.prepare(`
          INSERT INTO stock_movements 
          (id, material_id, movement_type, quantity, reference_type, notes, company_id, branch_id, warehouse_id)
          VALUES (?, ?, 'in', ?, 'initial', ?, ?, ?, ?)
        `).run(
          randomUUID(),
          id,
          data.stock_amount,
          'Başlangıç stoku',
          companyId,
          branchId,
          DEFAULT_WAREHOUSE_ID
        )
      }
    })()

    logAudit(db, {
      tableName: 'materials',
      action: 'create',
      recordId: id,
      userId,
      companyId,
      branchId,
      after: { ...data, code: materialCode }
    })

    return { id, code: materialCode }
  },

  /**
   * Stok girişi işler (Birim çevrim, PR tamamlama ve Muhasebe dahil)
   */
  async processStockIn(data: any, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const { material_id, quantity, unit, invoice_number, shipment_number, notes } = data

    // 1. Malzeme ve Birim Kontrolü
    const material = db.prepare('SELECT id, unit, name, code, purchase_price FROM materials WHERE id = ?').get(material_id) as any
    if (!material) throw new Error('Malzeme bulunamadı')

    const baseUnit = material.unit
    let normalizedQuantity = quantity
    if (unit && unit !== baseUnit) {
      const factor = resolveUnitFactor(db, material_id, unit, baseUnit)
      if (!factor) throw new Error(`Birim dönüşümü bulunamadı: ${unit} -> ${baseUnit}`)
      normalizedQuantity = quantity * factor
    }

    const movementId = randomUUID()
    let accountingEntryId: string | null = null

    db.transaction(() => {
      // 2. Stok Güncelleme ve Uyarılar
      applyMaterialStockChange(db, material_id, normalizedQuantity)

      // 3. Depo Stoğu Güncelleme
      db.prepare(`
        INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(material_id, warehouse_id)
        DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `).run(`ms_${material_id}_${DEFAULT_WAREHOUSE_ID}`, material_id, DEFAULT_WAREHOUSE_ID, normalizedQuantity)

      // 4. Hareket Kaydı
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, invoice_number, shipment_number, notes, user_id, warehouse_id, company_id, branch_id)
        VALUES (?, ?, 'in', ?, 'manual', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        movementId,
        material_id,
        normalizedQuantity,
        invoice_number || null,
        shipment_number || null,
        notes || 'Manuel stok girişi',
        userId,
        DEFAULT_WAREHOUSE_ID,
        companyId,
        branchId
      )

      // 5. Satın Alma Taleplerini (PR) Tamamlama
      const orderedRequests = db.prepare(`
        SELECT id, requested_quantity, received_quantity FROM purchase_requests
        WHERE material_id = ? AND status = 'ordered' ORDER BY created_at ASC
      `).all(material_id) as any[]

      let remaining = normalizedQuantity
      for (const req of orderedRequests) {
        if (remaining <= 0) break
        const needed = req.requested_quantity - (req.received_quantity || 0)
        if (needed <= 0) continue
        const fulfilled = Math.min(remaining, needed)
        const newReceived = (req.received_quantity || 0) + fulfilled
        remaining -= fulfilled
        
        db.prepare('UPDATE purchase_requests SET received_quantity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(newReceived, newReceived >= req.requested_quantity ? 'completed' : 'ordered', req.id)
      }
    })()

    // 6. Muhasebe Entegrasyonu
    const amount = (material.purchase_price || 0) * normalizedQuantity
    if (amount > 0) {
      try {
        accountingEntryId = await createJournalEntry({
          entry_date: new Date().toISOString().split('T')[0],
          description: `Stok Girişi: ${material.code || material.name}`,
          reference_type: 'stock_in',
          reference_id: movementId,
          lines: [
            { account_code: '150', debit: amount, credit: 0, description: 'Hammadde Girişi' },
            { account_code: '320', debit: 0, credit: amount, description: 'Satıcılar (Otomatik)' }
          ]
        })
      } catch (e) {
        console.error('Accounting Error:', e)
      }
    }

    // 7. Webhook & Audit
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    void dispatchWebhook('stock.movement', { type: 'in', material_id, quantity: normalizedQuantity, movement_id: movementId })

    logAudit(db, {
      tableName: 'stock_movements',
      action: 'stock_in',
      recordId: movementId,
      userId,
      companyId,
      branchId,
      after: { ...data, normalized_quantity: normalizedQuantity, accounting_entry_id: accountingEntryId }
    })

    return { success: true, movementId, accountingEntryId }
  },

  /**
   * Stok çıkışı işler
   */
  async processStockOut(data: any, companyId: string, branchId: string, userId: string) {
    const db = getDatabase()
    const { material_id, quantity, unit, notes } = data

    const material = db.prepare('SELECT id, unit, name, code, purchase_price FROM materials WHERE id = ?').get(material_id) as any
    if (!material) throw new Error('Malzeme bulunamadı')

    const baseUnit = material.unit
    let normalizedQuantity = quantity
    if (unit && unit !== baseUnit) {
      const factor = resolveUnitFactor(db, material_id, unit, baseUnit)
      if (!factor) throw new Error(`Birim dönüşümü bulunamadı: ${unit} -> ${baseUnit}`)
      normalizedQuantity = quantity * factor
    }

    const movementId = randomUUID()
    let accountingEntryId: string | null = null

    db.transaction(() => {
      // 1. Stok Düşür (applyMaterialStockChange 'Stok yetersiz' hatası fırlatabilir)
      applyMaterialStockChange(db, material_id, -normalizedQuantity)

      // 2. Depo Stoğu Güncelleme
      db.prepare(`
        UPDATE material_stocks SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE material_id = ? AND warehouse_id = ?
      `).run(normalizedQuantity, material_id, DEFAULT_WAREHOUSE_ID)

      // 3. Hareket Kaydı
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, notes, user_id, warehouse_id, company_id, branch_id)
        VALUES (?, ?, 'out', ?, 'manual', ?, ?, ?, ?, ?)
      `).run(movementId, material_id, normalizedQuantity, notes || 'Manuel stok çıkışı', userId, DEFAULT_WAREHOUSE_ID, companyId, branchId)
    })()

    // 4. Muhasebe (Maliyet Kaydı)
    const amount = (material.purchase_price || 0) * normalizedQuantity
    if (amount > 0) {
      try {
        accountingEntryId = await createJournalEntry({
          entry_date: new Date().toISOString().split('T')[0],
          description: `Stok Çıkışı: ${material.code || material.name}`,
          reference_type: 'stock_out',
          reference_id: movementId,
          lines: [
            { account_code: '620', debit: amount, credit: 0, description: 'Satılan Malın Maliyeti / Üretim' },
            { account_code: '150', debit: 0, credit: amount, description: 'Hammadde Çıkışı' }
          ]
        })
      } catch (e) {
        console.error('Accounting Error:', e)
      }
    }

    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    void dispatchWebhook('stock.movement', { type: 'out', material_id, quantity: normalizedQuantity, movement_id: movementId })

    logAudit(db, {
      tableName: 'stock_movements',
      action: 'stock_out',
      recordId: movementId,
      userId,
      companyId,
      branchId,
      after: { ...data, normalized_quantity: normalizedQuantity, accounting_entry_id: accountingEntryId }
    })

    return { success: true, movementId }
  },

  /**
   * Stok miktarlarını hareketlerden yeniden hesaplar (Tam Liste)
   */
  async recalculateAllStocks(companyId: string, branchId: string) {
    const db = getDatabase()
    const materials = db.prepare('SELECT id FROM materials WHERE company_id = ? AND branch_id = ? AND deleted_at IS NULL')
      .all(companyId, branchId) as { id: string }[]

    db.transaction(() => {
      for (const m of materials) {
        const moves = db.prepare('SELECT movement_type, quantity FROM stock_movements WHERE material_id = ? AND deleted_at IS NULL')
          .all(m.id) as { movement_type: string, quantity: number }[]
        
        const total = moves.reduce((acc, mov) => mov.movement_type === 'in' ? acc + mov.quantity : acc - mov.quantity, 0)
        
        db.prepare('UPDATE materials SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(total, m.id)
        db.prepare('UPDATE material_stocks SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE material_id = ? AND warehouse_id = ?')
          .run(total, m.id, DEFAULT_WAREHOUSE_ID)
      }
    })()

    return { materials_updated: materials.length }
  }
}
