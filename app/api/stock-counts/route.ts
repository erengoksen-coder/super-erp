import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, DEFAULT_WAREHOUSE_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type StockCountItemInput = {
  material_id: string
  counted_qty?: number
}

type StockCountInput = {
  warehouse_id?: string
  notes?: string
  items?: StockCountItemInput[]
}

// GET: Stok sayımları
export async function GET() {
  try {
    const db = getDatabase()
    const counts = db.prepare(`
      SELECT sc.*, w.name as warehouse_name
      FROM stock_counts sc
      JOIN warehouses w ON sc.warehouse_id = w.id
      ORDER BY sc.created_at DESC
    `).all()
    return NextResponse.json(counts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni stok sayımı oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as StockCountInput
    const warehouseId = body.warehouse_id || DEFAULT_WAREHOUSE_ID

    const db = getDatabase()
    const warehouse = db.prepare('SELECT id FROM warehouses WHERE id = ? AND deleted_at IS NULL').get(warehouseId) as any
    if (!warehouse) {
      return NextResponse.json({ error: 'Depo bulunamadı' }, { status: 404 })
    }

    const countId = randomUUID()
    db.transaction(() => {
      db.prepare(`
        INSERT INTO stock_counts (id, warehouse_id, notes)
        VALUES (?, ?, ?)
      `).run(countId, warehouseId, body.notes || null)

      const items = body.items && body.items.length > 0
        ? body.items
        : db.prepare(`
            SELECT material_id, quantity as expected_qty
            FROM material_stocks
            WHERE warehouse_id = ?
          `).all(warehouseId).map((row: any) => ({
            material_id: row.material_id,
            counted_qty: row.expected_qty,
          }))

      const insertItem = db.prepare(`
        INSERT INTO stock_count_items (id, count_id, material_id, expected_qty, counted_qty, difference)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      for (const item of items) {
        const expectedRow = db.prepare(`
          SELECT quantity FROM material_stocks
          WHERE material_id = ? AND warehouse_id = ?
        `).get(item.material_id, warehouseId) as { quantity?: number } | undefined
        const expected = expectedRow?.quantity || 0
        const counted = item.counted_qty ?? expected
        const diff = counted - expected

        insertItem.run(
          randomUUID(),
          countId,
          item.material_id,
          expected,
          counted,
          diff
        )
      }
    })()

    return NextResponse.json({ success: true, id: countId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
