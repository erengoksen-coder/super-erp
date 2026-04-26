import { NextRequest } from 'next/server'
import { withAuth, withAuthAndPermission } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { inventoryService } from '@/lib/services/inventory-service'
import { materialSchema } from '@/lib/validation/inventory-schema'
import { parseJsonBody } from '@/lib/api/validate'

// GET: Tüm malzemeleri getir
export const GET = withAuthAndPermission(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const materials = await inventoryService.getAllMaterials(companyId, branchId)
    return ok(materials)
  })
}, '/inventory/materials', 'view')

// POST: Yeni hammadde ekle
export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    
    const body = await parseJsonBody(request)
    const validation = materialSchema.safeParse(body)
    
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }
    
    const result = await inventoryService.createMaterial(
      validation.data, 
      companyId, 
      branchId, 
      userId
    )
    
    return ok(result, { status: 201 })
  })
})

// DELETE: Tüm malzemeleri sil (Opsiyonel, admin yetkisiyle)
export const DELETE = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')
    
    if (all !== '1' && all !== 'true') {
      return fail('Tümünü silmek için ?all=1 gerekli', { status: 400 })
    }
    
    // Not: Gerçek silme yerine soft-delete veya toplu işlem servise eklenebilir.
    // Şimdilik güvenlik gereği pasif modda bırakıldı veya sadece admin yetkisiyle çalışır.
    return fail('Toplu silme işlemi şu an için devre dışı bırakıldı.', { status: 403 })
  })
}, ['admin'])
