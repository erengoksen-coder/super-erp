import { getDatabase } from '@/lib/database/db'

export type MaterialRow = {
  id: string
  code: string | null
  name: string
  category: string | null
  unit: string
  stock_amount: number
  total_in?: number
  total_out?: number
  min_stock_level: number
  unit_price: number
}

export type MaterialInsert = {
  id: string
  code: string
  name: string
  category: string | null
  unit: string
  stock_amount: number
  min_stock_level: number
  unit_price: number
}

/** Mevcut KMS-XXX kodlarından sonraki sıra numarasını döner (örn. KMS-001, KMS-002 varsa 3). */
export function getNextKmsNumber(db: ReturnType<typeof getDatabase>): number {
  const rows = db.prepare(`
    SELECT code FROM materials WHERE code IS NOT NULL AND code GLOB 'KMS-[0-9]*'
  `).all() as { code: string }[]
  let max = 0
  for (const r of rows) {
    const m = r.code.match(/KMS-(\d+)/)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  return max + 1
}

/** Yeni malzeme için sıradaki KMS kodunu üretir (KMS-001, KMS-002, ...). */
export function generateNextKmsCode(db: ReturnType<typeof getDatabase>): string {
  const next = getNextKmsNumber(db)
  return `KMS-${String(next).padStart(3, '0')}`
}

/** Tüm malzemelere isim sırasına göre sıralı KMS-001, KMS-002, ... atar. Zaten sıralıysa dokunmaz. */
function ensureMaterialCodes(db: ReturnType<typeof getDatabase>) {
  const rows = db.prepare(`
    SELECT id, code FROM materials WHERE deleted_at IS NULL ORDER BY name ASC, id ASC
  `).all() as { id: string; code: string | null }[]
  if (rows.length === 0) return
  const expected = rows.map((_, i) => `KMS-${String(i + 1).padStart(3, '0')}`)
  const current = rows.map(r => (r.code && r.code.trim()) || '')
  const needsRenumber = current.some((c, i) => c !== expected[i])
  if (!needsRenumber) return
  db.transaction(() => {
    const update = db.prepare('UPDATE materials SET code = ?, updated_at = datetime(\'now\') WHERE id = ?')
    for (const row of rows) {
      update.run('KMS-TMP-' + row.id, row.id)
    }
    for (let i = 0; i < rows.length; i++) {
      update.run(expected[i], rows[i].id)
    }
  })()
}

export const materialsRepo = {
  getAll(): MaterialRow[] {
    const db = getDatabase()
    ensureMaterialCodes(db)
    const rows = db.prepare(`
      SELECT 
        m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END), 0) as total_out
      FROM materials m
      LEFT JOIN stock_movements sm ON sm.material_id = m.id AND sm.material_id IS NOT NULL
      WHERE m.deleted_at IS NULL
      GROUP BY m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price
      ORDER BY m.code IS NULL, m.code ASC, m.name ASC
    `).all() as (MaterialRow & { total_in: number; total_out: number })[]
    return rows.map((r) => ({
      ...r,
      stock_amount: Number(r.total_in || 0) - Number(r.total_out || 0),
      total_in: r.total_in,
      total_out: r.total_out,
    }))
  },

  getById(id: string): MaterialRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(id) as MaterialRow | undefined
  },

  insert(material: MaterialInsert) {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, unit_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      material.id,
      material.code,
      material.name,
      material.category,
      material.unit,
      material.stock_amount,
      material.min_stock_level,
      material.unit_price
    )
    return { id: material.id, code: material.code }
  },
}
