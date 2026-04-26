import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { productionService } from '@/lib/services/production-service'
import { bomSchema } from '@/lib/validation/production-schema'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Reçeteleri listeler
export const GET = withAuth(async (request, _user) => {
  return handleApi(async () => {
    const list = await productionService.getBOMs()
    return ok(list)
  })
})

// POST: Yeni reçete oluşturur
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod Doğrulaması
    const validation = bomSchema.safeParse(body)
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }

    const { bomId } = await productionService.createBOM(validation.data, companyId, branchId, userId)
    
    return ok({ id: bomId }, { message: 'Reçete başarıyla kaydedildi' })
  })
})

// PUT/PATCH: Reçete Güncelleme/Versiyonlama (Geçici olarak POST şemasıyla versiyon artırır)
export const PUT = withAuth(async (request, authUser) => {
    return handleApi(async () => {
      const { companyId, branchId, userId } = authUser
      const body = await parseJsonBody(request)
      
      // Zod Doğrulaması
      const validation = bomSchema.safeParse(body)
      if (!validation.success) {
        return fail(validation.error.errors[0].message, { status: 400 })
      }
      
      // Mevcut aktif versiyonları pasife al
      const db = getDatabase()
      db.prepare('UPDATE bom_versions SET is_active = 0 WHERE product_id = ?').run(validation.data.product_code)
      
      const { bomId } = await productionService.createBOM(validation.data, companyId, branchId, userId)
      
      return ok({ id: bomId }, { message: 'Reçete versiyonu güncellendi' })
    })
})
