import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { resolveUnitFactor } from '@/lib/units'

// POST: Hammadde stok çıkışı
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { material_id, quantity, unit, warehouse_id, notes, user_id } = body

    if (!material_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Malzeme ve miktar (pozitif değer) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Mevcut malzeme bilgisini al
    const targetWarehouseId = warehouse_id || DEFAULT_WAREHOUSE_ID

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
          { error: `Birim dönüşümü bulunamadı (${unit} → ${baseUnit})` },
          { status: 400 }
        )
      }
      normalizedQuantity = quantity * factor
    }

    // Mevcut stok miktarını al
    const currentStock = material.stock_amount || 0
    
    // Yeni stok miktarını hesapla
    const newStock = currentStock - normalizedQuantity

    // Negatif stoka izin ver (kullanıcı uyarısı için)
    // if (newStock < 0) {
    //   return NextResponse.json(
    //     { error: `Stok yetersiz. Mevcut: ${currentStock}, İstenen: ${quantity}` },
    //     { status: 400 }
    //   )
    // }

    db.transaction(() => {
      // Stoku güncelle
      db.prepare(`
        UPDATE materials
        SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, material_id)

      db.prepare(`
        INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(material_id, warehouse_id)
        DO UPDATE SET quantity = quantity - excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `).run(
        `ms_${material_id}_${targetWarehouseId}`,
        material_id,
        targetWarehouseId,
        normalizedQuantity
      )

      // Stok hareketi kaydı oluştur
      const movementId = randomUUID()
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, reference_id, notes, user_id, warehouse_id, from_warehouse_id, created_at)
        VALUES (?, ?, 'out', ?, 'manual', NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        material_id,
        normalizedQuantity,
        notes || `${unit && baseUnit && unit !== baseUnit ? `[${quantity} ${unit} → ${normalizedQuantity} ${baseUnit}] ` : ''}Manuel stok çıkışı - ${new Date().toLocaleString('tr-TR')}`,
        user_id || null,
        targetWarehouseId,
        targetWarehouseId
      )
    })()

    // Güncel malzeme bilgisini al
    const updatedMaterial = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id)

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      previous_stock: currentStock,
      new_stock: newStock,
      message: 'Stok çıkışı başarıyla yapıldı',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


