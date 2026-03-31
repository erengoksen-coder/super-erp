import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { inventoryService } from '@/lib/services/inventory-service'
import { parseJsonBody } from '@/lib/api/validate'

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    if (!body.material_id || !body.quantity) {
      return fail('Malzeme ve miktar gereklidir', { status: 400 })
    }

    try {
      const result = await inventoryService.processStockOut(
        { ...body, movement_type: 'out' },
        companyId,
        branchId,
        userId
      )
      
      return ok(result, { message: 'Stok çıkışı başarıyla yapıldı' })
    } catch (error: any) {
      // "Stok yetersiz" gibi özel hataları yakalayıp 400 dönebiliriz.
      const status = error.message.includes('yetersiz') ? 400 : 500
      return fail(error.message, { status })
    }
  })
})
