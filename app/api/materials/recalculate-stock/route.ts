import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { inventoryService } from '@/lib/services/inventory-service'

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    
    try {
      const result = await inventoryService.recalculateAllStocks(companyId, branchId)
      return ok({
        ...result,
        message: 'Tüm stok miktarları hareket geçmişinden (stock_movements) başarıyla yeniden hesaplandı.'
      })
    } catch (error: any) {
      return fail(error.message, { status: 500 })
    }
  })
})
