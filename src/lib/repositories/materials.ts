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
  company_id?: string
  branch_id?: string
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
  company_id: string
  branch_id: string
}

export const materialsRepo = {
  getAll(companyId: string, branchId: string): MaterialRow[] {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT 
        m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'in' THEN sm.quantity ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'out' THEN sm.quantity ELSE 0 END), 0) as total_out
      FROM materials m
      LEFT JOIN stock_movements sm ON sm.material_id = m.id AND sm.material_id IS NOT NULL AND sm.company_id = m.company_id
      WHERE m.deleted_at IS NULL AND m.company_id = ? AND m.branch_id = ?
      GROUP BY m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price
      ORDER BY m.name
    `).all(companyId, branchId) as (MaterialRow & { total_in: number; total_out: number })[]
    
    return rows.map((r) => ({
      ...r,
      stock_amount: Number(r.total_in || 0) - Number(r.total_out || 0),
      total_in: r.total_in,
      total_out: r.total_out,
    }))
  },

  getById(id: string, companyId: string, branchId: string): MaterialRow | undefined {
    const db = getDatabase()
    return db.prepare('SELECT * FROM materials WHERE id = ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL').get(id, companyId, branchId) as MaterialRow | undefined
  },

  insert(material: MaterialInsert) {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, unit_price, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      material.id,
      material.code,
      material.name,
      material.category,
      material.unit,
      material.stock_amount,
      material.min_stock_level,
      material.unit_price,
      material.company_id,
      material.branch_id
    )
    return { id: material.id, code: material.code }
  },
}
