import type Database from 'better-sqlite3'

type ConversionRow = {
  factor: number
}

export function resolveUnitFactor(
  db: Database.Database,
  materialId: string | null,
  fromUnit: string,
  toUnit: string
) {
  const from = fromUnit.trim().toLowerCase()
  const to = toUnit.trim().toLowerCase()

  if (from === to) {
    return 1
  }

  const direct = db.prepare(`
    SELECT factor
    FROM unit_conversions
    WHERE from_unit = ? AND to_unit = ?
      AND (material_id = ? OR material_id IS NULL)
    ORDER BY CASE WHEN material_id IS NULL THEN 1 ELSE 0 END
    LIMIT 1
  `).get(from, to, materialId) as ConversionRow | undefined

  if (direct?.factor) {
    return direct.factor
  }

  const reverse = db.prepare(`
    SELECT factor
    FROM unit_conversions
    WHERE from_unit = ? AND to_unit = ?
      AND (material_id = ? OR material_id IS NULL)
    ORDER BY CASE WHEN material_id IS NULL THEN 1 ELSE 0 END
    LIMIT 1
  `).get(to, from, materialId) as ConversionRow | undefined

  if (reverse?.factor) {
    return 1 / reverse.factor
  }

  return null
}
