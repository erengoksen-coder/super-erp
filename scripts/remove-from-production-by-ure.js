#!/usr/bin/env node
/**
 * URE numarası veya sipariş takip no ile siparişi üretimden çıkarır (canlı DB).
 * API ile aynı mantık: stok iadesi, barkod silme, URE iptal, sipariş bekleyene alınır.
 *
 * Kullanım:
 *   node scripts/remove-from-production-by-ure.js URE-006
 *   node scripts/remove-from-production-by-ure.js SIP-1770727936279-ed7bb358
 */

const { assertDbExists, openDatabase } = require('./db-utils')
const { randomUUID } = require('crypto')

const dbPath = assertDbExists()
const db = openDatabase(dbPath)

const identifier = process.argv[2]?.trim()
if (!identifier) {
  console.log('Kullanım: node scripts/remove-from-production-by-ure.js <URE-006 veya SIP-xxx>')
  process.exit(1)
}

// Sipariş ID bul: URE-006 ise production_orders'dan bulup o URE'ye bağlı order; SIP-xxx ise order_number ile
let orderId = null
let orderRow = null
let prevProductionOrderId = null
let ureNumber = identifier

if (identifier.toUpperCase().startsWith('URE-')) {
  const po = db.prepare(`
    SELECT id, order_number FROM production_orders
    WHERE (order_number = ? OR order_number = ?) AND (deleted_at IS NULL OR deleted_at = '')
  `).get(identifier, identifier.toUpperCase())
  if (!po) {
    console.log('Üretim emri bulunamadı:', identifier)
    process.exit(1)
  }
  prevProductionOrderId = po.id
  ureNumber = po.order_number
  const order = db.prepare(`
    SELECT id, order_number, status, production_order_id FROM orders
    WHERE production_order_id = ? AND deleted_at IS NULL LIMIT 1
  `).get(prevProductionOrderId)
  if (!order) {
    console.log('Bu URE\'ye bağlı sipariş bulunamadı.')
    process.exit(1)
  }
  orderId = order.id
  orderRow = order
} else {
  const order = db.prepare(`
    SELECT id, order_number, status, production_order_id FROM orders
    WHERE (order_number = ? OR order_number LIKE ?) AND deleted_at IS NULL LIMIT 1
  `).get(identifier, identifier + '%')
  if (!order) {
    console.log('Sipariş bulunamadı:', identifier)
    process.exit(1)
  }
  orderId = order.id
  orderRow = order
  prevProductionOrderId = order.production_order_id
  if (!prevProductionOrderId || String(prevProductionOrderId).trim() === '') {
    console.log('Bu sipariş zaten üretim emrine bağlı değil.')
    process.exit(1)
  }
  const po = db.prepare(`
    SELECT id, order_number FROM production_orders WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
  `).get(prevProductionOrderId)
  ureNumber = po?.order_number ?? `URE-${String(prevProductionOrderId).slice(0, 8)}`
}

const DEFAULT_WAREHOUSE_ID = 'warehouse_default'

function applyStockChange(db, materialId, quantity) {
  const r = db.prepare(`
    UPDATE materials SET stock_amount = stock_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL
  `).run(quantity, materialId)
  if (r.changes === 0) throw new Error('Malzeme bulunamadı veya güncellenemedi')
}

function resolveUnitFactor(db, materialId, fromUnit, toUnit) {
  const from = (fromUnit || '').toString().trim().toLowerCase()
  const to = (toUnit || '').toString().trim().toLowerCase()
  if (from === to) return 1
  const row = db.prepare(`
    SELECT factor FROM unit_conversions
    WHERE from_unit = ? AND to_unit = ? AND (material_id = ? OR material_id IS NULL) AND deleted_at IS NULL
    ORDER BY CASE WHEN material_id IS NULL THEN 1 ELSE 0 END LIMIT 1
  `).get(from, to, materialId)
  if (row?.factor) return row.factor
  const rev = db.prepare(`
    SELECT factor FROM unit_conversions
    WHERE from_unit = ? AND to_unit = ? AND (material_id = ? OR material_id IS NULL) AND deleted_at IS NULL
    ORDER BY CASE WHEN material_id IS NULL THEN 1 ELSE 0 END LIMIT 1
  `).get(to, from, materialId)
  if (rev?.factor) return 1 / rev.factor
  return null
}

console.log('Sipariş üretimden çıkarılıyor:', orderRow.order_number, '| URE:', ureNumber)

db.transaction(() => {
  const outMovements = db.prepare(`
    SELECT material_id, quantity, notes FROM stock_movements
    WHERE reference_id = ? AND movement_type = 'out'
      AND reference_type IN ('production_order', 'production')
      AND (deleted_at IS NULL OR deleted_at = '')
  `).all(prevProductionOrderId)

  const byMaterial = new Map()
  for (const m of outMovements) {
    if (!m.material_id) continue
    const prev = byMaterial.get(m.material_id) ?? { quantity: 0, notes: m.notes || '' }
    const absQty = Math.abs(Number(m.quantity) || 0)
    if (absQty <= 0) continue
    byMaterial.set(m.material_id, { quantity: prev.quantity + absQty, notes: prev.notes || m.notes || '' })
  }

  if (byMaterial.size === 0) {
    const po = db.prepare(`
      SELECT product_id, quantity FROM production_orders WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '')
    `).get(prevProductionOrderId)
    if (po?.product_id) {
      const bom = db.prepare(`
        SELECT material_id, quantity_required, unit, COALESCE(fire_percentage, 0) as fire_percentage,
               (SELECT unit FROM materials WHERE id = b.material_id) as material_unit
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).all(po.product_id)
      for (const item of bom) {
        const firePct = item.fire_percentage || 0
        const qtyWithFire = item.quantity_required * (1 + firePct / 100)
        const fromUnit = (item.unit || '').toString()
        const toUnit = (item.material_unit || '').toString()
        const factor = resolveUnitFactor(db, item.material_id, fromUnit, toUnit)
        const totalRequired = (factor ? qtyWithFire * factor : qtyWithFire) * po.quantity
        if (totalRequired <= 0) continue
        byMaterial.set(item.material_id, { quantity: totalRequired, notes: '' })
      }
    }
  }

  for (const [materialId, { quantity }] of byMaterial) {
    if (quantity <= 0) continue
    try {
      applyStockChange(db, materialId, quantity)
      const movementId = randomUUID()
      db.prepare(`
        INSERT INTO stock_movements
        (id, material_id, movement_type, quantity, reference_type, reference_id, notes, warehouse_id, to_warehouse_id, created_at)
        VALUES (?, ?, 'in', ?, 'production_order_return', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        materialId,
        quantity,
        prevProductionOrderId,
        `İptal olan URE: ${ureNumber} - BOM malzemesi depoya iade`,
        DEFAULT_WAREHOUSE_ID,
        DEFAULT_WAREHOUSE_ID
      )
    } catch (e) {
      console.warn('Malzeme iadesi atlandı:', materialId, e.message)
    }
  }

  db.prepare('DELETE FROM product_serial_numbers WHERE production_order_id = ?').run(prevProductionOrderId)
  db.prepare(`
    UPDATE production_orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(prevProductionOrderId)
  const orderUpdate = db.prepare(`
    UPDATE orders SET status = 'pending', production_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(orderId)
  if (orderUpdate.changes !== 1) {
    console.warn('orders UPDATE beklenen değil:', orderUpdate.changes)
  }
})()

db.close()
console.log('Tamamlandı. Sipariş bekleyene alındı; URE iptal. Üretim sayfasını yenileyin veya canlı güncellemeyi bekleyin.')
process.exit(0)
