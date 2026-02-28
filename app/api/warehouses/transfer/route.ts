import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Depolar arası transfer
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { from_warehouse_id, to_warehouse_id, material_id, quantity, notes } = body

    if (!from_warehouse_id || !to_warehouse_id || !material_id || !quantity) {
      return fail('from_warehouse_id, to_warehouse_id, material_id ve quantity zorunludur', { status: 400 })
    }

    if (from_warehouse_id === to_warehouse_id) {
      return fail('Kaynak ve hedef depo aynı olamaz', { status: 400 })
    }

    if (quantity <= 0) {
      return fail('Miktar 0\'dan büyük olmalıdır', { status: 400 })
    }

    const db = getDatabase()

    // Depoları kontrol et
    const fromWarehouse = db.prepare('SELECT id, name FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(from_warehouse_id) as any
    const toWarehouse = db.prepare('SELECT id, name FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(to_warehouse_id) as any

    if (!fromWarehouse) return fail('Kaynak depo bulunamadı', { status: 404 })
    if (!toWarehouse) return fail('Hedef depo bulunamadı', { status: 404 })

    // Malzemeyi kontrol et
    const material = db.prepare('SELECT id, name, stock_amount FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id) as any
    if (!material) return fail('Malzeme bulunamadı', { status: 404 })

    const transferId = randomUUID()

    db.transaction(() => {
      // Çıkış hareketi
      db.prepare(`
        INSERT INTO stock_movements (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, from_warehouse_id, to_warehouse_id)
        VALUES (?, ?, 'transfer_out', ?, 'transfer', ?, ?, ?, ?, ?)
      `).run(randomUUID(), material_id, -quantity, transferId, notes || `${fromWarehouse.name} → ${toWarehouse.name} transfer`, from_warehouse_id, from_warehouse_id, to_warehouse_id)

      // Giriş hareketi
      db.prepare(`
        INSERT INTO stock_movements (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, from_warehouse_id, to_warehouse_id)
        VALUES (?, ?, 'transfer_in', ?, 'transfer', ?, ?, ?, ?, ?)
      `).run(randomUUID(), material_id, quantity, transferId, notes || `${fromWarehouse.name} → ${toWarehouse.name} transfer`, to_warehouse_id, from_warehouse_id, to_warehouse_id)
    })()

    return ok({
      success: true,
      transfer_id: transferId,
      from: fromWarehouse.name,
      to: toWarehouse.name,
      material: material.name,
      quantity,
    }, { status: 201 })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
