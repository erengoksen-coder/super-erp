import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { advancedFinancialReportingService } from '@/lib/financial/advancedReporting'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'

// GET: Financial Trends Analysis
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId') || 'demo-company-001'
    const periods = parseInt(searchParams.get('periods') || '12')

    // Mock trends data for demo
    const mockTrends = Array.from({ length: periods }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (periods - 1 - i))
      
      return {
        period: date.toISOString().split('T')[0],
        revenue: 100000 + Math.random() * 50000,
        expenses: 70000 + Math.random() * 30000,
        profit: 25000 + Math.random() * 20000,
        assets: 500000 + Math.random() * 100000,
        liabilities: 150000 + Math.random() * 50000,
        equity: 350000 + Math.random() * 50000,
        cashFlow: 20000 + Math.random() * 15000
      }
    })

    const trends = companyId === 'demo-company-001' ? mockTrends : 
      await advancedFinancialReportingService.generateFinancialTrends(companyId, periods)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: trends,
        message: 'Financial trends generated successfully',
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
})

// POST: Generate Custom Financial Trends
export const POST = withRouteHandler(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { companyId, periods, startDate, endDate } = body
    
    if (!companyId) {
      throw createError.validation('Company ID is required')
    }

    const trends = await advancedFinancialReportingService.generateFinancialTrends(
      companyId,
      periods || 12
    )
    
    return createSuccessResponse(trends, 'Custom financial trends generated successfully')
  } catch (error) {
    throw error
  }
})
