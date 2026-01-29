import type Database from 'better-sqlite3'

type MaterialRow = {
  stock_amount: number
  reserved_quantity: number
  min_stock_level: number
  version: number
}

type StockChangeOptions = {
  allowNegative?: boolean
}

export function applyMaterialStockChange(
  db: Database.Database,
  materialId: string,
  deltaStock: number,
  deltaReserved = 0,
  options: StockChangeOptions = {}
) {
  const allowNegative = options.allowNegative === true

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = db.prepare(`
      SELECT stock_amount, reserved_quantity, min_stock_level, version
      FROM materials
      WHERE id = ? AND deleted_at IS NULL
    `).get(materialId) as MaterialRow | undefined

    if (!current) {
      throw new Error('Malzeme bulunamadı')
    }

    const nextStock = (current.stock_amount || 0) + deltaStock
    const nextReserved = (current.reserved_quantity || 0) + deltaReserved

    if (!allowNegative && nextStock < 0) {
      throw new Error('Stok yetersiz')
    }
    if (nextReserved < 0) {
      throw new Error('Rezerve miktar yetersiz')
    }
    if (nextReserved > nextStock) {
      throw new Error('Rezerve miktar stoktan fazla olamaz')
    }

    const result = db.prepare(`
      UPDATE materials
      SET stock_amount = ?,
          reserved_quantity = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND version = ?
    `).run(nextStock, nextReserved, materialId, current.version)

    if (result.changes > 0) {
      const available = nextStock - nextReserved
      const minLevel = current.min_stock_level || 0
      const hasAlert = db.prepare(`
        SELECT id FROM stock_alerts
        WHERE material_id = ? AND status = 'open' AND deleted_at IS NULL
        LIMIT 1
      `).get(materialId) as { id?: string } | undefined

      if (available <= minLevel) {
        if (!hasAlert?.id) {
          db.prepare(`
            INSERT INTO stock_alerts (id, material_id, level, message, status)
            VALUES (?, ?, 'critical', ?, 'open')
          `).run(
            db.prepare('SELECT lower(hex(randomblob(16))) as id').get()?.id,
            materialId,
            `Kritik stok seviyesi: Mevcut ${available.toFixed(2)}`
          )
        }
      } else if (hasAlert?.id) {
        db.prepare(`
          UPDATE stock_alerts
          SET status = 'resolved',
              resolved_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(hasAlert.id)
      }

      return { stock_amount: nextStock, reserved_quantity: nextReserved }
    }
  }

  throw new Error('Stok güncellenemedi, tekrar deneyin')
}
