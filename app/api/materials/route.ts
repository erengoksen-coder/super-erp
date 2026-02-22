import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { apiLogger } from '@/lib/api/logger'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { materialsRepo, generateNextKmsCode } from '@/lib/repositories/materials'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID } from '@/lib/database/db'
import { materialSchemas, validateRequest } from '@/lib/validation/schemas'

/** Sadece tabloda hiç malzeme yokken (ilk kurulum) varsayılan kumaş oluştur. Kullanıcı tümünü sildiyse yeniden oluşturma. */
function ensureDefaultFabric(): void {
  const db = getDatabase()
  const anyMaterial = db.prepare('SELECT 1 FROM materials LIMIT 1').get()
  if (anyMaterial) return
  try {
    const id = `mat-default-fabric-${Date.now()}`
    const code = 'KMS-001'
    const name = 'Kumaş Varsayılan'
    db.prepare(`
      INSERT INTO materials (id, code, name, category, unit, stock_amount, min_stock_level, purchase_price, company_id, branch_id, created_at, updated_at)
      VALUES (?, ?, ?, 'Kumaş', 'metre', 0, 0, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, code, name, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    db.prepare(`
      INSERT OR IGNORE INTO material_stocks (id, material_id, warehouse_id, quantity, created_at, updated_at)
      VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(`mstock-${id}`, id, DEFAULT_WAREHOUSE_ID)
  } catch (e: any) {
    if (!e.message?.includes('UNIQUE')) console.error('Varsayılan kumaş oluşturulamadı:', e?.message)
  }
}

// GET: Tüm hammaddeleri getir (giriş yapmış herkes listeleyebilir; alış faturası ve stok sayfaları için)
export const GET = withAuth(async () => {
  try {
    ensureDefaultFabric()
    const materials = materialsRepo.getAll()
    return ok(materials, { headers: CACHE_HEADERS_SHORT })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Materials API GET failed'
    apiLogger.error('Materials API GET failed', { message })
    return fail(message, { status: 500 })
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
    const { name, unit, min_stock = 0, initial_stock, category, code, unit_cost = 0 } = validation.data

    // Kod oluştur (verilmemişse): sıralı KMS-001, KMS-002, ...
    let materialCode = code && code.trim() ? code.trim() : null
    if (!materialCode) {
      materialCode = generateNextKmsCode(db)
    }

    const startStock = Number(initial_stock) || 0
    const minLevel = Number(min_stock) || 0

    db.transaction(() => {
      materialsRepo.insert({
        id,
        code: materialCode,
        name,
        category: category || null,
        unit,
        stock_amount: startStock,
        min_stock_level: minLevel,
        unit_price: unit_cost,
      })

      if (unit_cost > 0) {
        const priceId = randomUUID()
        db.prepare(`
          INSERT INTO material_prices (id, material_id, price, price_type, source_type, source_id)
          VALUES (?, ?, ?, 'purchase', 'material_create', ?)
        `).run(priceId, id, unit_cost, id)
      }

      // Başlangıç stoku varsa depo hareketi oluştur (kumaş listesinin depoya kaydı)
      if (startStock > 0) {
        const movementId = randomUUID()
        db.prepare(`
          INSERT INTO stock_movements 
          (id, material_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, created_at)
          VALUES (?, ?, 'in', ?, 'initial', NULL, NULL, NULL, ?, CURRENT_TIMESTAMP)
        `).run(
          movementId,
          id,
          startStock,
          `Başlangıç stoku - ${new Date().toLocaleString('tr-TR')}`
        )
      }
    })()

    const responseData = { ...validation.data, id, code: materialCode }
    return ok(responseData, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Materials API POST failed'
    apiLogger.error('Materials API POST failed', { message })
    return fail(message, { status: 500 })
  }
})

// DELETE: Tüm malzemeleri sil (all=1, sadece admin)
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')
    if (all !== '1' && all !== 'true') {
      return fail('Tümünü silmek için ?all=1 gerekli', { status: 400 })
    }
    const db = getDatabase()
    const result = db.prepare('UPDATE materials SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL').run()
    return ok({ deleted_count: result.changes }, { message: `${result.changes} malzeme silindi` })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Silinemedi'
    apiLogger.error('Materials API DELETE failed', { message })
    return fail(message, { status: 500 })
  }
}, ['admin'])

