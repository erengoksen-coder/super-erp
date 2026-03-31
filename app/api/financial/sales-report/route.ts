import { NextRequest, NextResponse } from 'next/server'
import { financialReportingService } from '@/lib/financial/reporting'
import { createSuccessResponse, withRouteHandler } from '@/lib/utils/errors'

// GET: Sales Report
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    const salesReport = await financialReportingService.getSalesReport(period, startDate, endDate)
    
    return createSuccessResponse(salesReport)
  } catch (error) {
    throw error
  }
})