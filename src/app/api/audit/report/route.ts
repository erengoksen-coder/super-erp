import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { AuditService } from '@/lib/services/audit'

/**
 * Rapor Dışa Aktarma Denetim Logu API
 * İstemci taraflı export butonlarından çağrılır.
 */
export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { userId, companyId, branchId } = authUser
    const body = await request.json()
    const { reportName, format, filter } = body

    if (!reportName) return fail('Rapor adı belirtilmelidir.')

    await AuditService.log({
      userId,
      companyId,
      branchId,
      actionType: 'EXPORT',
      entityName: 'financial_report',
      entityId: reportName,
      description: `${reportName} raporu dışa aktarıldı (Format: ${format || 'UNKNOWN'})`,
      newData: { reportName, format, filter },
      userAgent: request.headers.get('user-agent') || undefined
    })

    return ok({ success: true })
  })
})
