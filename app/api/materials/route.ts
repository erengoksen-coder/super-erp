import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { materialsRepo } from '@/lib/repositories/materials'

type MaterialInput = {
  name: string
  unit: string
  stock_amount?: number
  min_stock_level?: number
  category?: string | null
  code?: string | null
  unit_price?: number
}

// GET: Tüm hammaddeleri getir
export async function GET() {
  try {
    const materials = materialsRepo.getAll()
    return ok(materials, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

// POST: Yeni hammadde ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MaterialInput
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
      materialsRepo.insert({
        id,
        code: materialCode,
        name,
        category: category || null,
        unit,
        stock_amount,
        min_stock_level,
        unit_price,
      })

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

    return ok({ id, code: materialCode, ...body }, { status: 201 })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

