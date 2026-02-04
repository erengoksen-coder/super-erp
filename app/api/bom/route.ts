import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type BomItemRow = {
  id: string
  product_id: string
  material_id: string
  quantity: number
  unit?: string | null
  fire_percentage: number | null
  waste_percentage?: number | null
  parent_id?: string | null
  material_name: string
  material_code: string | null
  material_unit: string
  material_category: string | null
  material_unit_price: number | null
  product_name: string
  product_sku: string
}

type GroupedBom = {
  product_id: string
  product_name: string
  product_sku: string
  items: BomItemRow[]
}

type ProductRow = {
  id: string
}

type MaterialRow = {
  id: string
}

type BomExistingRow = {
  id: string
}

type BomTreeNode = BomItemRow & { children: BomTreeNode[] }

type BomVersionRow = {
  id: string
}

async function resolveActiveVersionId(db: ReturnType<typeof getDatabase>, productId: string) {
  const active = db.prepare(`
    SELECT id FROM bom_versions
    WHERE product_id = ? AND is_active = 1 AND deleted_at IS NULL
    ORDER BY version_no DESC
    LIMIT 1
  `).get(productId) as BomVersionRow | undefined
  if (active?.id) return active.id

  const latest = db.prepare(`
    SELECT id FROM bom_versions
    WHERE product_id = ? AND deleted_at IS NULL
    ORDER BY version_no DESC
    LIMIT 1
  `).get(productId) as BomVersionRow | undefined
  if (latest?.id) return latest.id

  const versionId = randomUUID()
  const today = new Date().toISOString().split('T')[0]
  db.prepare(`
    INSERT INTO bom_versions
    (id, product_id, version_no, effective_date, revision_reason, is_active)
    VALUES (?, ?, 1, ?, 'İlk versiyon', 1)
  `).run(versionId, productId, today)
  return versionId
}

// GET: Tüm BOM kayıtlarını getir veya belirli bir ürün için
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const asTree = searchParams.get('tree') === '1'
    const versionIdParam = searchParams.get('version_id')

    const db = getDatabase()

    if (productId) {
      const versionId = versionIdParam || await resolveActiveVersionId(db, productId)
      // Belirli bir ürün için BOM kayıtlarını getir
      const bomItems = db.prepare(`
        SELECT 
          b.*,
          m.name as material_name,
          m.code as material_code,
          m.unit as material_unit,
          m.category as material_category,
          m.unit_price as material_unit_price,
          p.name as product_name,
          p.sku as product_sku
        FROM bom b
        JOIN active_products p ON b.product_id = p.id
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.version_id = ? AND b.deleted_at IS NULL
        ORDER BY m.name
      `).all(productId, versionId)

      if (!asTree) {
        return NextResponse.json(bomItems)
      }

      const byId = new Map<string, BomTreeNode>()
      const roots: BomTreeNode[] = []
      for (const item of bomItems as BomItemRow[]) {
        byId.set(item.id, { ...item, children: [] })
      }
      for (const item of bomItems as BomItemRow[]) {
        const node = byId.get(item.id)
        if (!node) continue
        if (item.parent_id && byId.has(item.parent_id)) {
          byId.get(item.parent_id)?.children.push(node)
        } else {
          roots.push(node)
        }
      }
      return NextResponse.json(roots)
    } else {
      // Tüm BOM kayıtlarını ürün bazlı grupla
      const allBom = db.prepare(`
        SELECT 
          b.id,
          b.product_id,
          b.material_id,
          b.parent_id,
          b.quantity_required as quantity,
          b.unit as unit,
          b.fire_percentage,
          m.name as material_name,
          m.code as material_code,
          m.unit as material_unit,
          m.category as material_category,
          m.unit_price as material_unit_price,
          p.name as product_name,
          p.sku as product_sku
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN active_products p ON b.product_id = p.id
        JOIN materials m ON b.material_id = m.id
        WHERE b.deleted_at IS NULL
        ORDER BY p.sku, m.name
      `).all() as BomItemRow[]

      // �Srün bazlı grupla
      const groupedByProduct = allBom.reduce<Record<string, GroupedBom>>((acc, item) => {
        const key = item.product_id
        if (!acc[key]) {
          acc[key] = {
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            items: [],
          }
        }
        acc[key].items.push(item)
        return acc
      }, {} as Record<string, GroupedBom>)

      return NextResponse.json(Object.values(groupedByProduct))
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni BOM kaydı oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const raw = await request.text()
    let body: any = null
    if (raw && raw.trim()) {
      try {
        body = JSON.parse(raw)
      } catch {
        const params = new URLSearchParams(raw)
        body = Object.fromEntries(params.entries())
      }
    } else {
      body = {}
    }
    const { product_id, material_id, quantity, unit, fire_percentage, waste_percentage, parent_id, version_id } = body

    if (!product_id || !material_id || quantity === undefined || quantity <= 0) {
      return NextResponse.json(
        { error: 'product_id, material_id ve quantity (pozitif) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // �Srün ve malzeme kontrolü
    const product = db.prepare('SELECT id FROM active_products WHERE id = ?').get(product_id) as ProductRow | undefined
    if (!product) {
      return NextResponse.json({ error: '�Srün bulunamadı' }, { status: 404 })
    }

    const material = db.prepare('SELECT id, unit FROM materials WHERE id = ?').get(material_id) as (MaterialRow & { unit?: string | null }) | undefined
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    const resolvedVersionId = version_id || await resolveActiveVersionId(db, product_id)

    const resolvedWaste = waste_percentage ?? fire_percentage ?? 0
    const resolvedUnit = (unit || material.unit || '').toString().trim().toLowerCase() || null

    // Aynı ürün-malzeme kombinasyonu var mı kontrol et (versiyon bazlı)
    const existing = db.prepare(`
      SELECT id FROM bom 
      WHERE product_id = ? AND version_id = ? AND material_id = ?
        AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
        AND deleted_at IS NULL
    `).get(product_id, resolvedVersionId, material_id, parent_id || null, parent_id || null) as BomExistingRow | undefined

    if (existing) {
      // Mevcut kaydı güncelle
      db.prepare(`
        UPDATE bom
        SET quantity_required = ?,
            unit = ?,
            fire_percentage = COALESCE(?, fire_percentage),
            waste_percentage = COALESCE(?, waste_percentage),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(quantity, resolvedUnit, resolvedWaste, resolvedWaste, existing.id)

      return NextResponse.json({
        success: true,
        message: 'BOM kaydı güncellendi',
        id: existing.id,
      })
    } else {
      // Yeni kayıt oluştur
      const bomId = randomUUID()
      db.prepare(`
        INSERT INTO bom 
        (id, version_id, product_id, material_id, parent_id, quantity_required, unit, fire_percentage, waste_percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(bomId, resolvedVersionId, product_id, material_id, parent_id || null, quantity, resolvedUnit, resolvedWaste, resolvedWaste)

      return NextResponse.json({
        success: true,
        message: 'BOM kaydı oluşturuldu',
        id: bomId,
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: BOM kaydını sil
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const bomId = searchParams.get('id')

    if (!bomId) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const toDelete: string[] = []
    const queue: string[] = [bomId]

    while (queue.length > 0) {
      const currentId = queue.shift()
      if (!currentId) continue
      toDelete.push(currentId)
      const children = db.prepare('SELECT id FROM bom WHERE parent_id = ?').all(currentId) as Array<{ id: string }>
      for (const child of children) {
        queue.push(child.id)
      }
    }

    for (const id of toDelete.reverse()) {
      db.prepare(`
        UPDATE bom
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id)
    }

    return NextResponse.json({ success: true, message: 'BOM kaydı silindi' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

