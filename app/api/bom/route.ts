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
      // Önce ürün bilgisini al
      const product = db.prepare('SELECT id, name, sku FROM active_products WHERE id = ?').get(productId) as { id: string; name: string; sku: string } | undefined
      
      if (!product) {
        return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
      }

      const versionId = versionIdParam || await resolveActiveVersionId(db, productId)
      
      // Belirli bir ürün için BOM kayıtlarını getir
      let bomItems = db.prepare(`
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
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN active_products p ON b.product_id = p.id
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.version_id = ? AND b.deleted_at IS NULL
        ORDER BY m.name
      `).all(productId, versionId) as BomItemRow[]

      // Eğer aktif versiyonda BOM bulunamadıysa, tüm versiyonlarda ara
      if (bomItems.length === 0) {
        bomItems = db.prepare(`
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
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
          JOIN active_products p ON b.product_id = p.id
          JOIN materials m ON b.material_id = m.id
          WHERE b.product_id = ? AND b.deleted_at IS NULL
          ORDER BY bv.version_no DESC, m.name
          LIMIT 100
        `).all(productId) as BomItemRow[]
        
        if (bomItems.length > 0) {
          console.log(`[BOM API] Aktif olmayan versiyondan BOM bulundu: ${product.name} (${productId})`)
        }
      }

      // Eğer hala BOM bulunamadıysa, ürün adına göre eşleştirme yap
      if (bomItems.length === 0) {
        // Ürün adından SKU kısmını çıkar (örn: "PRD-127652 - ATLAS ÜÇLÜ" -> "ATLAS ÜÇLÜ")
        const extractProductName = (fullName: string): string => {
          if (!fullName) return ''
          // " - " ile ayrılmış kısımları kontrol et
          if (fullName.includes(' - ')) {
            const parts = fullName.split(' - ')
            // Son kısmı al (genellikle ürün adı)
            return parts[parts.length - 1].trim()
          }
          // SKU formatını kontrol et (PRD-XXXXX ile başlayan)
          const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
          if (skuMatch) {
            return skuMatch[1].trim()
          }
          return fullName.trim()
        }

        const productNameOnly = extractProductName(product.name)
        console.log(`[BOM API] Fallback: product.name="${product.name}", productNameOnly="${productNameOnly}"`)
        
        // Ürün adı zaten temizse (SKU içermiyorsa) veya SKU içeriyorsa, her iki durumda da fallback yap
        if (productNameOnly) {
          // Önce aktif versiyonlarda ara
          let fallbackProducts = db.prepare(`
            SELECT DISTINCT p.id, p.name, p.sku
            FROM active_products p
            JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
            JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
            WHERE p.id != ? AND (
              p.name LIKE ? OR 
              p.name LIKE ? OR
              (p.name LIKE ? AND p.name NOT LIKE ?)
            )
            GROUP BY p.id, p.name, p.sku
            ORDER BY COUNT(b.id) DESC
            LIMIT 1
          `).all(
            productId,
            `%${productNameOnly}%`,
            `% - ${productNameOnly}%`,
            `%${productNameOnly}%`,
            `% - %${productNameOnly}%`
          ) as Array<{ id: string; name: string; sku: string }>

          // Aktif versiyonlarda yoksa, tüm versiyonlarda ara
          if (fallbackProducts.length === 0) {
            fallbackProducts = db.prepare(`
              SELECT DISTINCT p.id, p.name, p.sku
              FROM active_products p
              JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
              JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
              WHERE p.id != ? AND (
                p.name LIKE ? OR 
                p.name LIKE ? OR
                (p.name LIKE ? AND p.name NOT LIKE ?)
              )
              GROUP BY p.id, p.name, p.sku
              ORDER BY COUNT(b.id) DESC
              LIMIT 1
            `).all(
              productId,
              `%${productNameOnly}%`,
              `% - ${productNameOnly}%`,
              `%${productNameOnly}%`,
              `% - %${productNameOnly}%`
            ) as Array<{ id: string; name: string; sku: string }>
          }

          if (fallbackProducts.length > 0) {
            const fallbackProduct = fallbackProducts[0]
            const fallbackVersionId = await resolveActiveVersionId(db, fallbackProduct.id)
            
            // Önce aktif versiyonlarda ara
            bomItems = db.prepare(`
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
              JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
              JOIN active_products p ON b.product_id = p.id
              JOIN materials m ON b.material_id = m.id
              WHERE b.product_id = ? AND b.version_id = ? AND b.deleted_at IS NULL
              ORDER BY m.name
            `).all(fallbackProduct.id, fallbackVersionId) as BomItemRow[]
            
            // Aktif versiyonlarda yoksa, tüm versiyonlarda ara
            if (bomItems.length === 0) {
              bomItems = db.prepare(`
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
                JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
                JOIN active_products p ON b.product_id = p.id
                JOIN materials m ON b.material_id = m.id
                WHERE b.product_id = ? AND b.deleted_at IS NULL
                ORDER BY bv.version_no DESC, m.name
                LIMIT 100
              `).all(fallbackProduct.id) as BomItemRow[]
            }
            
            if (bomItems.length > 0) {
              console.log(`[BOM API] ✅ Fallback ile BOM bulundu: ${product.name} (${productId}) -> ${fallbackProduct.name} (${fallbackProduct.id}) - ${bomItems.length} adet`)
            } else {
              console.warn(`[BOM API] ⚠️ Fallback ürün bulundu ama BOM yok: ${fallbackProduct.name} (${fallbackProduct.id})`)
            }
          } else {
            console.warn(`[BOM API] ⚠️ Fallback ürün bulunamadı: productNameOnly="${productNameOnly}"`)
          }
        }
      }

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

