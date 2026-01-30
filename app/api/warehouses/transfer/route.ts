import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { resolveUnitFactor } from '@/lib/units'

type TransferInput = {
  material_id?: string
  from_warehouse_id?: string
  to_warehouse_id?: string
  quantity?: number
  unit?: string
  notes?: string
}

// POST: Depolar arası transfer
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as TransferInput
    const { material_id, from_warehouse_id, to_warehouse_id, quantity, unit, notes } = body

    if (!material_id || !from_warehouse_id || !to_warehouse_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'material_id, from_warehouse_id, to_warehouse_id ve quantity (pozitif) gerekli' },
        { status: 400 }
      )
    }

    if (from_warehouse_id === to_warehouse_id) {
      return NextResponse.json({ error: 'Kaynak ve hedef depo aynı olamaz' }, { status: 400 })
    }

    const db = getDatabase()

    const material = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id) as any
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    const fromWarehouse = db.prepare('SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(from_warehouse_id) as any
    const toWarehouse = db.prepare('SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(to_warehouse_id) as any
    if (!fromWarehouse || !toWarehouse) {
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

    const sourceRow = db.prepare(`
      SELECT quantity FROM material_stocks
      WHERE material_id = ? AND warehouse_id = ?
    `).get(material_id, from_warehouse_id) as { quantity?: number } | undefined

    const sourceQty = sourceRow?.quantity || 0
    if (sourceQty < normalizedQuantity) {
      return NextResponse.json(
        { error: `Kaynak depo stok yetersiz. Mevcut: ${sourceQty} ${baseUnit}` },
        { status: 400 }
      )
    }

    db.transaction(() => {
      db.prepare(`
        INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(material_id, warehouse_id)
        DO UPDATE SET quantity = quantity - excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `).run(
        `ms_${material_id}_${from_warehouse_id}`,
        material_id,
        from_warehouse_id,
        normalizedQuantity
      )

      db.prepare(`
        INSERT INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(material_id, warehouse_id)
        DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP
      `).run(
        `ms_${material_id}_${to_warehouse_id}`,
        material_id,
        to_warehouse_id,
        normalizedQuantity
      )

      const transferNote = `${notes ? notes + ' - ' : ''}${unit && baseUnit && unit !== baseUnit ? `[${quantity} ${unit} → ${normalizedQuantity} ${baseUnit}] ` : ''}Depo transferi`

      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, from_warehouse_id, to_warehouse_id, created_at)
        VALUES (?, ?, 'out', ?, 'transfer', NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        randomUUID(),
        material_id,
        normalizedQuantity,
        transferNote,
        from_warehouse_id,
        from_warehouse_id,
        to_warehouse_id
      )

      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, from_warehouse_id, to_warehouse_id, created_at)
        VALUES (?, ?, 'in', ?, 'transfer', NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        randomUUID(),
        material_id,
        normalizedQuantity,
        transferNote,
        to_warehouse_id,
        from_warehouse_id,
        to_warehouse_id
      )
    })()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
