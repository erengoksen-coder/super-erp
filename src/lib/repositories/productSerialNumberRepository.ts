/**
 * Ürün seri numarası / barkod repository – stok giriş-çıkış
 */

import { getDatabase } from '@/lib/database/db'

export type ProductSerialNumberInsert = {
  id: string
  product_id: string
  serial_number: string
  barcode: string
  status?: string
  notes?: string | null
}

export const productSerialNumberRepository = {
  /** Belirli ürün ve tarih için bugün oluşturulan kayıt sayısı (barkod sıra için) */
  countByProductAndDate(productId: string, dateStr: string): number {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM product_serial_numbers
      WHERE product_id = ? AND date(created_at) = date(?)
    `).get(productId, dateStr) as { count: number } | undefined
    return row?.count ?? 0
  },

  /** Tek barkod kaydı ekle */
  insert(row: ProductSerialNumberInsert): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO product_serial_numbers
      (id, product_id, serial_number, barcode, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      row.id,
      row.product_id,
      row.serial_number,
      row.barcode,
      row.status ?? 'in_stock',
      row.notes ?? null
    )
  },

  /** Sevk edilebilir barkodlar (en eski önce; stok çıkışında işaretlemek için) */
  listAvailableForShipment(productId: string, limit: number): { id: string; barcode: string }[] {
    const db = getDatabase()
    return db.prepare(`
      SELECT psn.id, psn.barcode
      FROM product_serial_numbers psn
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      WHERE psn.product_id = ?
        AND psn.status = 'in_stock'
        AND psn.ready_for_shipment = 0
        AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        AND (psn.production_order_id IS NULL
             OR po.status = 'completed'
             OR (po.status IS NULL))
      ORDER BY psn.created_at ASC
      LIMIT ?
    `).all(productId, limit) as { id: string; barcode: string }[]
  },

  /** Barkodları sevk edilebilir olarak işaretle (customer_id atanır) */
  markReadyForShipment(ids: string[], customerId: string): void {
    if (ids.length === 0) return
    const db = getDatabase()
    const placeholders = ids.map(() => '?').join(',')
    try {
      db.prepare(`
        UPDATE product_serial_numbers
        SET ready_for_shipment = 1, customer_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
      `).run(customerId, ...ids)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('no such column: updated_at')) {
        db.prepare(`
          UPDATE product_serial_numbers
          SET ready_for_shipment = 1, customer_id = ?
          WHERE id IN (${placeholders})
        `).run(customerId, ...ids)
      } else {
        throw e
      }
    }
  },
}
