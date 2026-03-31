import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { inventoryService } from '@/lib/services/inventory-service'
import { materialSchema } from '@/lib/validation/inventory-schema'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Tek bir malzeme bilgisini getir
export const GET = withAuth(async (request, _user, context) => {
  return handleApi(async () => {
    const params = await Promise.resolve((context as any)?.params)
    const id = params?.id
    
    if (!id) return fail('ID gereklidir', { status: 400 })
    
    const db = getDatabase()
    const material = db.prepare('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL').get(id)
    
    if (!material) return fail('Malzeme bulunamadı', { status: 404 })
    
    return ok(material)
  })
})

// PATCH: Malzeme bilgilerini güncelle
export const PATCH = withAuth(async (request, authUser, context) => {
  return handleApi(async () => {
    const params = await Promise.resolve((context as any)?.params)
    const id = params?.id
    if (!id) return fail('ID gereklidir', { status: 400 })
    
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod doğrulaması (Güncelleme için bazı alanlar opsiyonel olabilir, şimdilik partial kullanıyoruz)
    const validation = materialSchema.partial().safeParse(body)
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }

    const { stock_amount, ...updateData } = validation.data
    const db = getDatabase()
    
    db.transaction(() => {
      // 1. Temel bilgileri güncelle
      const sets = Object.entries(updateData)
        .filter(([_, v]) => v !== undefined)
        .map(([k, _]) => `${k} = ?`)
        .join(', ')
      
      if (sets) {
        const values = Object.entries(updateData)
          .filter(([_, v]) => v !== undefined)
          .map(([_, v]) => v)
        db.prepare(`UPDATE materials SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, id)
      }

      // 2. Eğer stok miktarı manuel girildiyse (Adjustment)
      if (stock_amount !== undefined) {
        const material = db.prepare('SELECT stock_amount FROM materials WHERE id = ?').get(id) as { stock_amount: number }
        const diff = stock_amount - (material.stock_amount || 0)
        
        if (diff !== 0) {
          inventoryService.processStockIn({
            material_id: id,
            quantity: Math.abs(diff),
            movement_type: diff > 0 ? 'in' : 'out',
            notes: `Manuel Düzeltme: ${material.stock_amount} -> ${stock_amount}`
          }, companyId, branchId, userId)
        }
      }
    })()

    const updated = db.prepare('SELECT * FROM materials WHERE id = ?').get(id)
    return ok(updated, { message: 'Malzeme başarıyla güncellendi' })
  })
})

// DELETE: Malzemeyi sil (Soft delete)
export const DELETE = withAuth(async (request, authUser, context) => {
  return handleApi(async () => {
    const params = await Promise.resolve((context as any)?.params)
    const id = params?.id
    if (!id) return fail('ID gereklidir', { status: 400 })
    
    const db = getDatabase()
    
    // Kontrol: BOM veya Stok Hareketlerinde kullanılıyor mu?
    const moves = db.prepare('SELECT COUNT(*) as count FROM stock_movements WHERE material_id = ? AND deleted_at IS NULL').get(id) as { count: number }
    if (moves.count > 0 && authUser.role !== 'admin') {
      return fail('Stok hareketi olan malzeme silinemez. Önce hareketleri temizlemelisiniz.', { status: 400 })
    }

    db.prepare('UPDATE materials SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return ok(null, { message: 'Malzeme başarıyla silindi' })
  })
})
