import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { inventoryService } from '@/lib/services/inventory-service'
import { parseJsonBody } from '@/lib/api/validate'

// POST: Toplu malzeme güncelleme / içe aktarma
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    if (!Array.isArray(body.items)) {
      return fail('Geçersiz veri formatı. "items" dizisi gereklidir.', { status: 400 })
    }

    const result = await inventoryService.bulkUpdateMaterials(body.items, companyId, branchId, userId)
    
    return ok(result, { message: `${result.updatedCount} kalem malzeme güncellendi/eklendi.` })
  })
})
