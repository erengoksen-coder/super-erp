import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Hammadde stok çıkışı
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { material_id, quantity, notes, user_id } = body

    if (!material_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Malzeme ve miktar (pozitif değer) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Mevcut malzeme bilgisini al
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(material_id) as any
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // Mevcut stok miktarını al
    const currentStock = material.stock_amount || 0
    
    // Yeni stok miktarını hesapla
    const newStock = currentStock - quantity

    // Negatif stoka izin ver (kullanıcı uyarısı için)
    // if (newStock < 0) {
    //   return NextResponse.json(
    //     { error: `Stok yetersiz. Mevcut: ${currentStock}, İstenen: ${quantity}` },
    //     { status: 400 }
    //   )
    // }

    db.transaction(() => {
      // Stoku güncelle
      db.prepare(`
        UPDATE materials
        SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, material_id)

      // Stok hareketi kaydı oluştur
      const movementId = randomUUID()
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, reference_id, notes, user_id, created_at)
        VALUES (?, ?, 'out', ?, 'manual', NULL, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        material_id,
        quantity,
        notes || `Manuel stok çıkışı - ${new Date().toLocaleString('tr-TR')}`,
        user_id || null
      )
    })()

    // Güncel malzeme bilgisini al
    const updatedMaterial = db.prepare('SELECT * FROM materials WHERE id = ?').get(material_id)

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      previous_stock: currentStock,
      new_stock: newStock,
      message: 'Stok çıkışı başarıyla yapıldı',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


