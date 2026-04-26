import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { calculateRequirements } from '@/lib/mrp'

export const GET = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    
    if (!companyId || !branchId) {
      return fail('Company or Branch not found in context', { status: 400 })
    }

    try {
      const requirements = await calculateRequirements(companyId, branchId)
      return ok({
        calculation_date: new Date().toISOString(),
        company_id: companyId,
        branch_id: branchId,
        total_items: requirements.length,
        items_with_shortage: requirements.filter(r => r.shortage_qty > 0).length,
        requirements
      })
    } catch (error: any) {
      console.error('MRP Calculation Error:', error)
      return fail(error.message || 'MRP Calculation failed', { status: 500 })
    }
  })
})
