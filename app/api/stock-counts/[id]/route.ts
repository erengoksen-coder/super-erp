import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { randomUUID } from 'crypto'

type StockCountItemUpdate = {
  id: string
  counted_qty: number
}

type StockCountUpdate = {
  status?: 'draft' | 'completed'
  items?: StockCountItemUpdate[]
}

// GET: Stok sayımı detayı
export const GET = withAuth(async (
  request: NextRequest, user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const count = db.prepare('SELECT * FROM stock_counts WHERE id = ?').get(resolvedParams.id)
    if (!count) {
      return NextResponse.json({ error: 'Sayım bulunamadı' }, { status: 404 })
    }
    const items = db.prepare(`
      SELECT sci.*, m.name as material_name, m.unit as material_unit
      FROM stock_count_items sci
      JOIN materials m ON sci.material_id = m.id
      WHERE sci.count_id = ?
      ORDER BY m.name
    `).all(resolvedParams.id)
    return NextResponse.json({ ...count, items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Stok sayımı güncelle / tamamla
export const PATCH = withAuth(async (
  request: NextRequest, user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request) as StockCountUpdate
    const db = getDatabase()

    const count = db.prepare('SELECT * FROM stock_counts WHERE id = ?').get(resolvedParams.id) as any
    if (!count) {
      return NextResponse.json({ error: 'Sayım bulunamadı' }, { status: 404 })
    }

    db.transaction(() => {
      if (body.items && body.items.length > 0) {
        const updateItem = db.prepare(`
          UPDATE stock_count_items
          SET counted_qty = ?, difference = ? - expected_qty
          WHERE id = ?
        `)
        for (const item of body.items) {
          updateItem.run(item.counted_qty, item.counted_qty, item.id)
        }
      }

      if (body.status === 'completed' && count.status !== 'completed') {
        const items = db.prepare('SELECT * FROM stock_count_items WHERE count_id = ?').all(resolvedParams.id) as any[]

        for (const item of items) {
          const diff = item.counted_qty - item.expected_qty

          db.prepare(`
            UPDATE material_stocks
            SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE material_id = ? AND warehouse_id = ?
          `).run(item.counted_qty, item.material_id, count.warehouse_id)

          applyMaterialStockChange(db, item.material_id, diff)

          if (diff !== 0) {
            db.prepare(`
              INSERT INTO stock_movements
              (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, created_at)
              VALUES (?, ?, ?, ?, 'stock_count', ?, ?, ?, CURRENT_TIMESTAMP)
            `).run(
              randomUUID(),
              item.material_id,
              diff > 0 ? 'in' : 'out',
              Math.abs(diff),
              resolvedParams.id,
              `Stok sayımı düzeltmesi`,
              count.warehouse_id
            )
          }
        }
      }

      if (body.status) {
        db.prepare(`
          UPDATE stock_counts
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(body.status, resolvedParams.id)
      }
    })()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
