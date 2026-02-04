import { NextRequest, NextResponse } from 'next/server'
import { financialReportingService } from '@/lib/financial/reporting'
import { createSuccessResponse, withRouteHandler } from '@/lib/utils/errors'

// GET: Trial Balance
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    const trialBalance = await financialReportingService.getTrialBalance(period, endDate)
    
    return createSuccessResponse(trialBalance)
  } catch (error) {
    throw error
  }
})