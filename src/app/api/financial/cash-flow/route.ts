import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { financialReportingService } from '@/lib/financial/reporting'
import { createSuccessResponse, withRouteHandler } from '@/lib/utils/errors'

// GET: Cash Flow Statement
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    const cashFlow = await financialReportingService.getCashFlowStatement(period, startDate, endDate)
    
    return createSuccessResponse(cashFlow)
  } catch (error) {
    throw error
  }
})