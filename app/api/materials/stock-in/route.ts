import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { inventoryService } from '@/lib/services/inventory-service'
import { stockMovementSchema } from '@/lib/validation/inventory-schema'
import { parseJsonBody } from '@/lib/api/validate'

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Basit bir zorunlu alan kontrolü (Zod schema in/out için farklılık gösterebilir)
    if (!body.material_id || !body.quantity) {
      return fail('Malzeme ve miktar gereklidir', { status: 400 })
    }

    try {
      const result = await inventoryService.processStockIn(
        { ...body, movement_type: 'in' },
        companyId,
        branchId,
        userId
      )
      
      return ok(result, { message: 'Stok girişi başarıyla yapıldı' })
    } catch (error: any) {
      return fail(error.message, { status: 500 })
    }
  })
})
