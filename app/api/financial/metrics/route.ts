import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { advancedFinancialReportingService } from '@/lib/financial/advancedReporting'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'

// GET: Financial Metrics Dashboard
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || 'demo-company-001'
    const startDate = searchParams.get('startDate') || '2026-01-01'
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // For demo purposes, return mock metrics if no company service available
    const mockMetrics = {
      liquidityRatios: {
        currentRatio: 2.5,
        quickRatio: 1.8,
        cashRatio: 1.2,
        operatingCashFlowRatio: 1.5
      },
      profitabilityRatios: {
        grossProfitMargin: 45.2,
        operatingProfitMargin: 23.8,
        netProfitMargin: 18.5,
        returnOnAssets: 15.3,
        returnOnEquity: 22.1,
        returnOnInvestment: 18.9
      },
      efficiencyRatios: {
        assetTurnover: 1.8,
        inventoryTurnover: 6.2,
        receivablesTurnover: 8.4,
        payablesTurnover: 4.3,
        workingCapitalTurnover: 3.7
      },
      solvencyRatios: {
        debtToEquity: 0.8,
        debtToAssets: 0.35,
        interestCoverage: 3.2,
        longTermDebtToEquity: 0.5
      },
      marketRatios: {
        earningsPerShare: 12.5,
        priceToEarnings: 15.2,
        dividendYield: 3.8,
        bookValuePerShare: 45.6
      }
    }

    const metrics = companyId === 'demo-company-001' ? mockMetrics : 
      await advancedFinancialReportingService.calculateFinancialMetrics(companyId, startDate, endDate)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: metrics,
        message: 'Financial metrics retrieved successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}

// POST: Calculate Custom Financial Metrics
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { companyId, startDate, endDate } = body
    
    if (!companyId || !startDate || !endDate) {
      throw createError.validation('Company ID, start date, and end date are required')
    }

    const metrics = await advancedFinancialReportingService.calculateFinancialMetrics(
      companyId,
      startDate,
      endDate
    )
    
    return createSuccessResponse(metrics, 'Custom financial metrics generated successfully')
  } catch (error) {
    throw error
  }
})
