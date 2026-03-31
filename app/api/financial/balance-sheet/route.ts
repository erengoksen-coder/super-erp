import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { financeService } from '@/lib/services/finance-service'
import { format } from 'date-fns'

export const GET = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const { searchParams } = new URL(request.url)
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd')

    try {
      const balanceSheet = await financeService.getBalanceSheet(
        companyId, 
        branchId, 
        endDate
      )
      
      return ok(balanceSheet)
    } catch (error: any) {
      return fail(error.message, { status: 500 })
    }
  })
})
