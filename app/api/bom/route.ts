import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type BomItemRow = {
  id: string
  product_id: string
  material_id: string
  quantity: number
  fire_percentage: number | null
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

// GET: Tüm BOM kayıtlarını getir veya belirli bir ürün için
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    const db = getDatabase()

    if (productId) {
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
        JOIN products p ON b.product_id = p.id
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ?
        ORDER BY m.name
      `).all(productId)

      return NextResponse.json(bomItems)
    } else {
      // Tüm BOM kayıtlarını ürün bazlı grupla
      const allBom = db.prepare(`
        SELECT 
          b.id,
          b.product_id,
          b.material_id,
          b.quantity_required as quantity,
          b.fire_percentage,
          m.name as material_name,
          m.code as material_code,
          m.unit as material_unit,
          m.category as material_category,
          m.unit_price as material_unit_price,
          p.name as product_name,
          p.sku as product_sku
        FROM bom b
        JOIN products p ON b.product_id = p.id
        JOIN materials m ON b.material_id = m.id
        ORDER BY p.sku, m.name
      `).all() as BomItemRow[]

      // Ürün bazlı grupla
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
}

// POST: Yeni BOM kaydı oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { product_id, material_id, quantity, fire_percentage } = body

    if (!product_id || !material_id || quantity === undefined || quantity <= 0) {
      return NextResponse.json(
        { error: 'product_id, material_id ve quantity (pozitif) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Ürün ve malzeme kontrolü
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id) as ProductRow | undefined
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const material = db.prepare('SELECT id FROM materials WHERE id = ?').get(material_id) as MaterialRow | undefined
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // Aynı ürün-malzeme kombinasyonu var mı kontrol et
    const existing = db.prepare(`
      SELECT id FROM bom 
      WHERE product_id = ? AND material_id = ?
    `).get(product_id, material_id) as BomExistingRow | undefined

    if (existing) {
      // Mevcut kaydı güncelle
      db.prepare(`
        UPDATE bom
        SET quantity_required = ?,
            fire_percentage = COALESCE(?, fire_percentage),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(quantity, fire_percentage || 0, existing.id)

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
        (id, product_id, material_id, quantity_required, fire_percentage)
        VALUES (?, ?, ?, ?, ?)
      `).run(bomId, product_id, material_id, quantity, fire_percentage || 0)

      return NextResponse.json({
        success: true,
        message: 'BOM kaydı oluşturuldu',
        id: bomId,
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: BOM kaydını sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bomId = searchParams.get('id')

    if (!bomId) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    db.prepare('DELETE FROM bom WHERE id = ?').run(bomId)

    return NextResponse.json({ success: true, message: 'BOM kaydı silindi' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
