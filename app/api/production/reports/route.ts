import { NextRequest } from 'next/server'
import { withAuthAndPermission } from '@/lib/api/withAuth'
import { productionReportingService } from '@/lib/production/productionReporting'
import { ok, fail } from '@/lib/api/response'

export const GET = withAuthAndPermission(async (request: NextRequest) => {
    try {
        const { searchParams } = new URL(request.url)
        const reportType = searchParams.get('type') || 'summary'
        const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

        let data: any

        switch (reportType) {
            case 'summary':
                data = productionReportingService.getCostSummary(startDate, endDate)
                break
            case 'efficiency':
                data = productionReportingService.getStationEfficiency()
                break
            case 'delays':
                data = productionReportingService.getDelayAnalysis()
                break
            case 'profitability':
                data = productionReportingService.getProductProfitability()
                break
            case 'scrap':
                data = productionReportingService.getScrapAnalysis()
                break
            case 'trends':
                data = productionReportingService.getMonthlyTrends()
                break
            case 'usage':
                data = productionReportingService.getMaterialUsageTrend()
                break
            case 'operators':
                data = productionReportingService.getOperatorPerformance()
                break
            case 'forecast':
                data = productionReportingService.getProductionForecast()
                break
            case 'requirements':
                data = productionReportingService.getMaterialRequirements()
                break
            case 'shipment':
                data = productionReportingService.getShipmentReadiness()
                break
            case 'recent_shipments':
                data = productionReportingService.getRecentShipments()
                break
            default:
                return fail('Geçersiz rapor türü', { status: 400 })
        }

        return ok(data)
    } catch (error: any) {
        return fail(error.message || 'Rapor oluşturulamadı', { status: 500 })
    }
}, '/production/reports', 'view')
