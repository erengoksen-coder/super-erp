import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tek bir malzeme bilgisini getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(resolvedParams.id) as any

    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(material)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Malzeme bilgilerini güncelle (stok miktarı dahil)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const body = await request.json()
    const { stock_amount, min_stock_level, name, code, unit, category, unit_price } = body

    const db = getDatabase()

    // Malzemeyi bul
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(resolvedParams.id) as any
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // Güncelleme sorgusu oluştur
    let updateQuery = 'UPDATE materials SET updated_at = CURRENT_TIMESTAMP'
    const updateParams: any[] = []

    if (stock_amount !== undefined) {
      updateQuery += ', stock_amount = ?'
      updateParams.push(stock_amount)
    }

    if (min_stock_level !== undefined) {
      updateQuery += ', min_stock_level = ?'
      updateParams.push(min_stock_level)
    }

    if (name !== undefined) {
      updateQuery += ', name = ?'
      updateParams.push(name)
    }

    if (code !== undefined) {
      updateQuery += ', code = ?'
      updateParams.push(code)
    }

    if (unit !== undefined) {
      updateQuery += ', unit = ?'
      updateParams.push(unit)
    }

    if (category !== undefined) {
      updateQuery += ', category = ?'
      updateParams.push(category)
    }

    if (unit_price !== undefined) {
      updateQuery += ', unit_price = ?'
      updateParams.push(unit_price)
    }

    updateQuery += ' WHERE id = ?'
    updateParams.push(resolvedParams.id)

    db.prepare(updateQuery).run(...updateParams)

    return NextResponse.json({
      success: true,
      message: 'Malzeme başarıyla güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Malzemeyi sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()

    // Malzemeyi bul
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(resolvedParams.id) as any
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // İlişkili kayıtları kontrol et
    const bomCount = db.prepare('SELECT COUNT(*) as count FROM bom WHERE material_id = ?').get(resolvedParams.id) as any
    const movementCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE material_id = ?').get(resolvedParams.id) as any

    if (bomCount.count > 0 || movementCount.count > 0) {
      return NextResponse.json(
        { 
          error: 'Bu malzeme BOM veya stok hareketi kayıtlarında kullanılıyor. Silinemez.',
          details: {
            bom_count: bomCount.count,
            movement_count: movementCount.count,
          }
        },
        { status: 400 }
      )
    }

    // Malzemeyi sil
    db.prepare('DELETE FROM materials WHERE id = ?').run(resolvedParams.id)

    return NextResponse.json({
      success: true,
      message: 'Malzeme başarıyla silindi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
