import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Stok giriş/çıkış işlemi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { material_id, quantity, movement_type, notes } = body

    if (!material_id || quantity === undefined) {
      return NextResponse.json(
        { error: 'Malzeme ve miktar gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Malzeme bilgisini al
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(material_id) as any
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    // Yeni stok miktarını hesapla
    const newStock = material.stock_amount + quantity

    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Stok miktarı negatif olamaz' },
        { status: 400 }
      )
    }

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
      (id, material_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (?, ?, ?, ?, 'manual', ?, ?)
    `).run(
      movementId,
      material_id,
      movement_type || (quantity > 0 ? 'in' : 'out'),
      Math.abs(quantity),
      null,
      notes || `Mobil stok ${quantity > 0 ? 'girişi' : 'çıkışı'}`
    )

    return NextResponse.json({
      success: true,
      message: 'Stok güncellendi',
      new_stock: newStock,
      material: {
        ...material,
        stock_amount: newStock,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


