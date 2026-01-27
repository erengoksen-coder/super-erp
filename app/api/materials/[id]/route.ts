import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { materialsRepo } from '@/lib/repositories/materials'

type MaterialRow = {
  id: string
  stock_amount: number | null
  min_stock_level: number | null
  name: string
  code: string | null
  unit: string
  category: string | null
  unit_price: number | null
}

type CountRow = {
  count: number | null
}

type MaterialUpdateInput = {
  stock_amount?: number
  min_stock_level?: number
  name?: string
  code?: string
  unit?: string
  category?: string | null
  unit_price?: number
  user_id?: string | null
}

// GET: Tek bir malzeme bilgisini getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()
    const material = materialsRepo.getById(resolvedParams.id)

    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    return ok(material)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

// PATCH: Malzeme bilgilerini güncelle (stok miktarı dahil)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const body = await request.json() as MaterialUpdateInput
    const { stock_amount, min_stock_level, name, code, unit, category, unit_price } = body

    const db = getDatabase()

    // Malzemeyi bul
    const material = materialsRepo.getById(resolvedParams.id)
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // Güncelleme sorgusu oluştur
    let updateQuery = 'UPDATE materials SET updated_at = CURRENT_TIMESTAMP'
    const updateParams: Array<string | number | null> = []

    if (stock_amount !== undefined) {
      // Eski stok miktarını al
      const oldStockAmount = material.stock_amount || 0
      const newStockAmount = stock_amount
      const difference = newStockAmount - oldStockAmount
      
      updateQuery += ', stock_amount = ?'
      updateParams.push(stock_amount)
      
      // Eğer stok miktarı değiştiyse, stock_movements tablosuna bir "adjustment" hareketi ekle
      if (difference !== 0) {
        const movementId = randomUUID()
        
        // Stock movements tablosuna düzeltme hareketi ekle
        try {
          // Request body'den user_id al
          const { user_id } = body
          
          db.prepare(`
            INSERT INTO stock_movements 
            (id, material_id, movement_type, quantity, reference_type, notes, user_id, created_at)
            VALUES (?, ?, ?, ?, 'adjustment', ?, ?, CURRENT_TIMESTAMP)
          `).run(
            movementId,
            resolvedParams.id,
            difference > 0 ? 'in' : 'out',
            Math.abs(difference),
            `Manuel stok düzeltmesi: ${oldStockAmount} → ${newStockAmount}`,
            user_id || null
          )
        } catch (movementError: unknown) {
          // Eğer stock_movements tablosu yoksa veya hata varsa, sadece logla
          console.error('Stock movement kaydı eklenirken hata:', movementError)
        }
      }
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

    // Güncellenmiş malzeme bilgisini döndür
    const updatedMaterial = materialsRepo.getById(resolvedParams.id)

    return ok(
      { material: updatedMaterial },
      { message: 'Malzeme başarıyla güncellendi' }
    )
  } catch (error: any) {
    return fail(error.message, { status: 500 })
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
    const material = materialsRepo.getById(resolvedParams.id)
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // İlişkili kayıtları kontrol et
    const bomCount = db.prepare('SELECT COUNT(*) as count FROM bom WHERE material_id = ?').get(resolvedParams.id) as CountRow | undefined
    const movementCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE material_id = ?').get(resolvedParams.id) as CountRow | undefined

    if ((bomCount?.count || 0) > 0 || (movementCount?.count || 0) > 0) {
      return fail('Bu malzeme BOM veya stok hareketi kayıtlarında kullanılıyor. Silinemez.', {
        status: 400,
        details: {
          bom_count: bomCount?.count || 0,
          movement_count: movementCount?.count || 0,
        },
      })
    }

    // Malzemeyi sil
    db.prepare('DELETE FROM materials WHERE id = ?').run(resolvedParams.id)

    return ok(null, { message: 'Malzeme başarıyla silindi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}
