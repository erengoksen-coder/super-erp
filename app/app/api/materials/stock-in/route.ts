import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Hammadde stok girişi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { material_id, quantity, invoice_number, shipment_number } = body

    if (!material_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'material_id ve quantity (pozitif) gerekli' },
        { status: 400 }
      )
    }

    // Fatura no veya sevk no zorunlu
    if (!invoice_number?.trim() && !shipment_number?.trim()) {
      return NextResponse.json(
        { error: 'Fatura No veya Sevk No gerekli (en az biri zorunludur)' },
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
    const newStock = currentStock + quantity

    db.transaction(() => {
      // Stoku güncelle
      db.prepare(`
        UPDATE materials
        SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, material_id)

      // Stok hareketi kaydı oluştur
      const movementId = randomUUID()
      const invoiceNum = invoice_number?.trim() || null
      const shipmentNum = shipment_number?.trim() || null
      
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, created_at)
        VALUES (?, ?, 'in', ?, 'manual', NULL, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        material_id,
        quantity,
        invoiceNum,
        shipmentNum,
        `Manuel stok girişi - ${new Date().toLocaleString('tr-TR')}`
      )
    })()

    // Güncel malzeme bilgisini al
    const updatedMaterial = db.prepare('SELECT * FROM materials WHERE id = ?').get(material_id)

    return NextResponse.json({
      success: true,
      material: updatedMaterial,
      previous_stock: currentStock,
      new_stock: newStock,
      message: 'Stok girişi başarıyla yapıldı',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
