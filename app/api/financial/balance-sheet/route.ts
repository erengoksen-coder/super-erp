import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { financialReportingService } from '@/lib/financial/reporting'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'
import type { BalanceSheet, IncomeStatement, CashFlowStatement, TrialBalance, SalesReport } from '@/types/financial'

// GET: Balance Sheet Report
export const GET = withRouteHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    const balanceSheet = await financialReportingService.getBalanceSheet(period, startDate, endDate)
    
    return createSuccessResponse(balanceSheet)
  } catch (error) {
    throw error
  }
})

// POST: Generate Balance Sheet for custom period
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { period, startDate, endDate } = body

    if (!period || !startDate || !endDate) {
      throw createError.validation('Period, start date, and end date are required')
    }

    const balanceSheet = await financialReportingService.getBalanceSheet(period, startDate, endDate)
    
    return createSuccessResponse(balanceSheet, 'Balance sheet generated successfully')
  } catch (error) {
    throw error
  }
})
