import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { financeService } from '@/lib/services/finance-service'
import { format, subMonths } from 'date-fns'

export const GET = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || format(subMonths(new Date(), 1), 'yyyy-MM-dd')
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd')

    try {
      const incomeStatement = await financeService.getIncomeStatement(
        companyId, 
        branchId, 
        startDate,
        endDate
      )
      
      return ok(incomeStatement)
    } catch (error: any) {
      return fail(error.message, { status: 500 })
    }
  })
})