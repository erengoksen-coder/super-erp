import { NextRequest, NextResponse } from 'next/server'
import { financialReportingService } from '@/lib/financial/reporting'
import { createSuccessResponse, withRouteHandler } from '@/lib/utils/errors'

// GET: Income Statement
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    const incomeStatement = await financialReportingService.getIncomeStatement(period, startDate, endDate)
    
    return createSuccessResponse(incomeStatement)
  } catch (error) {
    throw error
  }
})