import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (_request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const db = getDatabase()

    // 1. İstasyon (Operation) Bazlı Verimlilik
    // Planlanan vs Gerçekleşen süreleri topla
    const efficiencyData = db.prepare(`
      SELECT 
        o.name as operation_name,
        SUM(poo.planned_duration_minutes) as total_planned,
        SUM(poo.actual_duration_minutes) as total_actual,
        COUNT(poo.id) as op_count
      FROM production_order_operations poo
      JOIN operations o ON poo.operation_id = o.id
      WHERE poo.company_id = ? AND poo.branch_id = ?
        AND poo.status = 'completed'
        AND poo.actual_duration_minutes > 0
      GROUP BY o.id
    `).all(companyId, branchId) as any[]

    const formattedEfficiency = efficiencyData.map(d => ({
      name: d.operation_name,
      planned: d.total_planned,
      actual: d.total_actual,
      efficiency: d.total_actual > 0 ? Math.round((d.total_planned / d.total_actual) * 100) : 100,
      count: d.op_count
    }))

    // 2. Personel Bazlı Verimlilik (Opsiyonel)
    const personalEfficiency = db.prepare(`
      SELECT 
        u.full_name as person_name,
        SUM(poo.planned_duration_minutes) as total_planned,
        SUM(poo.actual_duration_minutes) as total_actual
      FROM production_order_operations poo
      JOIN users u ON poo.personnel_id = u.id
      WHERE poo.company_id = ? AND poo.branch_id = ?
        AND poo.status = 'completed'
      GROUP BY u.id
      HAVING total_actual > 0
    `).all(companyId, branchId) as any[]

    const formattedPersonal = personalEfficiency.map(p => ({
      name: p.person_name,
      efficiency: Math.round((p.total_planned / p.total_actual) * 100)
    }))

    return ok({
      stations: formattedEfficiency,
      personnel: formattedPersonal,
      summary: {
        totalOperations: formattedEfficiency.length,
        avgEfficiency: formattedEfficiency.length > 0 
          ? Math.round(formattedEfficiency.reduce((acc, curr) => acc + curr.efficiency, 0) / formattedEfficiency.length) 
          : 100
      }
    })
  })
})
