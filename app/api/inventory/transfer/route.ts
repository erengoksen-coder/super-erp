import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { logAudit } from '@/lib/audit'
import { randomUUID } from 'crypto'

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { materialId, fromBranchId, toBranchId, quantity, notes } = await request.json()
    const { companyId, userId } = authUser
    const db = getDatabase()

    if (!materialId || !fromBranchId || !toBranchId || !quantity) {
      return fail('Eksik bilgi: materialId, fromBranchId, toBranchId, quantity gerekli', { status: 400 })
    }

    if (fromBranchId === toBranchId) {
      return fail('Aynı şube içinde transfer yapılamaz', { status: 400 })
    }

    // Stok kontrolü (Source branch)
    const stockIn = db.prepare(`SELECT SUM(quantity) as total FROM stock_movements WHERE material_id = ? AND branch_id = ? AND movement_type = 'in'`).get(materialId, fromBranchId) as any
    const stockOut = db.prepare(`SELECT SUM(quantity) as total FROM stock_movements WHERE material_id = ? AND branch_id = ? AND movement_type = 'out'`).get(materialId, fromBranchId) as any
    const available = (stockIn?.total || 0) - (stockOut?.total || 0)

    if (available < quantity) {
      return fail('Kaynak şubede yeterli stok yok. Mevcut: ' + available, { status: 400 })
    }

    // 1. Kaynaktan Çıkış
    const outMoveId = randomUUID()
    db.prepare(`
      INSERT INTO stock_movements (id, material_id, quantity, movement_type, branch_id, company_id, notes)
      VALUES (?, ?, ?, 'out', ?, ?, ?)
    `).run(outMoveId, materialId, quantity, fromBranchId, companyId, `Transfer Çıkış -> ${toBranchId}: ${notes || ''}`)

    // 2. Hedefe Giriş
    const inMoveId = randomUUID()
    db.prepare(`
      INSERT INTO stock_movements (id, material_id, quantity, movement_type, branch_id, company_id, notes)
      VALUES (?, ?, ?, 'in', ?, ?, ?)
    `).run(inMoveId, materialId, quantity, toBranchId, companyId, `Transfer Giriş <- ${fromBranchId}: ${notes || ''}`)

    logAudit(db, {
      tableName: 'stock_movements',
      action: 'create',
      recordId: outMoveId,
      userId,
      companyId,
      branchId: fromBranchId,
      after: { materialId, quantity, toBranchId, type: 'transfer' }
    })

    return ok({ message: 'Şubeler arası transfer başarıyla tamamlandı', outMoveId, inMoveId })
  })
})
