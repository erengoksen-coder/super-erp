import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { materialsRepo } from '@/lib/repositories/materials'
import { getDatabase } from '@/lib/database/db'
import { materialSchemas, validateRequest } from '@/lib/validation/schemas'

// GET: Tüm hammaddeleri getir
export const GET = withAuth(async () => {
  try {
    const materials = materialsRepo.getAll()
    return ok(materials, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Yeni hammadde ekle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: unknown
    try {
      body = await parseJsonBody(request)
    } catch {
      return fail('Geçersiz JSON', { status: 400 })
    }
    
    const validation = validateRequest(materialSchemas.create, body)
    if (!validation.success) {
      return fail(validation.error, { status: 400 })
    }
    
    const db = getDatabase()
    const id = randomUUID()
    const { name, unit, min_stock = 0, category, code, unit_cost = 0 } = validation.data

    // Kod oluştur (eşer verilmemişse)
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
        stock_amount: min_stock || 0,
        min_stock_level: min_stock,
        unit_price: unit_cost,
      })

      if (unit_cost > 0) {
        const priceId = randomUUID()
        db.prepare(`
          INSERT INTO material_prices (id, material_id, price, price_type, source_type, source_id)
          VALUES (?, ?, ?, 'purchase', 'material_create', ?)
        `).run(priceId, id, unit_cost, id)
      }

      // Eşer başlangıç stoku varsa, stok hareketi kaydı oluştur
      if (min_stock > 0) {
        const movementId = randomUUID()
        db.prepare(`
          INSERT INTO stock_movements 
          (id, material_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, created_at)
          VALUES (?, ?, 'in', ?, 'initial', NULL, NULL, NULL, ?, CURRENT_TIMESTAMP)
        `).run(
          movementId,
          id,
          min_stock,
          `Başlangıç stoku - ${new Date().toLocaleString('tr-TR')}`
        )
      }
    })()

    const responseData = { ...validation.data, id, code: materialCode }
    return ok(responseData, { status: 201 })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})


