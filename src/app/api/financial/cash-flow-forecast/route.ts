import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { advancedFinancialReportingService } from '@/lib/financial/advancedReporting'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'

// GET: Cash Flow Forecast
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || ''
    const forecastPeriods = parseInt(searchParams.get('periods') || '6')
    
    if (!companyId) {
      throw createError.validation('Company ID is required')
    }

    const forecast = await advancedFinancialReportingService.forecastCashFlow(
      companyId,
      forecastPeriods
    )
    
    return createSuccessResponse(forecast, 'Cash flow forecast generated successfully')
  } catch (error) {
    throw error
  }
})

// POST: Generate Custom Cash Flow Forecast
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { companyId, forecastPeriods } = body
    
    if (!companyId) {
      throw createError.validation('Company ID is required')
    }

    const forecast = await advancedFinancialReportingService.forecastCashFlow(
      companyId,
      forecastPeriods || 6
    )
    
    return createSuccessResponse(forecast, 'Custom cash flow forecast generated successfully')
  } catch (error) {
    throw error
  }
})
