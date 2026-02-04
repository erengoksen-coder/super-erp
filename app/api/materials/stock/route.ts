import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_WAREHOUSE_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { resolveUnitFactor } from '@/lib/units'
import { applyMaterialStockChange } from '@/lib/materials/stock'

type MaterialRow = {
  id: string
  stock_amount: number
  [key: string]: unknown
}

type StockUpdateInput = {
  material_id?: string
  quantity?: number
  movement_type?: 'in' | 'out'
  notes?: string
  unit?: string
  warehouse_id?: string
}

// POST: Stok giriş/çıkış işlemi
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: StockUpdateInput
    try {
      body = await parseJsonBody(request) as StockUpdateInput
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

    const { material_id, quantity, movement_type, notes, unit, warehouse_id } = body

    if (!material_id || quantity === undefined) {
      return NextResponse.json(
        { error: 'Malzeme ve miktar gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Malzeme bilgisini al
    const targetWarehouseId = warehouse_id || DEFAULT_WAREHOUSE_ID
    const material = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id) as MaterialRow | undefined
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(targetWarehouseId) as any
    if (!warehouse) {
      return NextResponse.json({ error: 'Depo bulunamadı' }, { status: 404 })
    }

    const baseUnit = (material as any).unit ? String((material as any).unit) : ''
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

    // Stoku güncelle (optimistic)
    applyMaterialStockChange(db, material_id, normalizedQuantity)
    const newStock = Number(material.stock_amount || 0) + normalizedQuantity

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
    const movementId = randomUUID()
    db.prepare(`
      INSERT INTO stock_movements 
      (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, from_warehouse_id, to_warehouse_id)
      VALUES (?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?)
    `).run(
      movementId,
      material_id,
      movement_type || (normalizedQuantity > 0 ? 'in' : 'out'),
      Math.abs(normalizedQuantity),
      null,
      notes || `${unit && baseUnit && unit !== baseUnit ? `[${quantity} ${unit} �  ${normalizedQuantity} ${baseUnit}] ` : ''}Mobil stok ${normalizedQuantity > 0 ? 'girişi' : 'çıkışı'}`,
      targetWarehouseId,
      normalizedQuantity < 0 ? targetWarehouseId : null,
      normalizedQuantity > 0 ? targetWarehouseId : null
    )

    return NextResponse.json({
      success: true,
      message: 'Stok güncellendi',
      new_stock: newStock,
      material: {
        ...material,
        stock_amount: newStock,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})



