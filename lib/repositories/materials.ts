import { getDatabase } from '@/lib/database/db'

export type MaterialRow = {
  id: string
  code: string | null
  name: string
  category: string | null
  unit: string
  stock_amount: number
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

export const materialsRepo = {
  getAll(): MaterialRow[] {
    const db = getDatabase()
    return db.prepare('SELECT * FROM materials WHERE deleted_at IS NULL ORDER BY name').all() as MaterialRow[]
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
