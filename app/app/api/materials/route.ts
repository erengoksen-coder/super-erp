import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Tüm hammaddeleri getir
export async function GET() {
  try {
    const db = getDatabase()
    const materials = db.prepare('SELECT * FROM materials ORDER BY name').all()
    return NextResponse.json(materials)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni hammadde ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDatabase()
    
    const id = randomUUID()
    const { name, unit, stock_amount = 0, min_stock_level = 0, category, code, unit_price = 0 } = body

    // Kod oluştur (eğer verilmemişse)
    let materialCode = code
    if (!materialCode) {
      const { generateMaterialCode } = await import('@/lib/utils/codeGenerator')
      materialCode = await generateMaterialCode()
    }

    db.transaction(() => {
      // Malzemeyi ekle
      db.prepare(`
        INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, unit_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, materialCode, name, category || null, unit, stock_amount, min_stock_level, unit_price)

      // Eğer başlangıç stoku varsa, stok hareketi kaydı oluştur
      if (stock_amount > 0) {
        const movementId = randomUUID()
        db.prepare(`
          INSERT INTO stock_movements 
          (id, material_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, created_at)
          VALUES (?, ?, 'in', ?, 'initial', NULL, NULL, NULL, ?, CURRENT_TIMESTAMP)
        `).run(
          movementId,
          id,
          stock_amount,
          `Başlangıç stoku - ${new Date().toLocaleString('tr-TR')}`
        )
      }
    })()

    return NextResponse.json({ id, code: materialCode, ...body }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

