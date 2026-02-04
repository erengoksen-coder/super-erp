import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { advancedFinancialReportingService } from '@/lib/financial/advancedReporting'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'

// GET: Budget Variance Analysis
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    
    if (!companyId || !startDate || !endDate) {
      throw createError.validation('Company ID, start date, and end date are required')
    }

    const variance = await advancedFinancialReportingService.analyzeBudgetVariance(
      companyId,
      startDate,
      endDate
    )
    
    return createSuccessResponse(variance, 'Budget variance analysis completed successfully')
  } catch (error) {
    throw error
  }
})

// POST: Analyze Custom Budget Variance
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { companyId, startDate, endDate } = body
    
    if (!companyId || !startDate || !endDate) {
      throw createError.validation('Company ID, start date, and end date are required')
    }

    const variance = await advancedFinancialReportingService.analyzeBudgetVariance(
      companyId,
      startDate,
      endDate
    )
    
    return createSuccessResponse(variance, 'Custom budget variance analysis completed successfully')
  } catch (error) {
    throw error
  }
})
