/**
 * Stok hareketi repository – manuel giriş/çıkış kayıtları
 */

import { getDatabase } from '@/lib/database/db'

export type StockMovementInsert = {
  id: string
  material_id?: string | null
  product_id: string
  movement_type: 'in' | 'out'
  quantity: number
  reference_type?: string | null
  reference_id?: string | null
  notes?: string | null
  user_id?: string | null
}

export const stockMovementRepository = {
  /** Yeni stok hareketi ekle */
  create(row: StockMovementInsert): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO stock_movements
      (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, notes, user_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      row.id,
      row.material_id ?? null,
      row.product_id,
      row.movement_type,
      row.quantity,
      row.reference_type ?? null,
      row.reference_id ?? null,
      row.notes ?? null,
      row.user_id ?? null
    )
  },
}
