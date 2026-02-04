import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { createJournalEntry } from '@/lib/utils/accounting'

// POST: Hammadde stok girişi
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: any
    try {
      body = await parseJsonBody(request)
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Geçersiz istek verisi' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Geçersiz istek verisi' },
        { status: 400 }
      )
    }

    const { material_id, quantity, unit, warehouse_id, invoice_number, shipment_number, user_id } = body

    if (!material_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Malzeme ve miktar (pozitif deşer) gerekli' },
        { status: 400 }
      )
    }

    // Fatura no veya sevk no zorunlu
    if (!invoice_number?.trim() && !shipment_number?.trim()) {
      return NextResponse.json(
        { error: 'Fatura No veya Sevk No gerekli (en az biri zorunludur)' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    const targetWarehouseId = warehouse_id || DEFAULT_WAREHOUSE_ID

    // Mevcut malzeme bilgisini al
    const material = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id) as any
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(targetWarehouseId) as any
    if (!warehouse) {
      return NextResponse.json({ error: 'Depo bulunamadı' }, { status: 404 })
    }

    const baseUnit = (material.unit || '').toString()
    let normalizedQuantity = quantity
    if (unit && baseUnit && unit !== baseUnit) {
      const factor = resolveUnitFactor(db, material_id, unit, baseUnit)
      if (!factor) {
        return NextResponse.json(
          { error: `Birim dönüşümü bulunamadı (${unit} �  ${baseUnit})` },
          { status: 400 }
        )
      }
      normalizedQuantity = quantity * factor
    }

    // Mevcut stok miktarını al
    const currentStock = material.stock_amount || 0

    let movementId: string | undefined
    db.transaction(() => {
      // Stoku güncelle (optimistic)
      applyMaterialStockChange(db, material_id, normalizedQuantity)

      db.prepare(`
        INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(material_id, warehouse_id)
        DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `).run(
        `ms_${material_id}_${targetWarehouseId}`,
        material_id,
        targetWarehouseId,
        normalizedQuantity
      )

      // Stok hareketi kaydı oluştur
      movementId = randomUUID()
      const invoiceNum = invoice_number?.trim() || null
      const shipmentNum = shipment_number?.trim() || null
      
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, user_id, warehouse_id, to_warehouse_id, created_at)
        VALUES (?, ?, 'in', ?, 'manual', NULL, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        material_id,
        normalizedQuantity,
        invoiceNum,
        shipmentNum,
        `${unit && baseUnit && unit !== baseUnit ? `[${quantity} ${unit} �  ${normalizedQuantity} ${baseUnit}] ` : ''}Manuel stok girişi - ${new Date().toLocaleString('tr-TR')}`,
        user_id || null,
        targetWarehouseId,
        targetWarehouseId
      )

      const priceId = randomUUID()
      const unitCost = Number(material.purchase_price || 0)
      if (unitCost > 0) {
        db.prepare(`
          INSERT INTO material_prices (id, material_id, price, price_type, source_type, source_id)
          VALUES (?, ?, ?, 'purchase', 'stock_in', ?)
        `).run(priceId, material_id, unitCost, movementId)
      }

      // Bu malzeme için "ordered" (sipariş edildi) status'undaki satın alma taleplerini güncelle
      // Stok girişi yapılan miktarı received_quantity'ye ekle
      const orderedRequests = db.prepare(`
        SELECT * FROM purchase_requests
        WHERE material_id = ? AND status = 'ordered'
        ORDER BY created_at ASC
      `).all(material_id) as any[]

      let remainingQuantity = normalizedQuantity
      for (const req of orderedRequests) {
        if (remainingQuantity <= 0) break
        
        const currentReceived = req.received_quantity || 0
        const remainingNeeded = req.requested_quantity - currentReceived
        
        if (remainingNeeded <= 0) continue // Bu talep zaten tamamlanmış
        
        const fulfilledQty = Math.min(remainingQuantity, remainingNeeded)
        const newReceivedQty = currentReceived + fulfilledQty
        remainingQuantity -= fulfilledQty

        // received_quantity'yi güncelle
        db.prepare(`
          UPDATE purchase_requests
          SET received_quantity = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newReceivedQty, req.id)

        // Eşer talep tamamen karşılandıysa status'u "completed" yap
        if (newReceivedQty >= req.requested_quantity) {
          db.prepare(`
            UPDATE purchase_requests
            SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(req.id)
        }
      }
    })()

    let accountingEntryId: string | null = null
    let accountingWarning: string | null = null
    const unitCost = Number(material.purchase_price || 0)
    const entryAmount = unitCost * normalizedQuantity

    if (entryAmount > 0) {
      try {
        const entryDate = new Date().toISOString().split('T')[0]
        const entryDescription = `Stok girişi: ${material.code || material.name}`
        accountingEntryId = await createJournalEntry({
          entry_date: entryDate,
          description: entryDescription,
          reference_type: 'stock_in',
          reference_id: movementId,
          lines: [
            {
              account_code: '150',
              debit: entryAmount,
              credit: 0,
              description: `${entryDescription} (Hammadde)`
            },
            {
              account_code: '320',
              debit: 0,
              credit: entryAmount,
              description: `${entryDescription} (Satıcılar)`
            }
          ]
        })
      } catch (entryError: any) {
        accountingWarning = `Muhasebe kaydı oluşturulamadı: ${entryError.message}`
      }
    }

    // Güncel malzeme bilgisini al
    const updatedMaterial = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id)

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      previous_stock: currentStock,
      new_stock: currentStock + normalizedQuantity,
      accounting_entry_id: accountingEntryId,
      accounting_warning: accountingWarning,
      message: 'Stok girişi başarıyla yapıldı',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

