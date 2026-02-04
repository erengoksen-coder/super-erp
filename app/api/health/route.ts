import { NextRequest } from 'next/server'
import { createSuccessResponse } from '@/lib/utils/errors'

// Simple health check without dependencies
export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current'
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Mock health checks
    const healthChecks = {
      database: 'healthy',
      api: 'healthy',
      performance: 'healthy',
      multiTenant: { healthy: true },
      workflows: 'healthy'
    }

    const overallHealth = Object.values(healthChecks).every(status => 
      typeof status === 'string' ? status === 'healthy' : status.healthy
    )

    return new Response(
      JSON.stringify({
        period,
        startDate,
        endDate,
        checks: healthChecks,
        overallHealth,
        recommendations: overallHealth ? [] : ['Some checks failed']
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
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}